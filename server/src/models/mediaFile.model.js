import { query } from '../config/database.js';

class MediaFileModel {
  static async findAll(filters = {}) {
    let queryText = 'SELECT * FROM media_files WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.project_id) {
      queryText += ` AND project_id = $${paramCount}`;
      params.push(filters.project_id);
      paramCount++;
    }

    if (filters.task_id) {
      queryText += ` AND task_id = $${paramCount}`;
      params.push(filters.task_id);
      paramCount++;
    }

    if (filters.category) {
      queryText += ` AND category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters.uploaded_by) {
      queryText += ` AND uploaded_by = $${paramCount}`;
      params.push(filters.uploaded_by);
      paramCount++;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM media_files WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(data) {
    const { name, url, mime_type, size, category, project_id, task_id, uploaded_by } = data;
    const result = await query(
      `INSERT INTO media_files (name, url, mime_type, size, category, project_id, task_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, url, mime_type, size, category, project_id, task_id, uploaded_by]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM media_files WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

export default MediaFileModel;
