-- Migration: Add Return Tracking Columns to Projects Table
-- Description: Adds columns to track when projects are returned by various approval roles
-- For SectionHead, TechnicalEditor, CreativeDirector, EditorInChief, and ChiefAdviser

-- Add columns for Section Head returns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS returned_by_section_head BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS returned_by_section_head_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS returned_by_section_head_comments TEXT,
ADD COLUMN IF NOT EXISTS returned_by_section_head_user UUID REFERENCES auth.users(id);

-- Add columns for Technical Editor returns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS returned_by_technical_editor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS returned_by_technical_editor_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS returned_by_technical_editor_comments TEXT,
ADD COLUMN IF NOT EXISTS returned_by_technical_editor_user UUID REFERENCES auth.users(id);

-- Add columns for Creative Director returns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS returned_by_creative_director BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS returned_by_creative_director_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS returned_by_creative_director_comments TEXT,
ADD COLUMN IF NOT EXISTS returned_by_creative_director_user UUID REFERENCES auth.users(id);

-- Add columns for Editor-in-Chief returns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS returned_by_editor_in_chief BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS returned_by_editor_in_chief_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS returned_by_editor_in_chief_comments TEXT,
ADD COLUMN IF NOT EXISTS returned_by_editor_in_chief_user UUID REFERENCES auth.users(id);

-- Add columns for Chief Adviser returns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS returned_by_chief_adviser BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS returned_by_chief_adviser_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS returned_by_chief_adviser_comments TEXT,
ADD COLUMN IF NOT EXISTS returned_by_chief_adviser_user UUID REFERENCES auth.users(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_returned_by_section_head ON projects(returned_by_section_head) WHERE returned_by_section_head = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_returned_by_technical_editor ON projects(returned_by_technical_editor) WHERE returned_by_technical_editor = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_returned_by_creative_director ON projects(returned_by_creative_director) WHERE returned_by_creative_director = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_returned_by_editor_in_chief ON projects(returned_by_editor_in_chief) WHERE returned_by_editor_in_chief = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_returned_by_chief_adviser ON projects(returned_by_chief_adviser) WHERE returned_by_chief_adviser = TRUE;

-- Create a comment to document when this was added
COMMENT ON COLUMN projects.returned_by_section_head IS 'Flag indicating project was returned by Section Head for edits';
COMMENT ON COLUMN projects.returned_by_section_head_date IS 'Timestamp when Section Head returned the project';
COMMENT ON COLUMN projects.returned_by_section_head_comments IS 'Comments/reason for return by Section Head';
COMMENT ON COLUMN projects.returned_by_section_head_user IS 'User ID of Section Head who returned the project';

COMMENT ON COLUMN projects.returned_by_technical_editor IS 'Flag indicating project was returned by Technical Editor for edits';
COMMENT ON COLUMN projects.returned_by_technical_editor_date IS 'Timestamp when Technical Editor returned the project';
COMMENT ON COLUMN projects.returned_by_technical_editor_comments IS 'Comments/reason for return by Technical Editor';
COMMENT ON COLUMN projects.returned_by_technical_editor_user IS 'User ID of Technical Editor who returned the project';

COMMENT ON COLUMN projects.returned_by_creative_director IS 'Flag indicating project was returned by Creative Director for edits';
COMMENT ON COLUMN projects.returned_by_creative_director_date IS 'Timestamp when Creative Director returned the project';
COMMENT ON COLUMN projects.returned_by_creative_director_comments IS 'Comments/reason for return by Creative Director';
COMMENT ON COLUMN projects.returned_by_creative_director_user IS 'User ID of Creative Director who returned the project';

COMMENT ON COLUMN projects.returned_by_editor_in_chief IS 'Flag indicating project was returned by Editor-in-Chief for edits';
COMMENT ON COLUMN projects.returned_by_editor_in_chief_date IS 'Timestamp when Editor-in-Chief returned the project';
COMMENT ON COLUMN projects.returned_by_editor_in_chief_comments IS 'Comments/reason for return by Editor-in-Chief';
COMMENT ON COLUMN projects.returned_by_editor_in_chief_user IS 'User ID of Editor-in-Chief who returned the project';

COMMENT ON COLUMN projects.returned_by_chief_adviser IS 'Flag indicating project was returned by Chief Adviser for edits';
COMMENT ON COLUMN projects.returned_by_chief_adviser_date IS 'Timestamp when Chief Adviser returned the project';
COMMENT ON COLUMN projects.returned_by_chief_adviser_comments IS 'Comments/reason for return by Chief Adviser';
COMMENT ON COLUMN projects.returned_by_chief_adviser_user IS 'User ID of Chief Adviser who returned the project';
