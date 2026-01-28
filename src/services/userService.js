import { profilesAPI } from './apiService'

/**
 * Fetch users by role
 * @param {string} role - The role to filter by (e.g., 'admin', 'editor', 'section_head', 'member')
 * @returns {Promise<Array>} - Array of user objects
 */
export const getUsersByRole = async (role) => {
  try {
    const response = await profilesAPI.getAll({ role })
    return response.data || []
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
    const response = await profilesAPI.getAll()
    return response.data || []
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
    // First try from localStorage
    const userId = localStorage.getItem('userId')
    if (userId) return userId

    // Otherwise fetch from API
    const response = await profilesAPI.getCurrent()
    return response.data?.id || null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get current user profile
 * @returns {Promise<Object|null>} - Current user's profile or null
 */
export const getCurrentUser = async () => {
  try {
    const response = await profilesAPI.getCurrent()
    return response.data || null
  } catch (error) {
    console.error('Error getting current user profile:', error)
    return null
  }
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - User profile or null
 */
export const getUserById = async (userId) => {
  try {
    const response = await profilesAPI.getById(userId)
    return response.data || null
  } catch (error) {
    console.error('Error getting user by ID:', error)
    return null
  }
}

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object|null>} - Updated profile or null
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await profilesAPI.update(userId, profileData)
    return response.data || null
  } catch (error) {
    console.error('Error updating user profile:', error)
    return null
  }
}
