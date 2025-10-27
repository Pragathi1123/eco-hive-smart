-- Create profiles table for user information
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create waste categories table
CREATE TABLE public.waste_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  color text,
  carbon_savings_kg numeric(10,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waste_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view waste categories"
  ON public.waste_categories FOR SELECT
  USING (true);

-- Insert default waste categories
INSERT INTO public.waste_categories (name, description, icon, color, carbon_savings_kg) VALUES
  ('Plastic', 'Plastic bottles, containers, packaging', 'Recycle', '#3b82f6', 2.5),
  ('Organic', 'Food waste, garden waste, compostable materials', 'Leaf', '#22c55e', 0.8),
  ('Paper', 'Newspapers, cardboard, paper packaging', 'FileText', '#f59e0b', 1.2),
  ('Textile', 'Clothing, fabrics, textile materials', 'Shirt', '#8b5cf6', 3.0),
  ('E-Waste', 'Electronics, batteries, electrical items', 'Cpu', '#ef4444', 5.0),
  ('Hazardous', 'Chemicals, paint, dangerous materials', 'AlertTriangle', '#dc2626', 4.0);

-- Create waste logs table
CREATE TABLE public.waste_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.waste_categories(id) ON DELETE CASCADE,
  weight_kg numeric(10,2) NOT NULL,
  notes text,
  image_url text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own waste logs"
  ON public.waste_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own waste logs"
  ON public.waste_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own waste logs"
  ON public.waste_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own waste logs"
  ON public.waste_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Create achievements table
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  requirement_type text NOT NULL, -- 'total_weight', 'category_count', 'streak_days'
  requirement_value numeric NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  USING (true);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, points) VALUES
  ('First Step', 'Log your first waste entry', 'Award', 'total_weight', 0, 10),
  ('Eco Warrior', 'Log 10kg of waste', 'Medal', 'total_weight', 10, 50),
  ('Green Champion', 'Log 50kg of waste', 'Trophy', 'total_weight', 50, 150),
  ('Recycling Master', 'Log 100kg of waste', 'Crown', 'total_weight', 100, 300),
  ('Category Explorer', 'Log waste in all 6 categories', 'Star', 'category_count', 6, 100),
  ('Week Streak', 'Log waste for 7 consecutive days', 'Zap', 'streak_days', 7, 75);

-- Create user achievements table
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Create user stats table for quick access to aggregate data
CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_weight_kg numeric(10,2) DEFAULT 0,
  total_carbon_saved_kg numeric(10,2) DEFAULT 0,
  total_points integer DEFAULT 0,
  current_streak_days integer DEFAULT 0,
  longest_streak_days integer DEFAULT 0,
  last_log_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats"
  ON public.user_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_stats (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user stats after waste log
CREATE OR REPLACE FUNCTION public.update_user_stats_on_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  carbon_savings numeric;
BEGIN
  -- Get carbon savings for this category
  SELECT carbon_savings_kg INTO carbon_savings
  FROM public.waste_categories
  WHERE id = NEW.category_id;
  
  -- Update user stats
  INSERT INTO public.user_stats (user_id, total_weight_kg, total_carbon_saved_kg, last_log_date, updated_at)
  VALUES (
    NEW.user_id,
    NEW.weight_kg,
    NEW.weight_kg * carbon_savings,
    CURRENT_DATE,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_weight_kg = user_stats.total_weight_kg + NEW.weight_kg,
    total_carbon_saved_kg = user_stats.total_carbon_saved_kg + (NEW.weight_kg * carbon_savings),
    last_log_date = CURRENT_DATE,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Trigger to update stats on waste log insert
CREATE TRIGGER on_waste_log_created
  AFTER INSERT ON public.waste_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_user_stats_on_log();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();