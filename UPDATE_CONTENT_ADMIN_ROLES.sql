-- =====================================================
-- Update Content Administrator Roles and Designations
-- =====================================================
-- This script updates the roles and designation_labels for content administrators
-- to ensure they have proper access to the approval workflow
--
-- Approval Process:
-- 1. Section Head
-- 2. Technical Editor
-- 3. Creative Director
-- 4. Editor-in-Chief
-- 5. (Optional) Chief Adviser
-- 6. Archival Manager

-- =====================================================
-- STEP 1: Remove foreign key constraint on designation_label
-- =====================================================
-- The designation_label should be a simple TEXT field for flexibility
-- Remove the foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_designation_label_fkey'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_designation_label_fkey;
        RAISE NOTICE 'Dropped foreign key constraint profiles_designation_label_fkey';
    END IF;
END $$;

-- =====================================================
-- STEP 2: (Optional) Add designations to designations table if you want to keep the reference table
-- =====================================================
-- Only run this if you have a designations table and want to populate it
-- INSERT INTO public.designations (label, description, created_at)
-- VALUES
--   ('Technical Editor', 'Reviews technical aspects of content', NOW()),
--   ('Creative Director', 'Reviews creative and visual aspects', NOW()),
--   ('Editor-in-Chief', 'Final editorial authority', NOW()),
--   ('Chief Adviser', 'Provides advisory review', NOW()),
--   ('Archival Manager', 'Manages archives and publications', NOW())
-- ON CONFLICT (label) DO NOTHING;

-- =====================================================
-- STEP 3: Update profiles with correct roles and designations
-- =====================================================
-- Update Technical Editor
UPDATE public.profiles
SET 
  role = 'editor',
  designation_label = 'Technical Editor',
  updated_at = NOW()
WHERE email = 'jonee.elopre@carsu.edu.ph';

-- Update Creative Director
UPDATE public.profiles
SET 
  role = 'editor',
  designation_label = 'Creative Director',
  updated_at = NOW()
WHERE email = 'levibrian.cejuela@carsu.edu.ph';

-- Update Editor-in-Chief
UPDATE public.profiles
SET 
  role = 'editor',
  designation_label = 'Editor-in-Chief',
  updated_at = NOW()
WHERE email = 'melede.ganoy@carsu.edu.ph';

-- Update Archival Managers
UPDATE public.profiles
SET 
  role = 'editor',
  designation_label = 'Archival Manager',
  updated_at = NOW()
WHERE email IN ('julesleo.reserva@carsu.edu.ph', 'eizzielmarie.bacoy@carsu.edu.ph');

-- Verify the updates
SELECT 
  id, 
  first_name, 
  last_name, 
  email, 
  role, 
  designation_label, 
  status
FROM public.profiles
WHERE email IN (
  'jonee.elopre@carsu.edu.ph',
  'levibrian.cejuela@carsu.edu.ph',
  'melede.ganoy@carsu.edu.ph',
  'julesleo.reserva@carsu.edu.ph',
  'eizzielmarie.bacoy@carsu.edu.ph'
)
ORDER BY 
  CASE email
    WHEN 'jonee.elopre@carsu.edu.ph' THEN 1
    WHEN 'levibrian.cejuela@carsu.edu.ph' THEN 2
    WHEN 'melede.ganoy@carsu.edu.ph' THEN 3
    WHEN 'julesleo.reserva@carsu.edu.ph' THEN 4
    WHEN 'eizzielmarie.bacoy@carsu.edu.ph' THEN 5
  END;

-- Expected result:
-- | email                          | role   | designation_label  |
-- |--------------------------------|--------|-------------------|
-- | jonee.elopre@carsu.edu.ph      | editor | Technical Editor  |
-- | levibrian.cejuela@carsu.edu.ph | editor | Creative Director |
-- | melede.ganoy@carsu.edu.ph      | editor | Editor-in-Chief   |
-- | julesleo.reserva@carsu.edu.ph  | editor | Archival Manager  |
-- | eizzielmarie.bacoy@carsu.edu.ph| editor | Archival Manager  |
