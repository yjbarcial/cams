-- STEP 2 of 2: User account approval and access control for CAMS.
-- Run this only after USER_CONTROL_APPROVAL_STEP_1_ADD_PENDING_STATUS.sql succeeds.
-- This file intentionally avoids dollar-quoted strings.

-- New auth signups should create pending profiles, not active members.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
BEGIN
  INSERT INTO public.profiles (
    email,
    first_name,
    last_name,
    avatar_url,
    role,
    status,
    designation_label,
    positions_label
  )
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>''first_name'', NEW.raw_user_meta_data->>''given_name''),
    COALESCE(NEW.raw_user_meta_data->>''last_name'', NEW.raw_user_meta_data->>''family_name''),
    COALESCE(NEW.raw_user_meta_data->>''avatar_url'', NEW.raw_user_meta_data->>''picture''),
    ''member'',
    ''pending'',
    NEW.raw_user_meta_data->>''designation_label'',
    NEW.raw_user_meta_data->>''positions_label''
  )
  ON CONFLICT (email) DO UPDATE
  SET
    first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    role = ''member'',
    status = ''pending'',
    designation_label = EXCLUDED.designation_label,
    positions_label = EXCLUDED.positions_label,
    updated_at = NOW();

  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- Helper used by policies and triggers to identify approved admins.
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
      AND role = ''admin''
      AND status::text NOT IN (''pending'', ''suspended'')
  );
';

-- Non-admins may edit their own basic profile, but not approval/role fields.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_current_profile_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.designation_label IS DISTINCT FROM OLD.designation_label
    OR NEW.positions_label IS DISTINCT FROM OLD.positions_label
  THEN
    RAISE EXCEPTION ''Only approved system administrators can change account approval, roles, designations, or positions.'';
  END IF;

  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;

CREATE TRIGGER prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Replace broad profile update policies with controlled access.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Approved admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;

CREATE POLICY "Approved admins can update any profile"
ON public.profiles
FOR UPDATE
USING (public.is_current_profile_admin())
WITH CHECK (public.is_current_profile_admin());

CREATE POLICY "Users can update own basic profile"
ON public.profiles
FOR UPDATE
USING (lower(email) = lower(auth.jwt()->>'email'))
WITH CHECK (lower(email) = lower(auth.jwt()->>'email'));
