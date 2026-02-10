import { query } from '../config/database.js';

class TaskModel {
  static async findAll(filters = {}) {
    let queryText = `
      SELECT t.*, 
             CONCAT(cb.first_name, ' ', cb.last_name) as created_by_name,
             CONCAT(at.first_name, ' ', at.last_name) as assigned_to_name,
             p.title as project_title
      FROM tasks t
      LEFT JOIN profiles cb ON t.created_by = cb.id
      LEFT JOIN profiles at ON t.assigned_to = at.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.project_id) {
      queryText += ` AND t.project_id = $${paramCount}`;
      params.push(filters.project_id);
      paramCount++;
    }

    if (filters.assigned_to) {
      queryText += ` AND t.assigned_to = $${paramCount}`;
      params.push(filters.assigned_to);
      paramCount++;
    }

    if (filters.status) {
      queryText += ` AND t.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.priority) {
      queryText += ` AND t.priority = $${paramCount}`;
      params.push(filters.priority);
      paramCount++;
    }

    if (filters.parent_task_id) {
      queryText += ` AND t.parent_task_id = $${paramCount}`;
      params.push(filters.parent_task_id);
      paramCount++;
    }

    queryText += ' ORDER BY t.created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT t.*, 
              CONCAT(cb.first_name, ' ', cb.last_name) as created_by_name,
              CONCAT(at.first_name, ' ', at.last_name) as assigned_to_name,
              p.title as project_title,
              (SELECT json_agg(json_build_object(
                'id', tc.id,
                'content', tc.content,
                'user_name', CONCAT(prof.first_name, ' ', prof.last_name),
                'created_at', tc.created_at
              )) FROM task_comments tc
              LEFT JOIN profiles prof ON tc.user_id = prof.id
              WHERE tc.task_id = t.id
              ORDER BY tc.created_at DESC) as comments
       FROM tasks t
       LEFT JOIN profiles cb ON t.created_by = cb.id
       LEFT JOIN profiles at ON t.assigned_to = at.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { project_id, parent_task_id, title, description, status, priority, due_date, created_by, assigned_to } = data;
    const result = await query(
      `INSERT INTO tasks (project_id, parent_task_id, title, description, status, priority, due_date, created_by, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [project_id, parent_task_id, title, description, status || 'todo', priority, due_date, created_by, assigned_to]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { title, description, status, priority, due_date, assigned_to, completed_at } = data;
    const result = await query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           due_date = COALESCE($5, due_date),
           assigned_to = COALESCE($6, assigned_to),
           completed_at = COALESCE($7, completed_at),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [title, description, status, priority, due_date, assigned_to, completed_at, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async addComment(taskId, userId, content, parentCommentId = null) {
    const result = await query(
      `INSERT INTO task_comments (task_id, user_id, content, parent_comment_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [taskId, userId, content, parentCommentId]
    );
    return result.rows[0];
  }
}

export default TaskModel;
