-- Allow all authenticated users to view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

CREATE POLICY "Anyone can view all profiles"
ON profiles FOR SELECT
USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);