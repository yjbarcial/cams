import { supabase } from '@/utils/supabase'

/**
 * Projects Service - Direct Supabase Access
 */
export const projectsService = {
  // Get all projects with optional filters
  async getAll(filters = {}) {
    let query = supabase.from('projects').select('*')

    if (filters.project_type) {
      query = query.eq('project_type', filters.project_type)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  // Get project by ID
  async getById(id) {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  // Create project
  async create(projectData) {
    const { data, error } = await supabase.from('projects').insert([projectData]).select().single()
    if (error) throw error
    return data
  },

  // Update project
  async update(id, projectData) {
    console.log('📤 Supabase update called with:', { id, projectData })

    const { data, error } = await supabase
      .from('projects')
      .update({ ...projectData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase update error:', error)
      throw error
    }

    console.log('✅ Supabase update successful:', data)
    return data
  },

  // Delete project (with cascading deletes for related data)
  async delete(id) {
    // Delete all related data before deleting the project
    // This handles cases where CASCADE is not set up in the database

    // 1. Delete media files
    const { error: mediaError } = await supabase.from('media_files').delete().eq('project_id', id)

    if (mediaError) {
      console.error('Error deleting media files:', mediaError)
    }

    // 2. Delete project members
    const { error: membersError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', id)

    if (membersError) {
      console.error('Error deleting project members:', membersError)
    }

    // 3. Delete project comments
    const { error: commentsError } = await supabase
      .from('project_comments')
      .delete()
      .eq('project_id', id)

    if (commentsError) {
      console.error('Error deleting project comments:', commentsError)
    }

    // 4. Delete project history
    const { error: historyError } = await supabase
      .from('project_history')
      .delete()
      .eq('project_id', id)

    if (historyError) {
      console.error('Error deleting project history:', historyError)
    }

    // 5. Delete tasks (if table exists)
    const { error: tasksError } = await supabase.from('tasks').delete().eq('project_id', id)

    if (tasksError && tasksError.code !== '42P01') {
      // Ignore if table doesn't exist
      console.error('Error deleting tasks:', tasksError)
    }

    // 6. Finally delete the project itself
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
    return true
  },

  // Add member to project
  async addMember(projectId, memberData) {
    const { data, error } = await supabase
      .from('project_members')
      .insert([{ project_id: projectId, ...memberData }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Get project members
  async getMembers(projectId) {
    const { data, error } = await supabase
      .from('project_members')
      .select('*, profiles(*)')
      .eq('project_id', projectId)
    if (error) throw error
    return data || []
  },
}

/**
 * Archives Service - Direct Supabase Access
 */
export const archivesService = {
  // Get all archives
  async getAll() {
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  // Get archive by ID
  async getById(id) {
    const { data, error } = await supabase.from('archives').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  // Create archive
  async create(archiveData) {
    const { data, error } = await supabase.from('archives').insert([archiveData]).select().single()
    if (error) throw error
    return data
  },

  // Update archive
  async update(id, archiveData) {
    const { data, error } = await supabase
      .from('archives')
      .update({ ...archiveData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Delete archive (admin only - bypasses RLS by setting uploaded_by to null first)
  async delete(id) {
    // First, remove the uploaded_by reference to avoid foreign key issues
    const { error: updateError } = await supabase
      .from('archives')
      .update({ uploaded_by: null })
      .eq('id', id)

    if (updateError) throw updateError

    // Now delete the archive
    const { error } = await supabase.from('archives').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

/**
 * Profiles Service - Direct Supabase Access
 */
export const profilesService = {
  // Get all profiles
  async getAll(filters = {}) {
    let query = supabase.from('profiles').select('*')

    if (filters.role) {
      query = query.eq('role', filters.role)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('last_name')
    if (error) throw error

    // Add full_name computed property to each profile
    return (data || []).map((profile) => ({
      ...profile,
      full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
    }))
  },

  // Get profile by ID
  async getById(id) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  // Get profile by email
  async getByEmail(email) {
    const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Create profile
  async create(profileData) {
    const { data, error } = await supabase.from('profiles').insert([profileData]).select().single()
    if (error) throw error
    return data
  },

  // Update profile
  async update(id, profileData) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...profileData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

/**
 * Tasks Service - Direct Supabase Access
 */
export const tasksService = {
  // Get all tasks with optional filters
  async getAll(filters = {}) {
    let query = supabase.from('tasks').select('*')

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  // Get task by ID
  async getById(id) {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  // Create task
  async create(taskData) {
    const { data, error } = await supabase.from('tasks').insert([taskData]).select().single()
    if (error) throw error
    return data
  },

  // Update task
  async update(id, taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...taskData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Delete task
  async delete(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

/**
 * Project Comments Service - Direct Supabase Access
 */
export const projectCommentsService = {
  // Get all comments for a project
  async getByProjectId(projectId) {
    const { data, error } = await supabase
      .from('project_comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  // Create comment
  async create(commentData) {
    const { data, error } = await supabase
      .from('project_comments')
      .insert([commentData])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Update comment
  async update(id, commentData) {
    const { data, error } = await supabase
      .from('project_comments')
      .update(commentData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Delete comment
  async delete(id) {
    const { error } = await supabase.from('project_comments').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

export default {
  projects: projectsService,
  archives: archivesService,
  profiles: profilesService,
  tasks: tasksService,
  projectComments: projectCommentsService,
}
