# Fix: Admin View "Created By" Display

## Problem

The Admin View was displaying "unknown" in the "Created By" column instead of showing the actual user who created each project.

## Root Cause

1. **No creator tracking**: When projects were created in `AddProjectView.vue`, the `created_by` field was not being populated with the creator's information.

2. **Database schema mismatch**:
   - The `projects.created_by` field stores auth user UUIDs (references `auth.users(id)`)
   - The `profiles` table uses `BIGSERIAL` for its `id` field, not UUID
   - There was no direct foreign key relationship between projects and profiles for the creator

3. **Incorrect join syntax**: AdminView was attempting to join profiles using `profiles!created_by`, which doesn't work because `created_by` is not a foreign key to profiles.

## Solution Implemented

### 1. Database Migration (Required)

Run the SQL migration file: **`ADD_CREATOR_PROFILE_ID.sql`**

This migration:

- Adds a new `created_by_profile_id` column to the projects table
- Creates a proper foreign key relationship: `created_by_profile_id BIGINT REFERENCES profiles(id)`
- Updates existing projects to use `section_head_id` as a reasonable default for historical data
- Creates an index for better query performance

**To apply this migration:**

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `ADD_CREATOR_PROFILE_ID.sql`
4. Run the migration
5. Verify it completed successfully

### 2. Code Changes

#### AddProjectView.vue

- Now retrieves the current user's auth UUID and profile ID when creating a project
- Sets both `created_by` (auth UUID) and `created_by_profile_id` (profile ID) in the project data
- This ensures all new projects have proper creator tracking

#### AdminView.vue

- Updated the Supabase query to join both the creator profile and section head profile
- Uses `creator:profiles!created_by_profile_id` to get the actual creator
- Falls back to `section_head:profiles!section_head_id` if creator is not available
- Maps the creator's full name from first_name + last_name
- Falls back to email or "Unknown" if no profile data is available

## Expected Behavior

### For New Projects (created after this fix)

- The "Created By" column will display the full name of the user who created the project
- Example: "John Doe" or "Jane Smith"

### For Existing Projects (created before this fix)

- After running the migration, they will show the section head as the creator
- This is a reasonable approximation since section heads typically create or manage projects

### Fallback Behavior

- If no creator profile is found, it falls back to section head
- If no section head is found, it displays the email
- If no email is found, it displays "Unknown"

## Testing Checklist

1. **Apply the migration** in Supabase SQL Editor
2. **Create a new project** via AddProjectView:
   - Verify it saves without errors
   - Check that `created_by_profile_id` is populated in the database
3. **View Admin Dashboard**:
   - Verify all projects show a creator name (not "unknown")
   - New projects should show the actual creator
   - Old projects should show the section head
4. **Test the "View Details" dialog**:
   - Click "View Details" on the projects table
   - Verify the "Created By" column displays correctly

## Files Modified

1. `src/views/system/AddProjectView.vue` - Added creator tracking on project creation
2. `src/views/admin/AdminView.vue` - Fixed query and display logic for creator information
3. `ADD_CREATOR_PROFILE_ID.sql` - Database migration to add the new column

## Notes

- The `created_by` field (UUID) is kept for potential future use or audit purposes
- The `created_by_profile_id` field provides the direct link to profiles needed for display
- Historical projects use section_head as creator, which is a reasonable approximation
- Future enhancement: Add a UI to manually correct creator information for historical projects if needed
