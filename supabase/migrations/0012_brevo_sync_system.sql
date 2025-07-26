-- Migration: Brevo contact synchronization system
-- Created: 2025-01-26
-- Purpose: Add tables for tracking Brevo contact sync, lists, jobs, and events

-- Brevo contact synchronization tracking
CREATE TABLE brevo_contacts_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brevo_contact_id INTEGER UNIQUE, -- Brevo contact ID (can be null during creation)
    email TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'outdated')),
    last_synced_at TIMESTAMPTZ,
    sync_attempts INTEGER DEFAULT 0,
    error_message TEXT,
    brevo_attributes JSONB, -- Stores the attributes sent to Brevo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brevo lists management
CREATE TABLE brevo_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brevo_list_id INTEGER UNIQUE NOT NULL, -- Brevo list ID
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'dynamic')),
    criteria JSONB, -- JSON criteria for dynamic lists
    contact_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact list memberships
CREATE TABLE brevo_contact_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_sync_id UUID NOT NULL REFERENCES brevo_contacts_sync(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES brevo_lists(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact_sync_id, list_id)
);

-- Synchronization jobs tracking
CREATE TABLE brevo_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL CHECK (job_type IN ('import_single', 'import_batch', 'update_contact', 'delete_contact', 'sync_lists', 'full_sync')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_items INTEGER,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    data JSONB, -- Job-specific data (user_ids, filters, etc.)
    error_details JSONB, -- Detailed error information
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact events tracking
CREATE TABLE brevo_contact_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- created, updated, added_to_list, removed_from_list, etc.
    event_data JSONB NOT NULL,
    source TEXT DEFAULT 'letterapp', -- letterapp, brevo_webhook
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brevo API configuration and rate limiting
CREATE TABLE brevo_api_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting tracking
CREATE TABLE brevo_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    requests_made INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    last_request_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_brevo_contacts_sync_user_id ON brevo_contacts_sync(user_id);
CREATE INDEX idx_brevo_contacts_sync_email ON brevo_contacts_sync(email);
CREATE INDEX idx_brevo_contacts_sync_status ON brevo_contacts_sync(sync_status);
CREATE INDEX idx_brevo_contacts_sync_brevo_id ON brevo_contacts_sync(brevo_contact_id);
CREATE INDEX idx_brevo_sync_jobs_status ON brevo_sync_jobs(status);
CREATE INDEX idx_brevo_sync_jobs_type ON brevo_sync_jobs(job_type);
CREATE INDEX idx_brevo_contact_events_user_id ON brevo_contact_events(user_id);
CREATE INDEX idx_brevo_contact_events_processed ON brevo_contact_events(processed);
CREATE INDEX idx_brevo_contact_events_created_at ON brevo_contact_events(created_at);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brevo_contacts_sync_updated_at BEFORE UPDATE ON brevo_contacts_sync FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brevo_lists_updated_at BEFORE UPDATE ON brevo_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brevo_sync_jobs_updated_at BEFORE UPDATE ON brevo_sync_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE brevo_contacts_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE brevo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE brevo_contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE brevo_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brevo_contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE brevo_api_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE brevo_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only access their own contact sync records
CREATE POLICY "Users can view their own contact sync" ON brevo_contacts_sync
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own contact sync" ON brevo_contacts_sync
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own contact sync" ON brevo_contacts_sync
    FOR UPDATE USING (user_id = auth.uid());

-- Users can view all lists (public information)
CREATE POLICY "Users can view all lists" ON brevo_lists
    FOR SELECT TO authenticated USING (true);

-- Only admin/service accounts can manage lists
CREATE POLICY "Service accounts can manage lists" ON brevo_lists
    FOR ALL USING (current_user = 'service_role');

-- Users can view their contact list memberships
CREATE POLICY "Users can view their contact list memberships" ON brevo_contact_lists
    FOR SELECT USING (
        contact_sync_id IN (
            SELECT id FROM brevo_contacts_sync WHERE user_id = auth.uid()
        )
    );

-- Users can view their own events
CREATE POLICY "Users can view their own events" ON brevo_contact_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own events" ON brevo_contact_events
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Only service accounts can access API config and rate limits
CREATE POLICY "Service accounts can access API config" ON brevo_api_config
    FOR ALL USING (current_user = 'service_role');

CREATE POLICY "Service accounts can access rate limits" ON brevo_rate_limits
    FOR ALL USING (current_user = 'service_role');

-- Only service accounts can manage sync jobs
CREATE POLICY "Service accounts can manage sync jobs" ON brevo_sync_jobs
    FOR ALL USING (current_user = 'service_role');

-- Insert default lists that will be created in Brevo
INSERT INTO brevo_lists (brevo_list_id, name, type, criteria) VALUES
    (1, 'All Users', 'dynamic', '{"conditions": [{"field": "status", "operator": "equals", "value": "active"}]}'),
    (2, 'Free Users', 'dynamic', '{"conditions": [{"field": "SUBSCRIPTION_TYPE", "operator": "equals", "value": "free"}]}'),
    (3, 'Premium Users', 'dynamic', '{"conditions": [{"field": "SUBSCRIPTION_TYPE", "operator": "equals", "value": "premium"}]}'),
    (4, 'Active Users', 'dynamic', '{"conditions": [{"field": "LAST_LOGIN", "operator": "greater_than", "value": "30_days_ago"}]}'),
    (5, 'Inactive Users', 'dynamic', '{"conditions": [{"field": "LAST_LOGIN", "operator": "less_than", "value": "30_days_ago"}]}'),
    (6, 'High Usage', 'dynamic', '{"conditions": [{"field": "LETTERS_GENERATED", "operator": "greater_than", "value": "5"}]}'),
    (7, 'Low Usage', 'dynamic', '{"conditions": [{"field": "LETTERS_GENERATED", "operator": "less_than", "value": "2"}]}'),
    (8, 'Quota Warning', 'dynamic', '{"conditions": [{"field": "QUOTA_REMAINING", "operator": "between", "value": [1, 2]}]}'),
    (9, 'Quota Reached', 'dynamic', '{"conditions": [{"field": "QUOTA_REMAINING", "operator": "equals", "value": "0"}]}');

-- Insert default API configuration
INSERT INTO brevo_api_config (key_name, value) VALUES
    ('rate_limit_per_second', '10'),
    ('batch_size', '1000'),
    ('retry_attempts', '3'),
    ('retry_delay_seconds', '5');

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(
    letters_generated INTEGER,
    days_since_signup INTEGER,
    subscription_type TEXT,
    profile_completion NUMERIC
) RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
BEGIN
    -- Usage score (10 points per letter, max 50)
    score := score + LEAST(letters_generated * 10, 50);
    
    -- Recency score (20 points if signed up within 7 days)
    IF days_since_signup <= 7 THEN
        score := score + 20;
    END IF;
    
    -- Subscription score (30 points for premium)
    IF subscription_type = 'premium' THEN
        score := score + 30;
    END IF;
    
    -- Profile completion score (max 40 points)
    score := score + (profile_completion * 0.4)::INTEGER;
    
    -- Return score capped at 100
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to get user attributes for Brevo sync
CREATE OR REPLACE FUNCTION get_user_brevo_attributes(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    user_data RECORD;
    profile_data RECORD;
    quota_data RECORD;
    letters_count INTEGER;
    result JSONB;
BEGIN
    -- Get user email from auth.users
    SELECT email, created_at INTO user_data
    FROM auth.users
    WHERE id = user_uuid;
    
    -- Get profile data
    SELECT first_name, last_name, country, language, subscription_tier, subscription_end_date
    INTO profile_data
    FROM user_profiles
    WHERE user_id = user_uuid;
    
    -- Get quota data
    SELECT letters_generated, max_letters, reset_date
    INTO quota_data
    FROM user_quotas
    WHERE user_id = user_uuid;
    
    -- Get total letters count
    SELECT COUNT(*) INTO letters_count
    FROM generated_letters
    WHERE user_id = user_uuid;
    
    -- Calculate profile completion percentage
    DECLARE
        completion_score NUMERIC := 0;
    BEGIN
        IF profile_data.first_name IS NOT NULL THEN completion_score := completion_score + 20; END IF;
        IF profile_data.last_name IS NOT NULL THEN completion_score := completion_score + 20; END IF;
        IF profile_data.country IS NOT NULL THEN completion_score := completion_score + 20; END IF;
        IF profile_data.language IS NOT NULL THEN completion_score := completion_score + 20; END IF;
        IF quota_data.user_id IS NOT NULL THEN completion_score := completion_score + 20; END IF;
    END;
    
    -- Build the result JSON
    result := jsonb_build_object(
        'EMAIL', user_data.email,
        'FNAME', COALESCE(profile_data.first_name, ''),
        'LNAME', COALESCE(profile_data.last_name, ''),
        'SUBSCRIPTION_TYPE', COALESCE(profile_data.subscription_tier, 'free'),
        'LETTERS_GENERATED', COALESCE(letters_count, 0),
        'LAST_LETTER_DATE', (
            SELECT created_at::text
            FROM generated_letters
            WHERE user_id = user_uuid
            ORDER BY created_at DESC
            LIMIT 1
        ),
        'REGISTRATION_DATE', user_data.created_at::text,
        'COUNTRY', COALESCE(profile_data.country, ''),
        'LANGUAGE', COALESCE(profile_data.language, 'fr'),
        'QUOTA_REMAINING', COALESCE(quota_data.max_letters - quota_data.letters_generated, 0),
        'MAX_QUOTA', COALESCE(quota_data.max_letters, 10),
        'LAST_LOGIN', NOW()::text, -- Will be updated by application
        'LEAD_SCORE', calculate_lead_score(
            COALESCE(letters_count, 0),
            EXTRACT(days FROM (NOW() - user_data.created_at))::INTEGER,
            COALESCE(profile_data.subscription_tier, 'free'),
            completion_score
        ),
        'PROFILE_COMPLETION', completion_score
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger contact sync on user changes
CREATE OR REPLACE FUNCTION trigger_brevo_contact_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert event for processing
    INSERT INTO brevo_contact_events (user_id, event_type, event_data)
    VALUES (
        COALESCE(NEW.user_id, NEW.id),
        TG_OP::text,
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'old', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
            'new', row_to_json(NEW)
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic sync
CREATE TRIGGER user_profiles_brevo_sync
    AFTER INSERT OR UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_brevo_contact_sync();

CREATE TRIGGER user_quotas_brevo_sync
    AFTER INSERT OR UPDATE ON user_quotas
    FOR EACH ROW EXECUTE FUNCTION trigger_brevo_contact_sync();

CREATE TRIGGER generated_letters_brevo_sync
    AFTER INSERT ON generated_letters
    FOR EACH ROW EXECUTE FUNCTION trigger_brevo_contact_sync();

-- Comments for documentation
COMMENT ON TABLE brevo_contacts_sync IS 'Tracks synchronization status of contacts between LetterApp and Brevo';
COMMENT ON TABLE brevo_lists IS 'Manages Brevo contact lists and their criteria';
COMMENT ON TABLE brevo_contact_lists IS 'Tracks which contacts belong to which lists';
COMMENT ON TABLE brevo_sync_jobs IS 'Manages background synchronization jobs';
COMMENT ON TABLE brevo_contact_events IS 'Logs contact-related events for processing';
COMMENT ON FUNCTION get_user_brevo_attributes(UUID) IS 'Generates Brevo-compatible user attributes for sync';
COMMENT ON FUNCTION calculate_lead_score(INTEGER, INTEGER, TEXT, NUMERIC) IS 'Calculates a lead score based on user activity and profile data';