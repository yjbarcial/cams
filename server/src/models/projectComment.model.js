/**
 * Project Comment Model
 * Handles database operations for project comments
 */

import pool from '../config/database.js'

/**
 * Get all comments for a project
 */
export const getByProjectId = async (projectId) => {
  const result = await pool.query(
    `SELECT 
      pc.*,
      p.email as user_email,
      p.first_name,
      p.last_name
    FROM project_comments pc
    LEFT JOIN profiles p ON pc.user_id = p.id
    WHERE pc.project_id = $1
    ORDER BY pc.created_at DESC`,
    [projectId]
  )
  return result.rows
}

/**
 * Create a new comment
 */
export const create = async (commentData) => {
  const { project_id, user_id, author, content, is_approved = false } = commentData
  
  const result = await pool.query(
    `INSERT INTO project_comments (project_id, user_id, author, content, is_approved)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [project_id, user_id, author, content, is_approved]
  )
  return result.rows[0]
}

/**
 * Update a comment
 */
export const update = async (id, commentData) => {
  const { content, is_approved } = commentData
  
  const result = await pool.query(
    `UPDATE project_comments 
    SET content = COALESCE($1, content),
        is_approved = COALESCE($2, is_approved),
        updated_at = NOW()
    WHERE id = $3
    RETURNING *`,
    [content, is_approved, id]
  )
  return result.rows[0]
}

/**
 * Delete a comment
 */
export const deleteComment = async (id) => {
  const result = await pool.query(
    'DELETE FROM project_comments WHERE id = $1 RETURNING *',
    [id]
  )
  return result.rows[0]
}

/**
 * Get comment by ID
 */
export const getById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM project_comments WHERE id = $1',
    [id]
  )
  return result.rows[0]
}
