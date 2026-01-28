import { query } from '../config/database.js';

class AuditLogModel {
  static async findAll(filters = {}) {
    let queryText = `
      SELECT al.*, 
             CONCAT(p.first_name, ' ', p.last_name) as user_name
      FROM audit_logs al
      LEFT JOIN profiles p ON al.user_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.user_id) {
      queryText += ` AND al.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }

    if (filters.table_name) {
      queryText += ` AND al.table_name = $${paramCount}`;
      params.push(filters.table_name);
      paramCount++;
    }

    if (filters.action) {
      queryText += ` AND al.action = $${paramCount}`;
      params.push(filters.action);
      paramCount++;
    }

    if (filters.start_date) {
      queryText += ` AND al.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      queryText += ` AND al.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    queryText += ' ORDER BY al.created_at DESC';

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
    const result = await query(
      `SELECT al.*, 
              CONCAT(p.first_name, ' ', p.last_name) as user_name
       FROM audit_logs al
       LEFT JOIN profiles p ON al.user_id = p.id
       WHERE al.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent } = data;
    const result = await query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent]
    );
    return result.rows[0];
  }
}

export default AuditLogModel;
