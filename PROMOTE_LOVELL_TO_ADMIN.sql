-- Promote an existing CAMS profile to System Admin.
-- Run this in Supabase Dashboard -> SQL Editor.

BEGIN;

INSERT INTO public.profiles (
  first_name,
  last_name,
  email,
  role,
  status,
  updated_at
)
VALUES (
  'Lovell Hudson',
  'Clavel',
  'lovellhudson.clavel@carsu.edu.ph',
  'admin',
  'active',
  NOW()
)
ON CONFLICT (email)
DO UPDATE SET
  role = 'admin',
  status = 'active',
  updated_at = NOW();

-- Confirm the profile was updated.
SELECT
  id,
  email,
  role,
  status,
  designation_label,
  positions_label,
  updated_at
FROM public.profiles
WHERE lower(email) = lower('lovellhudson.clavel@carsu.edu.ph');

COMMIT;
