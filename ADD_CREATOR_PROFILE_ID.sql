-- =====================================================
-- Add created_by_profile_id column to projects table
-- This allows proper tracking of who created each project
-- =====================================================

-- Add created_by_profile_id column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects 
    ADD COLUMN created_by_profile_id BIGINT REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column created_by_profile_id already exists in projects table.';
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by_profile_id 
ON public.projects(created_by_profile_id);

-- Optional: Update existing projects to set created_by_profile_id to section_head_id
-- This provides a reasonable default for historical data
UPDATE public.projects 
SET created_by_profile_id = section_head_id 
WHERE created_by_profile_id IS NULL AND section_head_id IS NOT NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;

SELECT 'Migration completed successfully!' as status;
