-- =====================================================
-- Add missing columns to projects table
-- =====================================================
-- Run this in Supabase SQL Editor to add the missing columns

-- Create project_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'review', 'completed', 'archived', 'to_section_head', 'to_technical_editor', 'to_creative_director', 'to_editor_in_chief', 'approved', 'rejected', 'returned_by_section_head', 'returned_by_technical_editor', 'returned_by_creative_director');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing project_status enum values if it already exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_section_head' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_section_head';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_technical_editor' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_technical_editor';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_creative_director' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_creative_director';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_editor_in_chief' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_editor_in_chief';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'returned_by_section_head' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'returned_by_section_head';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'returned_by_technical_editor' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'returned_by_technical_editor';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'returned_by_creative_director' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'returned_by_creative_director';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_chief_adviser' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_chief_adviser';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'For Publish' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'For Publish';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Published' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'Published';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Create priority_level enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing enum values if priority_level already exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Low' AND enumtypid = 'priority_level'::regtype) THEN
        ALTER TYPE priority_level ADD VALUE 'Low';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Medium' AND enumtypid = 'priority_level'::regtype) THEN
        ALTER TYPE priority_level ADD VALUE 'Medium';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'High' AND enumtypid = 'priority_level'::regtype) THEN
        ALTER TYPE priority_level ADD VALUE 'High';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Urgent' AND enumtypid = 'priority_level'::regtype) THEN
        ALTER TYPE priority_level ADD VALUE 'Urgent';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Add content column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN content TEXT DEFAULT '';
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column content already exists in projects table';
END $$;

-- Add submission_comments column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN submission_comments TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column submission_comments already exists in projects table';
END $$;

-- Add submitted_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN submitted_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column submitted_by already exists in projects table';
END $$;

-- Add submitted_at column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN submitted_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column submitted_at already exists in projects table';
END $$;

-- Add submitted_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN submitted_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column submitted_date already exists in projects table';
END $$;

-- Add priority_level column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN priority_level priority_level;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column priority_level already exists in projects table';
END $$;

-- Add section_head_approved_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN section_head_approved_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column section_head_approved_by already exists in projects table';
END $$;

-- Add section_head_approved_at column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN section_head_approved_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column section_head_approved_at already exists in projects table';
END $$;

-- Add section_head_approved_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN section_head_approved_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column section_head_approved_date already exists in projects table';
END $$;

-- Add section_head_comments column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN section_head_comments TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column section_head_comments already exists in projects table';
END $$;

-- Add technical_editor_comments column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN technical_editor_comments TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column technical_editor_comments already exists in projects table';
END $$;

-- Add technical_editor_approved_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN technical_editor_approved_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column technical_editor_approved_by already exists in projects table';
END $$;

-- Add technical_editor_approved_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN technical_editor_approved_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column technical_editor_approved_date already exists in projects table';
END $$;

-- Add forward_notes column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN forward_notes TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column forward_notes already exists in projects table';
END $$;

-- Add editor_in_chief_approved_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN editor_in_chief_approved_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column editor_in_chief_approved_by already exists in projects table';
END $$;

-- Add editor_in_chief_approved_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN editor_in_chief_approved_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column editor_in_chief_approved_date already exists in projects table';
END $$;

-- Add forwarded_to_adviser_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN forwarded_to_adviser_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column forwarded_to_adviser_by already exists in projects table';
END $$;

-- Add forwarded_to_adviser_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN forwarded_to_adviser_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column forwarded_to_adviser_date already exists in projects table';
END $$;

-- Add adviser_approved_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN adviser_approved_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column adviser_approved_by already exists in projects table';
END $$;

-- Add adviser_approved_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN adviser_approved_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column adviser_approved_date already exists in projects table';
END $$;

-- Add adviser_comments column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN adviser_comments TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column adviser_comments already exists in projects table';
END $$;

-- Add adviser_returned_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN adviser_returned_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column adviser_returned_by already exists in projects table';
END $$;

-- Add adviser_returned_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN adviser_returned_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column adviser_returned_date already exists in projects table';
END $$;

-- Add adviser_return_comments column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN adviser_return_comments TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column adviser_return_comments already exists in projects table';
END $$;

-- Add adviser_rejected_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN adviser_rejected_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column adviser_rejected_by already exists in projects table';
END $$;

-- Add adviser_rejected_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN adviser_rejected_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column adviser_rejected_date already exists in projects table';
END $$;

-- Add adviser_reject_comments column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN adviser_reject_comments TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column adviser_reject_comments already exists in projects table';
END $$;

-- Add publish_notes column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN publish_notes TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column publish_notes already exists in projects table';
END $$;

-- Add publish_platform column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN publish_platform TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column publish_platform already exists in projects table';
END $$;

-- Add published_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN published_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column published_by already exists in projects table';
END $$;

-- Add published_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN published_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column published_date already exists in projects table';
END $$;

-- Add archived_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN archived_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column archived_by already exists in projects table';
END $$;

-- Add archived_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN archived_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column archived_date already exists in projects table';
END $$;

-- Add archive_notes column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN archive_notes TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column archive_notes already exists in projects table';
END $$;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('content', 'submission_comments', 'submitted_by', 'submitted_at', 'submitted_date', 'priority_level', 'section_head_approved_by', 'section_head_approved_at', 'section_head_approved_date', 'section_head_comments', 'technical_editor_comments', 'technical_editor_approved_by', 'technical_editor_approved_date', 'forward_notes', 'editor_in_chief_approved_by', 'editor_in_chief_approved_date', 'forwarded_to_adviser_by', 'forwarded_to_adviser_date', 'adviser_approved_by', 'adviser_approved_date', 'adviser_comments', 'adviser_returned_by', 'adviser_returned_date', 'adviser_return_comments', 'adviser_rejected_by', 'adviser_rejected_date', 'adviser_reject_comments', 'publish_notes', 'publish_platform', 'published_by', 'published_date', 'archived_by', 'archived_date', 'archive_notes')
ORDER BY column_name;
