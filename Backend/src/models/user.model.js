import { dbPool } from '../config/db.config.js';

export const userModel = {
  /**
   * Find a user by their unique email
   * @param {string} email 
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const [rows] = await dbPool.query(
      'SELECT id, name, email, password, role, is_active, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Find a user by ID
   * @param {number|string} id 
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const [rows] = await dbPool.query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Create a new user record
   * @param {object} userData 
   * @returns {Promise<object>}
   */
  async create({ name, email, password, role = 'user' }) {
    const [result] = await dbPool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role]
    );
    return {
      id: result.insertId,
      name,
      email,
      role,
    };
  },

  /**
   * Get all users (with pagination)
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise<Array>}
   */
  async findAll(limit = 10, offset = 0) {
    const [rows] = await dbPool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?',
      [parseInt(limit, 10), parseInt(offset, 10)]
    );
    return rows;
  },
};

export default userModel;
