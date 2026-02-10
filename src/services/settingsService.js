// Settings Service
// Storage key: 'user_settings'

const SETTINGS_KEY = 'user_settings'

/**
 * Get default settings
 * @returns {Object} Default settings object
 */
const getDefaultSettings = () => ({
  pushNotifications: true,
  emailNotifications: true,
})

/**
 * Get user settings from localStorage
 * @returns {Object} User settings object
 */
export const getSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const settings = JSON.parse(stored)
      // Merge with defaults to ensure all settings exist
      return { ...getDefaultSettings(), ...settings }
    }
    return getDefaultSettings()
  } catch (error) {
    console.error('Error getting settings:', error)
    return getDefaultSettings()
  }
}

/**
 * Save user settings to localStorage
 * @param {Object} settings - Settings object to save
 * @returns {boolean} Success status
 */
export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }))

    return true
  } catch (error) {
    console.error('Error saving settings:', error)
    return false
  }
}

/**
 * Update a specific setting
 * @param {string} key - Setting key (e.g., 'pushNotifications', 'emailNotifications')
 * @param {boolean} value - Setting value
 * @returns {boolean} Success status
 */
export const updateSetting = (key, value) => {
  try {
    const settings = getSettings()
    settings[key] = value
    return saveSettings(settings)
  } catch (error) {
    console.error('Error updating setting:', error)
    return false
  }
}

/**
 * Check if push notifications are enabled
 * @returns {boolean} True if push notifications are enabled
 */
export const isPushNotificationsEnabled = () => {
  const settings = getSettings()
  return settings.pushNotifications !== false // Default to true
}

/**
 * Check if email notifications are enabled
 * @returns {boolean} True if email notifications are enabled
 */
export const isEmailNotificationsEnabled = () => {
  const settings = getSettings()
  return settings.emailNotifications !== false // Default to true
}
