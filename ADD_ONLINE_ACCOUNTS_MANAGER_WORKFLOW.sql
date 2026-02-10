-- Migration: Add Online Accounts Manager Workflow Status
-- Date: 2026-02-10
-- Purpose: Add to_online_accounts_manager status for Other section workflow

-- =====================================================
-- Add new status to project_status enum
-- =====================================================

-- Add to_online_accounts_manager status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_online_accounts_manager' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_online_accounts_manager';
    END IF;
END
$$;

-- =====================================================
-- Add Online Accounts Manager approval columns
-- =====================================================

-- Add online_accounts_manager_approved_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'online_accounts_manager_approved_by') THEN
        ALTER TABLE public.projects ADD COLUMN online_accounts_manager_approved_by UUID REFERENCES auth.users(id);
    END IF;
END
$$;

-- Add online_accounts_manager_approved_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'online_accounts_manager_approved_date') THEN
        ALTER TABLE public.projects ADD COLUMN online_accounts_manager_approved_date TIMESTAMPTZ;
    END IF;
END
$$;

-- Add online_accounts_manager_comments column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'online_accounts_manager_comments') THEN
        ALTER TABLE public.projects ADD COLUMN online_accounts_manager_comments TEXT;
    END IF;
END
$$;

-- =====================================================
-- Verification Query
-- =====================================================

-- Verify the new status was added
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'project_status'::regtype 
AND enumlabel = 'to_online_accounts_manager';

-- Verify the new columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('online_accounts_manager_approved_by', 'online_accounts_manager_approved_date', 'online_accounts_manager_comments');

-- =====================================================
-- Notes
-- =====================================================

/*
WHAT THIS MIGRATION DOES:

1. Adds 'to_online_accounts_manager' to the project_status enum
2. Adds approval tracking columns:
   - online_accounts_manager_approved_by (UUID referencing auth.users)
   - online_accounts_manager_approved_date (TIMESTAMPTZ)
   - online_accounts_manager_comments (TEXT)

WORKFLOW FOR "OTHER" SECTION (Social Media Projects):

OLD WORKFLOW (Magazine/Newsletter/Folio):
1. Section Head approves → to_technical_editor & creative_director
2. Both editors approve → to_editor_in_chief
3. Editor-in-Chief approves → for_publish (to Archival Manager)
4. Archival Manager publishes → published

NEW WORKFLOW (Other/Social Media):
1. Section Head approves → to_technical_editor & creative_director
2. Both editors approve → to_online_accounts_manager ✨ NEW
3. Online Accounts Manager approves → to_editor_in_chief
4. Editor-in-Chief approves → for_publish (to Online Accounts Manager)
5. Online Accounts Manager publishes → published

KEY CHANGES:
- Archival Managers NO LONGER approve "Other" projects
- Online Accounts Manager reviews BEFORE Editor-in-Chief
- Online Accounts Manager also handles publishing for "Other" projects
*/
