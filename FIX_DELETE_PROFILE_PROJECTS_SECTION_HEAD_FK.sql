-- Fix profile deletion blocked by projects.section_head_id.
--
-- Effect:
-- When a row in public.profiles is deleted, projects that reference that
-- profile as section_head_id keep the project row and clear section_head_id.
--
-- Run this in Supabase SQL Editor.

ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_section_head_id_fkey;

ALTER TABLE public.projects
ADD CONSTRAINT projects_section_head_id_fkey
FOREIGN KEY (section_head_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

