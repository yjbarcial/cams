-- Clear User Management profiles while keeping system admin accounts.
-- Run this in Supabase Dashboard -> SQL Editor.
--
-- Effect:
-- - Removes every non-admin row from public.profiles.
-- - Keeps admin profiles so you do not lock yourself out.
-- - Future real registrations will appear again as Pending Approval.
--
-- Important:
-- This does not delete Supabase Auth users. If an existing Auth user is removed
-- from profiles, they cannot enter CAMS until a profile is created/approved again.

DELETE FROM public.profiles
WHERE role IS DISTINCT FROM 'admin';

SELECT
  id,
  email,
  role,
  status
FROM public.profiles
ORDER BY email;
