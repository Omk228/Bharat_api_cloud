import { dbPool } from './db.config.js';

/**
 * Initializes required database tables if they do not exist
 */
export const initDatabase = async () => {
  try {
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        company_name VARCHAR(150) DEFAULT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        plan ENUM('free', 'growth', 'scale') DEFAULT 'free',
        role ENUM('client', 'admin') DEFAULT 'client',
        wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
        onboarded BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createApiCredentialsTableQuery = `
      CREATE TABLE IF NOT EXISTS api_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        api_id VARCHAR(32) NOT NULL UNIQUE,
        api_key VARCHAR(64) NOT NULL UNIQUE,
        token_id VARCHAR(128) NOT NULL,
        token_id_preview VARCHAR(32) NOT NULL,
        environment ENUM('sandbox', 'production') DEFAULT 'sandbox',
        label VARCHAR(100) DEFAULT 'Default Key',
        status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
        rate_limit_per_min INT DEFAULT 120,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_cred_lookup (api_id, api_key, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createApiHitLogsTableQuery = `
      CREATE TABLE IF NOT EXISTS api_hit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        credential_id INT NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        request_id VARCHAR(64) NOT NULL,
        client_ref_num VARCHAR(64) DEFAULT NULL,
        status_code INT NOT NULL,
        result_code INT NOT NULL,
        latency_ms INT NOT NULL,
        client_ip VARCHAR(45) DEFAULT NULL,
        cost DECIMAL(8, 2) DEFAULT 0.00,
        environment ENUM('sandbox', 'production') DEFAULT 'sandbox',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hit_user (user_id, created_at),
        INDEX idx_hit_req (request_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createIpWhitelistTableQuery = `
      CREATE TABLE IF NOT EXISTS ip_whitelist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        label VARCHAR(100) DEFAULT 'Client Server',
        environment ENUM('sandbox', 'production', 'all') DEFAULT 'all',
        status ENUM('active', 'disabled') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createWalletTransactionsTableQuery = `
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('credit', 'debit') NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        balance_after DECIMAL(12, 2) NOT NULL,
        category ENUM('topup', 'api_usage', 'refund', 'bonus') DEFAULT 'api_usage',
        description VARCHAR(255) NOT NULL,
        reference_id VARCHAR(64) DEFAULT NULL,
        status ENUM('pending', 'success', 'rejected') DEFAULT 'success',
        utr_number VARCHAR(64) DEFAULT NULL,
        admin_notes VARCHAR(255) DEFAULT NULL,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_txn_utr (utr_number),
        INDEX idx_txn_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await dbPool.query(createUsersTableQuery);
    await dbPool.query(createApiCredentialsTableQuery);
    await dbPool.query(createApiHitLogsTableQuery);
    await dbPool.query(createIpWhitelistTableQuery);
    await dbPool.query(createWalletTransactionsTableQuery);

    // Safely verify columns on existing wallet_transactions table
    try {
      const [statusCol] = await dbPool.query("SHOW COLUMNS FROM wallet_transactions LIKE 'status'");
      if (!statusCol || statusCol.length === 0) {
        await dbPool.query("ALTER TABLE wallet_transactions ADD COLUMN status ENUM('pending', 'success', 'rejected') DEFAULT 'success'");
      }
      const [utrCol] = await dbPool.query("SHOW COLUMNS FROM wallet_transactions LIKE 'utr_number'");
      if (!utrCol || utrCol.length === 0) {
        await dbPool.query("ALTER TABLE wallet_transactions ADD COLUMN utr_number VARCHAR(64) DEFAULT NULL");
      }
      const [notesCol] = await dbPool.query("SHOW COLUMNS FROM wallet_transactions LIKE 'admin_notes'");
      if (!notesCol || notesCol.length === 0) {
        await dbPool.query("ALTER TABLE wallet_transactions ADD COLUMN admin_notes VARCHAR(255) DEFAULT NULL");
      }
      const [apprCol] = await dbPool.query("SHOW COLUMNS FROM wallet_transactions LIKE 'approved_at'");
      if (!apprCol || apprCol.length === 0) {
        await dbPool.query("ALTER TABLE wallet_transactions ADD COLUMN approved_at TIMESTAMP NULL");
      }
    } catch (migErr) {
      console.warn('Column migration note:', migErr.message);
    }

    console.log('✅ Database tables verified/initialized successfully (users, api_credentials, hit_logs, ip_whitelist, wallet_transactions).');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error.message);
    throw error;
  }
};

export default initDatabase;
