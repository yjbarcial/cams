import { query } from '../config/database.js';

class ProjectModel {
  static async findAll(filters = {}) {
    let queryText = `
      SELECT p.*, 
             CONCAT(sh.first_name, ' ', sh.last_name) as section_head_name,
             CONCAT(cb.first_name, ' ', cb.last_name) as created_by_name,
             (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id AND pm.is_active = true) as member_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
      FROM projects p
      LEFT JOIN profiles sh ON p.section_head_id = sh.id
      LEFT JOIN profiles cb ON p.created_by = cb.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      queryText += ` AND p.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.project_type) {
      queryText += ` AND p.project_type = $${paramCount}`;
      params.push(filters.project_type);
      paramCount++;
    }

    if (filters.priority) {
      queryText += ` AND p.priority = $${paramCount}`;
      params.push(filters.priority);
      paramCount++;
    }

    if (filters.search) {
      queryText += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    queryText += ' ORDER BY p.created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT p.*, 
              CONCAT(sh.first_name, ' ', sh.last_name) as section_head_name,
              CONCAT(cb.first_name, ' ', cb.last_name) as created_by_name,
              (SELECT json_agg(json_build_object(
                'id', pm.id,
                'user_id', pm.user_id,
                'role', pm.role,
                'user_name', CONCAT(prof.first_name, ' ', prof.last_name)
              )) FROM project_members pm
              LEFT JOIN profiles prof ON pm.user_id = prof.id
              WHERE pm.project_id = p.id AND pm.is_active = true) as members
       FROM projects p
       LEFT JOIN profiles sh ON p.section_head_id = sh.id
       LEFT JOIN profiles cb ON p.created_by = cb.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { title, description, project_type, status, priority, start_date, due_date, section_head_id, created_by } = data;
    const result = await query(
      `INSERT INTO projects (title, description, project_type, status, priority, start_date, due_date, section_head_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, project_type, status || 'draft', priority, start_date, due_date, section_head_id, created_by]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { title, description, project_type, status, priority, start_date, due_date, section_head_id, completed_at } = data;
    const result = await query(
      `UPDATE projects 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           project_type = COALESCE($3, project_type),
           status = COALESCE($4, status),
           priority = COALESCE($5, priority),
           start_date = COALESCE($6, start_date),
           due_date = COALESCE($7, due_date),
           section_head_id = COALESCE($8, section_head_id),
           completed_at = COALESCE($9, completed_at),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [title, description, project_type, status, priority, start_date, due_date, section_head_id, completed_at, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async addMember(projectId, userId, role) {
    const result = await query(
      `INSERT INTO project_members (project_id, user_id, role, joined_at, is_active)
       VALUES ($1, $2, $3, NOW(), true)
       RETURNING *`,
      [projectId, userId, role || 'member']
    );
    return result.rows[0];
  }

  static async removeMember(projectId, userId) {
    const result = await query(
      `UPDATE project_members 
       SET is_active = false, left_at = NOW()
       WHERE project_id = $1 AND user_id = $2
       RETURNING *`,
      [projectId, userId]
    );
    return result.rows[0];
  }
}

export default ProjectModel;
