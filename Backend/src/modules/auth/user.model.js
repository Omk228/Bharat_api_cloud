import { dbPool } from '../../core/config/db.config.js';

export const userModel = {
  /**
   * Find a user by their unique email
   * @param {string} email 
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const [rows] = await dbPool.query(
      'SELECT id, name, company_name, email, password, plan, role, wallet_balance, onboarded, is_active, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
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
      'SELECT id, name, company_name, email, plan, role, wallet_balance, onboarded, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Create a new client / user record
   * @param {object} userData 
   * @returns {Promise<object>}
   */
  async create({ name, company_name = null, email, password, plan = 'free', role = 'client' }) {
    const initialBalance = 5000.00;
    const [result] = await dbPool.query(
      'INSERT INTO users (name, company_name, email, password, plan, role, wallet_balance, onboarded) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
      [name, company_name, email, password, plan, role, initialBalance]
    );
    const userId = result.insertId;

    // Record welcome bonus transaction
    await dbPool.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, category, description, reference_id)
       VALUES (?, 'credit', ?, ?, 'bonus', 'Welcome Sign-up Bonus', ?)`,
      [userId, initialBalance, initialBalance, `bonus_${userId}_${Date.now()}`]
    );

    return {
      id: userId,
      name,
      company_name,
      email,
      plan,
      role,
      wallet_balance: initialBalance,
      onboarded: true,
    };
  },

  /**
   * Update client profile (name, company_name, plan, onboarded)
   */
  async updateProfile(id, { name, company_name, plan, onboarded = true }) {
    await dbPool.query(
      'UPDATE users SET name = COALESCE(?, name), company_name = COALESCE(?, company_name), plan = COALESCE(?, plan), onboarded = ? WHERE id = ?',
      [name, company_name, plan, onboarded, id]
    );
    return this.findById(id);
  },

  /**
   * Get all clients (with pagination)
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise<Array>}
   */
  async findAll(limit = 10, offset = 0) {
    const [rows] = await dbPool.query(
      'SELECT id, name, company_name, email, plan, role, wallet_balance, onboarded, is_active, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?',
      [parseInt(limit, 10), parseInt(offset, 10)]
    );
    return rows;
  },
};

export default userModel;
