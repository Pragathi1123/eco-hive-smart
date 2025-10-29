-- Add accuracy tracking to user_stats
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS total_classifications integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_classifications integer DEFAULT 0;

-- Add computed accuracy score column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'accuracy_score'
  ) THEN
    ALTER TABLE public.user_stats 
    ADD COLUMN accuracy_score numeric GENERATED ALWAYS AS (
      CASE 
        WHEN total_classifications > 0 
        THEN ROUND((correct_classifications::numeric / total_classifications::numeric) * 100, 2)
        ELSE 0 
      END
    ) STORED;
  END IF;
END $$;

-- Create classification_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.classification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  detected_category text NOT NULL,
  user_confirmed_category text,
  is_correct boolean,
  confidence numeric,
  barcode text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.classification_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own classification logs" ON public.classification_logs;
DROP POLICY IF EXISTS "Users can insert their own classification logs" ON public.classification_logs;
DROP POLICY IF EXISTS "Users can update their own classification logs" ON public.classification_logs;

-- Create RLS policies
CREATE POLICY "Users can view their own classification logs"
ON public.classification_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own classification logs"
ON public.classification_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own classification logs"
ON public.classification_logs
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update accuracy when classification is confirmed
CREATE OR REPLACE FUNCTION public.update_classification_accuracy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only update if user confirmed the classification
  IF NEW.user_confirmed_category IS NOT NULL AND NEW.is_correct IS NOT NULL THEN
    UPDATE public.user_stats
    SET 
      total_classifications = total_classifications + 1,
      correct_classifications = correct_classifications + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
      total_points = total_points + CASE WHEN NEW.is_correct THEN 10 ELSE 0 END,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_classification_confirmed ON public.classification_logs;

-- Create trigger to update accuracy on classification confirmation
CREATE TRIGGER on_classification_confirmed
AFTER INSERT OR UPDATE ON public.classification_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_classification_accuracy();