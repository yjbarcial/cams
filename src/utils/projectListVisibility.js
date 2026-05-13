const ADMIN_ONLY = 'admin'
const NO_PROJECTS = 'none'
const ASSIGNED_MEMBER = 'assigned_member'
const ASSIGNED_SECTION_HEAD = 'assigned_section_head'
const WORKFLOW_STATUS = 'workflow_status'

const STATUS_BY_WORKFLOW_ROLE = {
  technical_editor: ['to_technical_editor'],
  creative_director: ['to_creative_director'],
  editor_in_chief: ['to_editor_in_chief'],
  chief_adviser: ['to_chief_adviser'],
}

const normalizeStatus = (status) =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase()

const normalizeRole = (role) =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const STATUS_QUERY_VALUES = {
  for_publish: ['For Publish'],
}

const getStatusQueryValues = (statuses) => {
  const values = new Set()

  statuses.forEach((status) => {
    const queryValues = STATUS_QUERY_VALUES[status] || [status]
    queryValues.forEach((queryValue) => values.add(queryValue))
  })

  return [...values]
}

const isAdminEmail = (email, adminEmails) => {
  const normalizedEmail = normalizeEmail(email)
  return adminEmails.some((adminEmail) => normalizeEmail(adminEmail) === normalizedEmail)
}

export const getProjectListUserContext = (adminEmails = []) => {
  const userRole = normalizeRole(localStorage.getItem('userRole'))
  const accessRole = normalizeRole(localStorage.getItem('accessRole'))
  const userId = localStorage.getItem('userId') || ''
  const userEmail = localStorage.getItem('userEmail') || ''

  return {
    userRole,
    accessRole,
    userId,
    userEmail,
    isAdmin: userRole === 'admin' || isAdminEmail(userEmail, adminEmails),
  }
}

export const getProjectMembersSelect = (context, projectType) => {
  const rule = getVisibilityRule(context, projectType)
  return rule.type === ASSIGNED_MEMBER
    ? 'project_members!inner(user_id, role)'
    : 'project_members(user_id, role)'
}

export const getVisibilityRule = (context) => {
  if (!context) return { type: NO_PROJECTS }
  if (context.isAdmin) return { type: ADMIN_ONLY }

  const { userRole, accessRole, userId } = context

  if ((accessRole === 'section_head' || userRole === 'section_head') && userId) {
    return { type: ASSIGNED_SECTION_HEAD }
  }

  if (userRole === 'member' && accessRole === 'member' && userId) {
    return { type: ASSIGNED_MEMBER, statuses: ['draft'] }
  }

  if (accessRole === 'archival_manager') {
    return { type: NO_PROJECTS }
  }

  if (accessRole === 'online_accounts_manager') {
    return { type: NO_PROJECTS }
  }

  const workflowStatuses = STATUS_BY_WORKFLOW_ROLE[accessRole]
  if (workflowStatuses) {
    return { type: WORKFLOW_STATUS, statuses: workflowStatuses }
  }

  return { type: NO_PROJECTS }
}

export const applyProjectListVisibility = (query, context, projectType) => {
  const rule = getVisibilityRule(context, projectType)

  if (rule.type === ADMIN_ONLY) {
    return query
  }

  if (rule.type === NO_PROJECTS) {
    return query.eq('id', -1)
  }

  if (rule.type === ASSIGNED_SECTION_HEAD) {
    return query.eq('section_head_id', context.userId)
  }

  if (rule.type === ASSIGNED_MEMBER) {
    return query
      .eq('project_members.user_id', context.userId)
      .in('status', getStatusQueryValues(rule.statuses))
  }

  if (rule.type === WORKFLOW_STATUS) {
    return query.in('status', getStatusQueryValues(rule.statuses))
  }

  return query.eq('id', -1)
}

export const isProjectVisibleToCurrentUser = (project, context, projectType) => {
  const rule = getVisibilityRule(context, projectType)

  if (rule.type === ADMIN_ONLY) return true
  if (rule.type === NO_PROJECTS) return false

  if (rule.type === ASSIGNED_SECTION_HEAD) {
    return String(project.section_head_id || project.sectionHeadId || '') === String(context.userId)
  }

  if (rule.type === ASSIGNED_MEMBER) {
    const memberIds = (project.project_members || project.memberIds || []).map((member) =>
      typeof member === 'object' ? member.user_id : member,
    )
    return (
      memberIds.some((memberId) => String(memberId) === String(context.userId)) &&
      rule.statuses.includes(normalizeStatus(project.status))
    )
  }

  if (rule.type === WORKFLOW_STATUS) {
    return rule.statuses.includes(normalizeStatus(project.status))
  }

  return false
}

export const filterProjectsForCurrentUser = (projects, context, projectType) => {
  return (projects || []).filter((project) =>
    isProjectVisibleToCurrentUser(project, context, projectType),
  )
}
