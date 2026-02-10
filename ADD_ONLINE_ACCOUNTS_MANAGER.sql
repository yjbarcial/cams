-- Migration: Add Online Accounts Manager Role
-- Date: 2026-02-09
-- Purpose: Assign Online Accounts Manager designation to Kent Adriane Vinatero

-- =====================================================
-- Update Kent Adriane Vinatero's Profile
-- =====================================================

-- Update Kent's designation_label and role to Online Accounts Manager (editor level)
UPDATE profiles
SET 
  designation_label = 'Online Accounts Manager',
  role = 'editor',
  updated_at = NOW()
WHERE email = 'kentadriane.vinatero@carsu.edu.ph';

-- =====================================================
-- Verification Query
-- =====================================================

-- Verify Kent's profile was updated
SELECT 
  first_name,
  last_name,
  email,
  positions_label,
  designation_label,
  project_member_role,
  role,
  status
FROM profiles
WHERE email = 'kentadriane.vinatero@carsu.edu.ph';

-- =====================================================
-- Notes
-- =====================================================

/*
WHAT THIS MIGRATION DOES:

Updates Kent Adriane Vinatero's profile:
- designation_label: NULL → 'Online Accounts Manager'
- role: 'member' → 'editor' (content administrator level)

WHAT THIS MEANS:

- Kent can now access the Archival Manager view (/archival-manager/:id)
- He can publish "Other" (social media) projects
- Same permissions as Archival Managers but specifically for social media content
- Elevated from 'member' to 'editor' role (content administrator)

FRONTEND CHANGES (already applied):
- autoAddUser.js: Added ONLINE_ACCOUNTS_MANAGER_EMAILS array
- router/index.js: Updated requireArchivalManager guard to accept online_accounts_manager
- ProjectView.vue: Added online_accounts_manager to canEdit check
- Kent is already whitelisted in LoginView.vue

NOTE: The Supabase database uses text columns (designation_label) not a positions table,
so we only need to update the profiles table.
*/
