-- Allow public access to user_stats for leaderboard
CREATE POLICY "Anyone can view all user stats"
ON public.user_stats
FOR SELECT
USING (true);

-- Allow public access to profiles for leaderboard display
-- (This replaces the existing policy)
DROP POLICY IF EXISTS "Anyone can view all profiles" ON public.profiles;
CREATE POLICY "Anyone can view all profiles"
ON public.profiles
FOR SELECT
USING (true);