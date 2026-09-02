import { dbPool } from '../../core/config/db.config.js';

export const CredentialModel = {
  /**
   * Create new API credentials
   */
  async create({ userId, apiId, apiKey, tokenId, tokenIdPreview, environment = 'sandbox', label = 'Default Key' }) {
    const query = `
      INSERT INTO api_credentials (user_id, api_id, api_key, token_id, token_id_preview, environment, label, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `;
    const [result] = await dbPool.query(query, [userId, apiId, apiKey, tokenId, tokenIdPreview, environment, label]);
    return {
      id: result.insertId,
      user_id: userId,
      api_id: apiId,
      api_key: apiKey,
      token_id: tokenId,
      token_id_preview: tokenIdPreview,
      environment,
      label,
      status: 'active'
    };
  },

  /**
   * Find credentials by user ID
   */
  async findByUserId(userId) {
    const query = `
      SELECT id, user_id, api_id, api_key, token_id, token_id_preview, environment, label, status, created_at, last_used_at
      FROM api_credentials
      WHERE user_id = ? AND status != 'revoked'
      ORDER BY created_at DESC
    `;
    const [rows] = await dbPool.query(query, [userId]);
    return rows;
  },

  /**
   * Find active credential by api_id and api_key
   */
  async findActiveByApiIdAndKey(apiId, apiKey) {
    const query = `
      SELECT c.*, u.wallet_balance, u.plan, u.is_active as user_active
      FROM api_credentials c
      JOIN users u ON c.user_id = u.id
      WHERE c.api_id = ? AND c.api_key = ? AND c.status = 'active'
      LIMIT 1
    `;
    const [rows] = await dbPool.query(query, [apiId, apiKey]);
    return rows[0] || null;
  },

  /**
   * Rotate Token ID for a credential
   */
  async rotateToken(id, userId, newTokenId, newTokenPreview) {
    const query = `
      UPDATE api_credentials
      SET token_id = ?, token_id_preview = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await dbPool.query(query, [newTokenId, newTokenPreview, id, userId]);
    return result.affectedRows > 0;
  },

  /**
   * Update last used timestamp
   */
  async touchLastUsed(id) {
    const query = `UPDATE api_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await dbPool.query(query, [id]);
  },

  /**
   * Revoke credentials
   */
  async revoke(id, userId) {
    const query = `
      UPDATE api_credentials
      SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await dbPool.query(query, [id, userId]);
    return result.affectedRows > 0;
  }
};

export default CredentialModel;
