-- Add editor approval tracking columns to projects table
-- Run this in your Supabase SQL Editor
-- This adds ALL approval columns needed for the complete workflow:
-- Section Head -> Technical Editor -> Creative Director -> EIC -> Chief Adviser -> Archival Manager

-- =====================================================
-- SECTION HEAD APPROVAL COLUMNS
-- =====================================================
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS section_head_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS section_head_approved_date TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS section_head_comments TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_section_head_comments TEXT;

-- =====================================================
-- TECHNICAL EDITOR APPROVAL COLUMNS  
-- =====================================================
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS technical_editor_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS technical_editor_approved_date TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS technical_editor_comments TEXT;

-- =====================================================
-- CREATIVE DIRECTOR APPROVAL COLUMNS
-- =====================================================
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS creative_director_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS creative_director_approved_date TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS creative_director_comments TEXT;

-- =====================================================
-- EDITOR-IN-CHIEF (EIC) APPROVAL COLUMNS
-- =====================================================
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS eic_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS eic_approved_date TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS eic_comments TEXT;

-- =====================================================
-- CHIEF ADVISER APPROVAL COLUMNS
-- =====================================================
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS chief_adviser_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS chief_adviser_approved_date TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS chief_adviser_comments TEXT;

-- =====================================================
-- ARCHIVAL MANAGER APPROVAL COLUMNS
-- =====================================================
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS archival_manager_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS archival_manager_approved_date TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS archival_manager_comments TEXT;

-- =====================================================
-- RETURN TRACKING COLUMNS
-- =====================================================
-- Return tracking for Technical Editor
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_technical_editor BOOLEAN DEFAULT FALSE;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_technical_editor_date TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_technical_editor_comments TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_technical_editor_user UUID REFERENCES auth.users(id);

-- Return tracking for Creative Director
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_creative_director BOOLEAN DEFAULT FALSE;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_creative_director_date TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_creative_director_comments TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_creative_director_user UUID REFERENCES auth.users(id);

-- Return tracking for EIC
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_eic BOOLEAN DEFAULT FALSE;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_eic_date TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_eic_comments TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_eic_user UUID REFERENCES auth.users(id);

-- =====================================================
-- ADDITIONAL WORKFLOW COLUMNS
-- =====================================================
-- Priority level for projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'Medium';

-- Submitted by/date tracking
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS submitted_by TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS submitted_date TIMESTAMPTZ;

-- =====================================================
-- VERIFY COLUMNS WERE ADDED
-- =====================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND (
  column_name LIKE '%approved%' 
  OR column_name LIKE '%returned%'
  OR column_name LIKE '%section_head%'
  OR column_name LIKE '%technical_editor%'
  OR column_name LIKE '%creative_director%'
  OR column_name LIKE '%eic%'
  OR column_name LIKE '%chief_adviser%'
  OR column_name LIKE '%archival_manager%'
  OR column_name = 'priority_level'
  OR column_name = 'submitted_by'
  OR column_name = 'submitted_date'
)
ORDER BY column_name;
