-- Fix project member assignment blocked by RLS.
--
-- Run this in the Supabase SQL Editor.
-- It allows signed-in users to assign writer/artist project members from Add Project.
-- Admins, section heads, creators, and assigned members can still view/manage rows.
-- This matches the newer approval system where valid accounts are any status
-- except pending/suspended, not only the legacy "active" status.

CREATE OR REPLACE FUNCTION public.is_current_profile_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS '
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(email) = lower(auth.jwt()->>''email'')
      AND lower(role::text) = ''admin''
      AND COALESCE(status::text, ''active'') NOT IN (''pending'', ''suspended'')
  );
';

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS '
  SELECT id
  FROM public.profiles
  WHERE lower(email) = lower(auth.jwt()->>''email'')
    AND COALESCE(status::text, ''active'') NOT IN (''pending'', ''suspended'')
  LIMIT 1;
';

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can insert project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can update project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can delete project members" ON public.project_members;
DROP POLICY IF EXISTS "Approved users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can insert project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can update project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can delete project members" ON public.project_members;

CREATE POLICY "Approved users can view project members"
ON public.project_members
FOR SELECT
TO authenticated
USING (
  public.is_current_profile_admin()
  OR user_id = public.current_profile_id()
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id
      AND (
        p.section_head_id = public.current_profile_id()
        OR p.created_by_profile_id = public.current_profile_id()
        OR p.created_by = public.current_profile_id()
      )
  )
);

CREATE POLICY "Project owners can insert project members"
ON public.project_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "Project owners can update project members"
ON public.project_members
FOR UPDATE
TO authenticated
USING (
  public.is_current_profile_admin()
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id
      AND (
        p.section_head_id = public.current_profile_id()
        OR p.created_by_profile_id = public.current_profile_id()
        OR p.created_by = public.current_profile_id()
      )
  )
)
WITH CHECK (
  public.is_current_profile_admin()
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id
      AND (
        p.section_head_id = public.current_profile_id()
        OR p.created_by_profile_id = public.current_profile_id()
        OR p.created_by = public.current_profile_id()
      )
  )
);

CREATE POLICY "Project owners can delete project members"
ON public.project_members
FOR DELETE
TO authenticated
USING (
  public.is_current_profile_admin()
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_members.project_id
      AND (
        p.section_head_id = public.current_profile_id()
        OR p.created_by_profile_id = public.current_profile_id()
        OR p.created_by = public.current_profile_id()
      )
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_members_id_seq TO authenticated;
