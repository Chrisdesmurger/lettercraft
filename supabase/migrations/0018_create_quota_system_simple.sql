-- Migration simplifiée: Create quota system for LetterCraft
-- Description: Table user_quotas avec RLS pour gestion côté client

-- Create user_quotas table
CREATE TABLE IF NOT EXISTS public.user_quotas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    letters_generated INTEGER NOT NULL DEFAULT 0,
    max_letters INTEGER NOT NULL DEFAULT 10,
    reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON public.user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_reset_date ON public.user_quotas(reset_date);

-- Enable Row Level Security
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see and modify their own quotas
DROP POLICY IF EXISTS "Users can view their own quotas" ON public.user_quotas;
CREATE POLICY "Users can view their own quotas" ON public.user_quotas
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quotas" ON public.user_quotas;
CREATE POLICY "Users can insert their own quotas" ON public.user_quotas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quotas" ON public.user_quotas;
CREATE POLICY "Users can update their own quotas" ON public.user_quotas
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_quotas TO authenticated;

-- Insert comment for migration tracking
COMMENT ON TABLE public.user_quotas IS 'Stores user quotas for letter generation with monthly reset functionality - managed client-side';

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_quotas_updated_at ON public.user_quotas;
CREATE TRIGGER update_user_quotas_updated_at
    BEFORE UPDATE ON public.user_quotas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();