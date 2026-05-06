-- Reset the test account so it cannot access CAMS until admin approval.
-- Run this in Supabase Dashboard -> SQL Editor.

UPDATE public.profiles
SET
  role = 'member',
  status = 'pending',
  designation_label = NULL,
  positions_label = NULL,
  updated_at = NOW()
WHERE lower(email) = lower('altheaguila.gorres@carsu.edu.ph');

SELECT
  id,
  email,
  role,
  status,
  designation_label,
  positions_label,
  updated_at
FROM public.profiles
WHERE lower(email) = lower('altheaguila.gorres@carsu.edu.ph');
