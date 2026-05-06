-- Fix profile deletion blocked by project_members.user_id.
--
-- Effect:
-- When a row in public.profiles is deleted, matching assignment rows in
-- public.project_members are deleted automatically. The projects themselves
-- are not deleted.
--
-- Run this in Supabase SQL Editor.

ALTER TABLE public.project_members
DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;

ALTER TABLE public.project_members
ADD CONSTRAINT project_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

