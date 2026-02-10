import { query } from '../config/database.js';

class NotificationModel {
  static async findAll(userId, filters = {}) {
    let queryText = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [userId];
    let paramCount = 2;

    if (filters.is_read !== undefined) {
      queryText += ` AND is_read = $${paramCount}`;
      params.push(filters.is_read);
      paramCount++;
    }

    if (filters.type) {
      queryText += ` AND type = $${paramCount}`;
      params.push(filters.type);
      paramCount++;
    }

    queryText += ' ORDER BY created_at DESC';

    if (filters.limit) {
      queryText += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await query(queryText, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(data) {
    const { user_id, title, message, type, reference_type } = data;
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, reference_type, is_read)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [user_id, title, message, type, reference_type]
    );
    return result.rows[0];
  }

  static async markAsRead(id) {
    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false
       RETURNING *`,
      [userId]
    );
    return result.rows;
  }

  static async delete(id) {
    const result = await query('DELETE FROM notifications WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async getUnreadCount(userId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

export default NotificationModel;
