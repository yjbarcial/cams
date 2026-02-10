-- ============================================================================
-- COMPLETE SYSTEM MIGRATION - Project Access & Notifications
-- ============================================================================
-- This migration ensures:
-- 1. Content administrators have correct roles and designation labels
-- 2. All approval tracking columns exist in projects table
-- 3. Foreign key constraints are removed for flexible designation labels
-- ============================================================================

-- STEP 1: Remove foreign key constraint on designation_label
-- This allows free-form designation labels without requiring a separate designations table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'profiles_designation_label_fkey'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_designation_label_fkey;
        RAISE NOTICE '✅ Dropped foreign key constraint profiles_designation_label_fkey';
    ELSE
        RAISE NOTICE 'ℹ️ Foreign key constraint already removed';
    END IF;
END $$;

-- STEP 2: Update Content Administrator Roles
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

-- ✅ Content administrator roles updated

-- STEP 3: Add ALL approval tracking columns to projects table
-- These columns track the complete approval workflow

-- SECTION HEAD APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section_head_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section_head_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section_head_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_section_head BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_section_head_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_section_head_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_section_head_user UUID REFERENCES auth.users(id);

-- TECHNICAL EDITOR APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_editor_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_editor_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_editor_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor_user UUID REFERENCES auth.users(id);

-- CREATIVE DIRECTOR APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creative_director_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creative_director_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creative_director_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director_user UUID REFERENCES auth.users(id);

-- EDITOR-IN-CHIEF (EIC) APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eic_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eic_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eic_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic_comments TEXT;

-- CHIEF ADVISER APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chief_adviser_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chief_adviser_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chief_adviser_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_chief_adviser BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_chief_adviser_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_chief_adviser_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_chief_adviser_user UUID REFERENCES auth.users(id);

-- ARCHIVAL MANAGER APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archival_manager_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archival_manager_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archival_manager_comments TEXT;

-- WORKFLOW TRACKING
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'Medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_date TIMESTAMPTZ;

-- ✅ All approval tracking columns added to projects table

-- STEP 4: Create indexes for better query performance on approval columns
CREATE INDEX IF NOT EXISTS idx_projects_section_head_approved_by ON projects(section_head_approved_by) WHERE section_head_approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_technical_editor_approved_by ON projects(technical_editor_approved_by) WHERE technical_editor_approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_creative_director_approved_by ON projects(creative_director_approved_by) WHERE creative_director_approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_eic_approved_by ON projects(eic_approved_by) WHERE eic_approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_returned_by_technical_editor ON projects(returned_by_technical_editor) WHERE returned_by_technical_editor = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_returned_by_creative_director ON projects(returned_by_creative_director) WHERE returned_by_creative_director = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_returned_by_eic ON projects(returned_by_eic) WHERE returned_by_eic = TRUE;

-- ✅ Indexes created for approval columns

-- STEP 5: Verify the updates
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

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful:

-- 1. Check all approval columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' 
  AND column_name LIKE '%approved%' 
  OR column_name LIKE '%returned%'
ORDER BY column_name;

-- 2. Check content administrator profiles
SELECT 
  email, 
  role, 
  designation_label, 
  status
FROM profiles
WHERE designation_label IN (
  'Technical Editor', 
  'Creative Director', 
  'Editor-in-Chief', 
  'Archival Manager'
)
ORDER BY designation_label;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
