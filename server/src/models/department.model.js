import { query } from '../config/database.js';

class DepartmentModel {
  static async findAll() {
    const result = await query('SELECT * FROM departments ORDER BY name ASC');
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM departments WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(data) {
    const { name, description } = data;
    const result = await query(
      'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { name, description } = data;
    const result = await query(
      `UPDATE departments 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [name, description, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

export default DepartmentModel;
