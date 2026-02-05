-- Migration: Add is_starred column to projects table
-- Date: 2026-02-06
-- Description: Adds is_starred boolean column to track starred/favorite projects

-- Add is_starred column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'is_starred'
  ) THEN
    ALTER TABLE projects ADD COLUMN is_starred BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN projects.is_starred IS 'Indicates if the project is starred/favorited by users';
  END IF;
END $$;

-- Update existing projects to have is_starred = false if null
UPDATE projects SET is_starred = FALSE WHERE is_starred IS NULL;
