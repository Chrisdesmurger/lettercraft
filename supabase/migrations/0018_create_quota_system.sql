-- Migration: Create quota system for LetterCraft
-- Description: Implements user quotas for letter generation with automatic resets and subscription tier integration

-- Create user_quotas table
CREATE TABLE public.user_quotas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    letters_generated INTEGER NOT NULL DEFAULT 0,
    max_letters INTEGER NOT NULL DEFAULT 10,
    reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_quotas_user_id ON public.user_quotas(user_id);
CREATE INDEX idx_user_quotas_reset_date ON public.user_quotas(reset_date);

-- Enable Row Level Security
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see and modify their own quotas
CREATE POLICY "Users can view their own quotas" ON public.user_quotas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quotas" ON public.user_quotas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotas" ON public.user_quotas
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to get or initialize user quota
CREATE OR REPLACE FUNCTION public.get_or_create_user_quota(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    letters_generated INTEGER,
    max_letters INTEGER,
    reset_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription_tier TEXT;
    v_max_letters INTEGER;
BEGIN
    -- Get user's subscription tier
    SELECT up.subscription_tier 
    INTO v_subscription_tier
    FROM public.user_profiles up 
    WHERE up.user_id = p_user_id;
    
    -- Set max letters based on subscription tier
    v_max_letters := CASE 
        WHEN v_subscription_tier = 'premium' THEN 1000 
        ELSE 10 
    END;
    
    -- Insert or update quota record
    INSERT INTO public.user_quotas (user_id, max_letters)
    VALUES (p_user_id, v_max_letters)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        max_letters = v_max_letters,
        updated_at = NOW()
    WHERE user_quotas.reset_date <= NOW(); -- Only update if reset is due
    
    -- Return the quota record
    RETURN QUERY
    SELECT uq.id, uq.user_id, uq.letters_generated, uq.max_letters, 
           uq.reset_date, uq.created_at, uq.updated_at
    FROM public.user_quotas uq
    WHERE uq.user_id = p_user_id;
END;
$$;

-- Create function to check if user can generate a letter
CREATE OR REPLACE FUNCTION public.can_generate_letter(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quota RECORD;
BEGIN
    -- Get or create user quota
    SELECT * INTO v_quota FROM public.get_or_create_user_quota(p_user_id) LIMIT 1;
    
    -- Check if reset is needed
    IF v_quota.reset_date <= NOW() THEN
        -- Reset quota
        UPDATE public.user_quotas 
        SET 
            letters_generated = 0,
            reset_date = date_trunc('month', NOW()) + INTERVAL '1 month',
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Refetch quota after reset
        SELECT * INTO v_quota FROM public.get_or_create_user_quota(p_user_id) LIMIT 1;
    END IF;
    
    -- Check if user can generate more letters
    RETURN v_quota.letters_generated < v_quota.max_letters;
END;
$$;

-- Create function to increment letter count
CREATE OR REPLACE FUNCTION public.increment_letter_count(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_can_generate BOOLEAN;
    v_updated_count INTEGER;
BEGIN
    -- Check if user can generate
    SELECT public.can_generate_letter(p_user_id) INTO v_can_generate;
    
    IF NOT v_can_generate THEN
        RETURN FALSE;
    END IF;
    
    -- Increment the count
    UPDATE public.user_quotas 
    SET 
        letters_generated = letters_generated + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING letters_generated INTO v_updated_count;
    
    RETURN TRUE;
END;
$$;

-- Create function to reset quotas for all users (for scheduled job)
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reset_count INTEGER;
BEGIN
    UPDATE public.user_quotas 
    SET 
        letters_generated = 0,
        reset_date = date_trunc('month', NOW()) + INTERVAL '1 month',
        updated_at = NOW()
    WHERE reset_date <= NOW();
    
    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
    RETURN v_reset_count;
END;
$$;

-- Create trigger function to sync quota limits when subscription tier changes
CREATE OR REPLACE FUNCTION public.sync_quota_on_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_max_letters INTEGER;
BEGIN
    -- Determine new max letters based on subscription tier
    v_new_max_letters := CASE 
        WHEN NEW.subscription_tier = 'premium' THEN 1000 
        ELSE 10 
    END;
    
    -- Update or create quota record
    INSERT INTO public.user_quotas (user_id, max_letters)
    VALUES (NEW.user_id, v_new_max_letters)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        max_letters = v_new_max_letters,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- Create trigger on user_profiles to sync quotas when subscription changes
CREATE TRIGGER trigger_sync_quota_on_subscription_change
    AFTER INSERT OR UPDATE OF subscription_tier ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_quota_on_subscription_change();

-- Create function to get quota status for API
CREATE OR REPLACE FUNCTION public.get_quota_status(p_user_id UUID)
RETURNS TABLE (
    letters_generated INTEGER,
    max_letters INTEGER,
    remaining_letters INTEGER,
    reset_date TIMESTAMP WITH TIME ZONE,
    can_generate BOOLEAN,
    subscription_tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quota RECORD;
    v_subscription TEXT;
    v_can_generate BOOLEAN;
BEGIN
    -- Get user subscription tier
    SELECT up.subscription_tier 
    INTO v_subscription
    FROM public.user_profiles up 
    WHERE up.user_id = p_user_id;
    
    -- Get or create quota
    SELECT * INTO v_quota FROM public.get_or_create_user_quota(p_user_id) LIMIT 1;
    
    -- Check if can generate
    SELECT public.can_generate_letter(p_user_id) INTO v_can_generate;
    
    -- Return status
    RETURN QUERY
    SELECT 
        v_quota.letters_generated,
        v_quota.max_letters,
        (v_quota.max_letters - v_quota.letters_generated) AS remaining_letters,
        v_quota.reset_date,
        v_can_generate,
        COALESCE(v_subscription, 'free');
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_quotas TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_user_quota(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_generate_letter(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_letter_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quota_status(UUID) TO authenticated;

-- Insert comment for migration tracking
COMMENT ON TABLE public.user_quotas IS 'Stores user quotas for letter generation with monthly reset functionality';
COMMENT ON FUNCTION public.get_or_create_user_quota(UUID) IS 'Gets existing quota or creates new one based on subscription tier';
COMMENT ON FUNCTION public.can_generate_letter(UUID) IS 'Checks if user can generate a letter based on current quota';
COMMENT ON FUNCTION public.increment_letter_count(UUID) IS 'Increments letter count if user has quota remaining';
COMMENT ON FUNCTION public.get_quota_status(UUID) IS 'Returns complete quota status for API consumption';