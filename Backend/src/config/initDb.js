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

    await dbPool.query(createUsersTableQuery);
    console.log('✅ Database tables verified/initialized successfully (users table ready).');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error.message);
    throw error;
  }
};

export default initDatabase;
