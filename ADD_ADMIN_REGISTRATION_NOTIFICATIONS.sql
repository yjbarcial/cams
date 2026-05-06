-- Admin notifications for newly registered users waiting for approval.
--
-- Run this in Supabase SQL Editor.
-- This creates a shared database-backed notification whenever a profile is
-- inserted with status = 'pending'. Admins can then see it from any browser.

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'Account',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  profile_id BIGINT REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_email TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view admin notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.email = auth.email()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update admin notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update admin notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.email = auth.email()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.email = auth.email()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete admin notifications" ON public.admin_notifications;
CREATE POLICY "Admins can delete admin notifications"
ON public.admin_notifications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.email = auth.email()
      AND p.role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.notify_admin_new_pending_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM public.admin_notifications n
      WHERE n.profile_id = NEW.id
        AND n.type = 'Account'
    )
  THEN
    INSERT INTO public.admin_notifications (
      type,
      title,
      message,
      profile_id,
      profile_email
    )
    VALUES (
      'Account',
      'New Account Pending Approval',
      COALESCE(NEW.email, 'A new user') || ' registered and is waiting for admin approval.',
      NEW.id,
      NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_admin_new_pending_profile ON public.profiles;
CREATE TRIGGER trg_notify_admin_new_pending_profile
AFTER INSERT OR UPDATE OF status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_pending_profile();
