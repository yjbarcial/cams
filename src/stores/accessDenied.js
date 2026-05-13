import { reactive } from 'vue'

// Global reactive state for access denied dialog
// This allows the router to trigger a dialog on the CURRENT page
// instead of navigating to the restricted route and showing a white screen
export const accessDeniedState = reactive({
  show: false,
  requiredRole: '',
  userRole: '',
  message: '',
  hint: '',
  actionLabel: '',
  actionTo: '',
})

const roleDisplayMap = {
  admin: 'System Administrator',
  editor: 'Editor',
  editor_in_chief: 'Editor-in-Chief',
  chief_adviser: 'Chief Adviser',
  archival_manager: 'Archival Manager',
  assigned_member: 'Assigned Project Member',
  technical_editor: 'Technical Editor',
  creative_director: 'Creative Director',
  section_head: 'Section Head',
  member: 'Contributor',
  guest: 'Guest',
  admin_view: 'Admin View',
}

export function showAccessDenied(requiredRole, options = {}) {
  const userRole = localStorage.getItem('userRole') || ''
  accessDeniedState.requiredRole = roleDisplayMap[requiredRole] || requiredRole
  accessDeniedState.userRole = roleDisplayMap[userRole] || userRole || 'User'
  accessDeniedState.message = options.message || ''
  accessDeniedState.hint = options.hint || ''
  accessDeniedState.actionLabel = options.actionLabel || ''
  accessDeniedState.actionTo = options.actionTo || ''
  accessDeniedState.show = true
}

export function hideAccessDenied() {
  accessDeniedState.show = false
  accessDeniedState.requiredRole = ''
  accessDeniedState.userRole = ''
  accessDeniedState.message = ''
  accessDeniedState.hint = ''
  accessDeniedState.actionLabel = ''
  accessDeniedState.actionTo = ''
}
