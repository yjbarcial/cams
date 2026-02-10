import { reactive } from 'vue'

// Global reactive state for access denied dialog
// This allows the router to trigger a dialog on the CURRENT page
// instead of navigating to the restricted route and showing a white screen
export const accessDeniedState = reactive({
  show: false,
  requiredRole: '',
  userRole: '',
})

const roleDisplayMap = {
  admin: 'System Administrator',
  editor: 'Editor',
  editor_in_chief: 'Editor-in-Chief',
  chief_adviser: 'Chief Adviser',
  archival_manager: 'Archival Manager',
  technical_editor: 'Technical Editor',
  creative_director: 'Creative Director',
  section_head: 'Section Head',
  member: 'Contributor',
  guest: 'Guest',
}

export function showAccessDenied(requiredRole) {
  const userRole = localStorage.getItem('userRole') || ''
  accessDeniedState.requiredRole = roleDisplayMap[requiredRole] || requiredRole
  accessDeniedState.userRole = roleDisplayMap[userRole] || userRole || 'User'
  accessDeniedState.show = true
}

export function hideAccessDenied() {
  accessDeniedState.show = false
  accessDeniedState.requiredRole = ''
  accessDeniedState.userRole = ''
}
