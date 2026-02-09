-- =====================================================
-- COMPLETE FIX FOR CONTENT ADMINISTRATOR ACCESS
-- =====================================================
-- Run this entire script in Supabase SQL Editor to fix all issues
-- This combines all necessary migrations into one script

-- =====================================================
-- 1. Remove foreign key constraint on designation_label
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_designation_label_fkey'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_designation_label_fkey;
        RAISE NOTICE '✅ Dropped foreign key constraint profiles_designation_label_fkey';
    END IF;
END $$;

-- =====================================================
-- 2. Update content administrator profiles
-- =====================================================
-- Technical Editor
UPDATE public.profiles
SET 
  role = 'editor',
  designation_label = 'Technical Editor',
  updated_at = NOW()
WHERE email = 'jonee.elopre@carsu.edu.ph';

-- Creative Director
UPDATE public.profiles
SET 
  role = 'editor',
  designation_label = 'Creative Director',
  updated_at = NOW()
WHERE email = 'levibrian.cejuela@carsu.edu.ph';

-- Editor-in-Chief
UPDATE public.profiles
SET 
  role = 'editor',
  designation_label = 'Editor-in-Chief',
  updated_at = NOW()
WHERE email = 'melede.ganoy@carsu.edu.ph';

-- Archival Managers
UPDATE public.profiles
SET 
  role = 'editor',
  designation_label = 'Archival Manager',
  updated_at = NOW()
WHERE email IN ('julesleo.reserva@carsu.edu.ph', 'eizzielmarie.bacoy@carsu.edu.ph');

-- =====================================================
-- 3. Add approval tracking columns to projects table
-- =====================================================

-- SECTION HEAD APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section_head_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section_head_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section_head_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_section_head_comments TEXT;

-- TECHNICAL EDITOR APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_editor_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_editor_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_editor_comments TEXT;

-- CREATIVE DIRECTOR APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creative_director_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creative_director_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creative_director_comments TEXT;

-- EDITOR-IN-CHIEF (EIC) APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eic_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eic_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eic_comments TEXT;

-- CHIEF ADVISER APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chief_adviser_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chief_adviser_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chief_adviser_comments TEXT;

-- ARCHIVAL MANAGER APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archival_manager_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archival_manager_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archival_manager_comments TEXT;

-- RETURN TRACKING - Technical Editor
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor_user UUID REFERENCES auth.users(id);

-- RETURN TRACKING - Creative Director
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director_user UUID REFERENCES auth.users(id);

-- RETURN TRACKING - EIC
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic_user UUID REFERENCES auth.users(id);

-- WORKFLOW TRACKING
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'Medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_date TIMESTAMPTZ;

-- =====================================================
-- 4. Verify everything is set up correctly
-- =====================================================

-- Check content administrators
SELECT
  email,
  role,
  designation_label,
  status,
  '✅' as check_mark
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

-- Check projects table has all approval columns
SELECT 
  column_name,
  data_type,
  '✅' as added
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND (
  column_name LIKE '%approved%' 
  OR column_name LIKE '%returned%'
  OR column_name = 'priority_level'
  OR column_name = 'submitted_by'
  OR column_name = 'submitted_date'
)
ORDER BY column_name;

-- =====================================================
-- Expected Results:
-- =====================================================
-- Profiles table should show:
-- | email                          | role   | designation_label  | status |
-- |--------------------------------|--------|--------------------|--------|
-- | jonee.elopre@carsu.edu.ph      | editor | Technical Editor   | active |
-- | levibrian.cejuela@carsu.edu.ph | editor | Creative Director  | active |
-- | melede.ganoy@carsu.edu.ph      | editor | Editor-in-Chief    | active |
-- | julesleo.reserva@carsu.edu.ph  | editor | Archival Manager   | active |
-- | eizzielmarie.bacoy@carsu.edu.ph| editor | Archival Manager   | active |
--
-- Projects table should have these columns:
-- - section_head_approved_by, section_head_approved_date, section_head_comments
-- - technical_editor_approved_by, technical_editor_approved_date, technical_editor_comments
-- - creative_director_approved_by, creative_director_approved_date, creative_director_comments
-- - eic_approved_by, eic_approved_date, eic_comments
-- - chief_adviser_approved_by, chief_adviser_approved_date, chief_adviser_comments
-- - archival_manager_approved_by, archival_manager_approved_date, archival_manager_comments
-- - returned_by_* columns for tracking returns
-- - priority_level, submitted_by, submitted_date

-- =====================================================
-- NEXT STEPS:
-- =====================================================
-- 1. After running this script successfully
-- 2. Have all content administrators LOG OUT and LOG BACK IN
-- 3. They should now be able to access their respective approval pages
-- =====================================================
