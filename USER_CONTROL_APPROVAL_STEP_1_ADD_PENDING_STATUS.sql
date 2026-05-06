-- STEP 1 of 2: Add the pending account status.
-- Run this first in Supabase SQL Editor.
-- After it succeeds, run USER_CONTROL_APPROVAL_STEP_2_POLICIES_AND_TRIGGER.sql.

ALTER TYPE public.user_status ADD VALUE IF NOT EXISTS 'pending';
