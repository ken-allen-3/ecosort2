-- Create feedback table for incorrect verdict reports
CREATE TABLE public.verdict_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  reported_category TEXT NOT NULL,
  suggested_category TEXT,
  user_location TEXT,
  feedback_text TEXT,
  image_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public inserts (anonymous feedback)
ALTER TABLE public.verdict_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (no auth required)
CREATE POLICY "Anyone can submit feedback"
ON public.verdict_feedback
FOR INSERT
WITH CHECK (true);

-- Only allow reading via service role (admin access)
CREATE POLICY "Service role can read feedback"
ON public.verdict_feedback
FOR SELECT
USING (false);