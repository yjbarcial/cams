import { query } from '../config/database.js';

class ArchiveModel {
  static async findAll(filters = {}) {
    let queryText = 'SELECT * FROM archives WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.category) {
      queryText += ` AND category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters.search) {
      queryText += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    queryText += ' ORDER BY created_at DESC';

    if (filters.limit) {
      queryText += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      queryText += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await query(queryText, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM archives WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(data) {
    const { title, description, category, publication_date, file_url, cover_image_url, authors, volume_issue, tags, uploaded_by } = data;
    
    const result = await query(
      `INSERT INTO archives (title, description, category, publication_date, publication_date_iso, file_url, cover_image_url, authors, volume_issue, tags, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [title, description, category, publication_date, publication_date ? new Date(publication_date) : null, file_url, cover_image_url, authors, volume_issue, tags, uploaded_by]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { title, description, category, publication_date, file_url, cover_image_url, authors, volume_issue, tags } = data;
    
    const result = await query(
      `UPDATE archives 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           publication_date = COALESCE($4, publication_date),
           publication_date_iso = COALESCE($5, publication_date_iso),
           file_url = COALESCE($6, file_url),
           cover_image_url = COALESCE($7, cover_image_url),
           authors = COALESCE($8, authors),
           volume_issue = COALESCE($9, volume_issue),
           tags = COALESCE($10, tags),
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [title, description, category, publication_date, publication_date ? new Date(publication_date) : null, file_url, cover_image_url, authors, volume_issue, tags, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM archives WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

export default ArchiveModel;
