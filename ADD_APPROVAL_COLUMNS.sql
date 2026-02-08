-- Add editor approval tracking columns to projects table
-- Run this in your Supabase SQL Editor

-- Technical Editor approval columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS technical_editor_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS technical_editor_approved_date TIMESTAMP;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS technical_editor_comments TEXT;

-- Creative Director approval columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS creative_director_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS creative_director_approved_date TIMESTAMP;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS creative_director_comments TEXT;

-- Return tracking columns for Technical Editor
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_technical_editor BOOLEAN DEFAULT FALSE;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_technical_editor_date TIMESTAMP;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_technical_editor_comments TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_technical_editor_user UUID REFERENCES auth.users(id);

-- Return tracking columns for Creative Director
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_creative_director BOOLEAN DEFAULT FALSE;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_creative_director_date TIMESTAMP;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_creative_director_comments TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS returned_by_creative_director_user UUID REFERENCES auth.users(id);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name LIKE '%editor%' OR column_name LIKE '%director%'
ORDER BY column_name;
