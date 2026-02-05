-- RLS Policies for Archives Table
-- Run this in Supabase SQL Editor to enable archive deletion for admins

-- Step 1: Drop the existing foreign key constraint that references auth.users
-- This constraint causes permission issues when deleting archives
ALTER TABLE archives DROP CONSTRAINT IF EXISTS archives_uploaded_by_fkey;

-- Step 2: Enable RLS on archives table
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to archives" ON archives;
DROP POLICY IF EXISTS "Allow admins to insert archives" ON archives;
DROP POLICY IF EXISTS "Allow admins to update archives" ON archives;
DROP POLICY IF EXISTS "Allow admins to delete archives" ON archives;

-- Archives policies
-- Policy 1: Allow anyone to read archives (public access)
CREATE POLICY "Allow public read access to archives"
ON archives
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy 2: Allow admins to insert archives
CREATE POLICY "Allow admins to insert archives"
ON archives
FOR INSERT
TO authenticated
WITH CHECK (
  auth.email() IN (
    'lovellhudson.clavel@carsu.edu.ph',
    'yssahjulianah.barcial@carsu.edu.ph',
    'altheaguila.gorres@carsu.edu.ph'
  )
);

-- Policy 3: Allow admins to update archives
CREATE POLICY "Allow admins to update archives"
ON archives
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Allow admins to delete archives
CREATE POLICY "Allow admins to delete archives"
ON archives
FOR DELETE
TO authenticated
USING (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'archives';
