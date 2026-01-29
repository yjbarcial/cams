import { query } from '../config/database.js';

class ProfileModel {
  static async findAll(filters = {}) {
    let queryText = `
      SELECT p.*, 
             pos.title as position_title,
             d.name as department_name
      FROM profiles p
      LEFT JOIN positions pos ON p.positions_id = pos.id
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.department_id) {
      queryText += ` AND p.department_id = $${paramCount}`;
      params.push(filters.department_id);
      paramCount++;
    }

    if (filters.role) {
      queryText += ` AND p.role = $${paramCount}`;
      params.push(filters.role);
      paramCount++;
    }

    if (filters.status) {
      queryText += ` AND p.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.search) {
      queryText += ` AND (p.first_name ILIKE $${paramCount} OR p.last_name ILIKE $${paramCount} OR p.email ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    queryText += ' ORDER BY p.last_name, p.first_name ASC';

    const result = await query(queryText, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT p.*, 
              pos.title as position_title,
              d.name as department_name
       FROM profiles p
       LEFT JOIN positions pos ON p.positions_id = pos.id
       LEFT JOIN departments d ON p.department_id = d.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query('SELECT * FROM profiles WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async create(data) {
    const { first_name, last_name, email, avatar_url, bio, phone, positions_id, department_id, role, status } = data;
    const result = await query(
      `INSERT INTO profiles (first_name, last_name, email, avatar_url, bio, phone, positions_id, department_id, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [first_name, last_name, email, avatar_url, bio, phone, positions_id, department_id, role || 'contributor', status || 'active']
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { first_name, last_name, email, avatar_url, bio, phone, positions_id, department_id, role, status } = data;
    const result = await query(
      `UPDATE profiles 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           avatar_url = COALESCE($4, avatar_url),
           bio = COALESCE($5, bio),
           phone = COALESCE($6, phone),
           positions_id = COALESCE($7, positions_id),
           department_id = COALESCE($8, department_id),
           role = COALESCE($9, role),
           status = COALESCE($10, status),
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [first_name, last_name, email, avatar_url, bio, phone, positions_id, department_id, role, status, id]
    );
    return result.rows[0];
  }

  static async updateLastActive(id) {
    const result = await query(
      'UPDATE profiles SET last_active = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM profiles WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

export default ProfileModel;
