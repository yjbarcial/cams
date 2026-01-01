import { supabase } from '@/utils/supabase'

/**
 * Fetch users by role
 * @param {string} role - The role to filter by (e.g., 'writer', 'artist', 'section_head')
 * @returns {Promise<Array>} - Array of user objects
 */
export const getUsersByRole = async (role) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, user_role, department_id')
      .eq('user_role', role)
      .order('email', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error(`Error fetching ${role}s:`, error)
    return []
  }
}

/**
 * Fetch all users with their roles
 * @returns {Promise<Array>} - Array of all users with their roles
 */
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, user_role, department_id')
      .order('email', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

/**
 * Get current user's ID
 * @returns {Promise<string|null>} - Current user's ID or null if not authenticated
 */
export const getCurrentUserId = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id || null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}
