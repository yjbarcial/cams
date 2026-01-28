/**
 * Project History Model
 * Handles database operations for project version history
 */

import pool from '../config/database.js'

/**
 * Get all history entries for a project
 */
export const getByProjectId = async (projectId) => {
  const result = await pool.query(
    `SELECT 
      ph.*,
      p.email as author_email,
      p.first_name as author_first_name,
      p.last_name as author_last_name
    FROM project_history ph
    LEFT JOIN profiles p ON ph.author_id = p.id
    WHERE ph.project_id = $1
    ORDER BY ph.created_at DESC, ph.version_number DESC`,
    [projectId]
  )
  return result.rows
}

/**
 * Create a new history entry
 */
export const create = async (historyData) => {
  const { 
    project_id, 
    version_number, 
    change_description, 
    author_id, 
    project_data,
    metadata = {},
    is_active = true 
  } = historyData
  
  const result = await pool.query(
    `INSERT INTO project_history 
      (project_id, version_number, change_description, author_id, project_data, metadata, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [project_id, version_number, change_description, author_id, project_data, metadata, is_active]
  )
  return result.rows[0]
}

/**
 * Get latest version number for a project
 */
export const getLatestVersion = async (projectId) => {
  const result = await pool.query(
    'SELECT MAX(version_number) as latest_version FROM project_history WHERE project_id = $1',
    [projectId]
  )
  return result.rows[0]?.latest_version || 0
}

/**
 * Get specific version of a project
 */
export const getVersion = async (projectId, versionNumber) => {
  const result = await pool.query(
    `SELECT 
      ph.*,
      p.email as author_email,
      p.first_name as author_first_name,
      p.last_name as author_last_name
    FROM project_history ph
    LEFT JOIN profiles p ON ph.author_id = p.id
    WHERE ph.project_id = $1 AND ph.version_number = $2`,
    [projectId, versionNumber]
  )
  return result.rows[0]
}

/**
 * Restore a project to a specific version
 */
export const restoreVersion = async (projectId, versionNumber) => {
  const version = await getVersion(projectId, versionNumber)
  if (!version) {
    throw new Error('Version not found')
  }
  
  // Update the project with the historical data
  const projectData = version.project_data
  const result = await pool.query(
    `UPDATE projects 
    SET 
      title = $1,
      content = $2,
      status = $3,
      updated_at = NOW()
    WHERE id = $4
    RETURNING *`,
    [projectData.title, projectData.content, projectData.status, projectId]
  )
  
  return result.rows[0]
}

/**
 * Delete history entries older than a certain date
 */
export const deleteOldEntries = async (projectId, beforeDate) => {
  const result = await pool.query(
    'DELETE FROM project_history WHERE project_id = $1 AND created_at < $2 RETURNING *',
    [projectId, beforeDate]
  )
  return result.rows
}

/**
 * Get history statistics for a project
 */
export const getStatistics = async (projectId) => {
  const result = await pool.query(
    `SELECT 
      COUNT(*) as total_versions,
      MAX(version_number) as latest_version,
      MIN(created_at) as first_change,
      MAX(created_at) as last_change,
      COUNT(DISTINCT author_id) as unique_contributors
    FROM project_history 
    WHERE project_id = $1`,
    [projectId]
  )
  return result.rows[0]
}
