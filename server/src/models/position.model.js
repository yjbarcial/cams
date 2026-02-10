import { query } from '../config/database.js';

class PositionModel {
  static async findAll() {
    const result = await query(
      `SELECT p.*, d.name as department_name 
       FROM positions p
       LEFT JOIN departments d ON p.department_id = d.id
       ORDER BY p.title ASC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT p.*, d.name as department_name 
       FROM positions p
       LEFT JOIN departments d ON p.department_id = d.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByDepartment(departmentId) {
    const result = await query(
      'SELECT * FROM positions WHERE department_id = $1 ORDER BY title ASC',
      [departmentId]
    );
    return result.rows;
  }

  static async create(data) {
    const { title, description, department_id, is_leadership } = data;
    const result = await query(
      'INSERT INTO positions (title, description, department_id, is_leadership) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, department_id, is_leadership || false]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { title, description, department_id, is_leadership } = data;
    const result = await query(
      `UPDATE positions 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           department_id = COALESCE($3, department_id),
           is_leadership = COALESCE($4, is_leadership),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, description, department_id, is_leadership, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM positions WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

export default PositionModel;
