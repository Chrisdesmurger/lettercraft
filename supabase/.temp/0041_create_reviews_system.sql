-- Migration: Create reviews and feedback system for LetterCraft
-- Description: Implements user reviews and feedback for generated letters with category tagging and analytics

-- Create feedback_categories table
CREATE TABLE public.feedback_categories (
    key TEXT PRIMARY KEY,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default feedback categories
INSERT INTO public.feedback_categories (key, label_fr, label_en) VALUES
('content', 'Contenu', 'Content'),
('style', 'Style', 'Style'),
('relevance', 'Pertinence', 'Relevance'),
('length', 'Longueur', 'Length');

-- Create letter_reviews table
CREATE TABLE public.letter_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    letter_id UUID NOT NULL REFERENCES public.generated_letters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT CHECK (char_length(feedback) <= 250),
    categories TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one review per user per letter
    UNIQUE(letter_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_letter_reviews_letter_id ON public.letter_reviews(letter_id);
CREATE INDEX idx_letter_reviews_user_id ON public.letter_reviews(user_id);
CREATE INDEX idx_letter_reviews_rating ON public.letter_reviews(rating);
CREATE INDEX idx_letter_reviews_created_at ON public.letter_reviews(created_at);
CREATE INDEX idx_letter_reviews_categories ON public.letter_reviews USING GIN(categories);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_letter_reviews_updated_at
    BEFORE UPDATE ON public.letter_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.letter_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for letter_reviews
-- Users can only see and modify their own reviews
CREATE POLICY "Users can view their own reviews" ON public.letter_reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reviews" ON public.letter_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.letter_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.letter_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for feedback_categories
-- Categories are read-only for all authenticated users
CREATE POLICY "Everyone can view feedback categories" ON public.feedback_categories
    FOR SELECT USING (true);

-- Function to validate categories array
CREATE OR REPLACE FUNCTION public.validate_feedback_categories(categories TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    category TEXT;
    valid_categories TEXT[] := ARRAY['content', 'style', 'relevance', 'length'];
BEGIN
    -- Check if all categories are valid
    FOREACH category IN ARRAY categories
    LOOP
        IF category != ALL(valid_categories) THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    -- Check for duplicates and max 4 categories
    IF array_length(categories, 1) > 4 OR array_length(categories, 1) != array_length(array(SELECT DISTINCT unnest(categories)), 1) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Add constraint to validate categories
ALTER TABLE public.letter_reviews 
ADD CONSTRAINT check_valid_categories 
CHECK (public.validate_feedback_categories(categories));

-- Function to check if user owns the letter being reviewed
CREATE OR REPLACE FUNCTION public.user_owns_letter(p_user_id UUID, p_letter_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    letter_owner UUID;
BEGIN
    SELECT user_id INTO letter_owner
    FROM public.generated_letters
    WHERE id = p_letter_id;
    
    RETURN letter_owner = p_user_id;
END;
$$;

-- Add constraint to ensure user can only review their own letters
ALTER TABLE public.letter_reviews 
ADD CONSTRAINT check_letter_ownership 
CHECK (public.user_owns_letter(user_id, letter_id));

-- Function to get review statistics (for analytics)
CREATE OR REPLACE FUNCTION public.get_review_statistics(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_reviews BIGINT,
    average_rating NUMERIC,
    rating_distribution JSONB,
    total_users_with_reviews BIGINT,
    total_users_with_letters BIGINT,
    participation_rate NUMERIC,
    category_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_reviews BIGINT;
    v_average_rating NUMERIC;
    v_rating_dist JSONB;
    v_users_with_reviews BIGINT;
    v_users_with_letters BIGINT;
    v_participation_rate NUMERIC;
    v_category_breakdown JSONB;
BEGIN
    -- Total reviews in period
    SELECT COUNT(*) INTO v_total_reviews
    FROM public.letter_reviews
    WHERE created_at BETWEEN start_date AND end_date;
    
    -- Average rating
    SELECT ROUND(AVG(rating), 2) INTO v_average_rating
    FROM public.letter_reviews
    WHERE created_at BETWEEN start_date AND end_date;
    
    -- Rating distribution
    SELECT jsonb_object_agg(rating::text, count)
    INTO v_rating_dist
    FROM (
        SELECT rating, COUNT(*) as count
        FROM public.letter_reviews
        WHERE created_at BETWEEN start_date AND end_date
        GROUP BY rating
        ORDER BY rating
    ) rating_counts;
    
    -- Users with reviews in period
    SELECT COUNT(DISTINCT user_id) INTO v_users_with_reviews
    FROM public.letter_reviews
    WHERE created_at BETWEEN start_date AND end_date;
    
    -- Users with letters in period
    SELECT COUNT(DISTINCT user_id) INTO v_users_with_letters
    FROM public.generated_letters
    WHERE created_at BETWEEN start_date AND end_date;
    
    -- Participation rate
    v_participation_rate := CASE 
        WHEN v_users_with_letters > 0 THEN ROUND((v_users_with_reviews::NUMERIC / v_users_with_letters::NUMERIC) * 100, 2)
        ELSE 0
    END;
    
    -- Category breakdown (categories associated with low ratings <= 3)
    SELECT jsonb_object_agg(category, count)
    INTO v_category_breakdown
    FROM (
        SELECT category, COUNT(*) as count
        FROM public.letter_reviews lr,
        LATERAL unnest(lr.categories) AS category
        WHERE lr.created_at BETWEEN start_date AND end_date
        AND lr.rating <= 3
        GROUP BY category
        ORDER BY count DESC
    ) category_counts;
    
    RETURN QUERY SELECT 
        v_total_reviews,
        v_average_rating,
        COALESCE(v_rating_dist, '{}'::jsonb),
        v_users_with_reviews,
        v_users_with_letters,
        v_participation_rate,
        COALESCE(v_category_breakdown, '{}'::jsonb);
END;
$$;

-- Function to export reviews to CSV format (returns rows)
CREATE OR REPLACE FUNCTION public.export_reviews_csv(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    id UUID,
    letter_id UUID,
    user_id UUID,
    rating INTEGER,
    feedback TEXT,
    categories TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lr.id,
        lr.letter_id,
        lr.user_id,
        lr.rating,
        lr.feedback,
        array_to_string(lr.categories, ',') as categories,
        lr.created_at
    FROM public.letter_reviews lr
    WHERE lr.created_at BETWEEN start_date AND end_date
    ORDER BY lr.created_at DESC;
END;
$$;

-- Function to check and award contributor badge
CREATE OR REPLACE FUNCTION public.check_contributor_badge(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    review_count INTEGER;
BEGIN
    -- Count user's reviews
    SELECT COUNT(*) INTO review_count
    FROM public.letter_reviews
    WHERE user_id = p_user_id;
    
    -- Return true if user has 3 or more reviews
    RETURN review_count >= 3;
END;
$$;

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.feedback_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.letter_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_feedback_categories(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_letter(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_contributor_badge(UUID) TO authenticated;

-- Grant permissions for analytics functions (restricted access)
-- Note: These should be restricted to admin roles in production
GRANT EXECUTE ON FUNCTION public.get_review_statistics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_reviews_csv(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.letter_reviews IS 'User reviews and feedback for generated letters with 1-5 star ratings';
COMMENT ON TABLE public.feedback_categories IS 'Predefined categories for letter feedback (content, style, relevance, length)';
COMMENT ON FUNCTION public.get_review_statistics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Returns aggregated review statistics for analytics';
COMMENT ON FUNCTION public.export_reviews_csv(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Exports review data in CSV format for analysis';
COMMENT ON FUNCTION public.check_contributor_badge(UUID) IS 'Checks if user qualifies for contributor badge (3+ reviews)';