import mysql from 'mysql2/promise';
import { ENV } from './env.config.js';

// Create MySQL Connection Pool
export const dbPool = mysql.createPool({
  host: ENV.DB.HOST,
  port: ENV.DB.PORT,
  user: ENV.DB.USER,
  password: ENV.DB.PASSWORD,
  database: ENV.DB.NAME,
  waitForConnections: true,
  connectionLimit: ENV.DB.CONNECTION_LIMIT,
  queueLimit: 0,
  connectTimeout: 20000,
});

/**
 * Verifies database connection on startup
 * @returns {Promise<boolean>}
 */
export const testDbConnection = async () => {
  try {
    const connection = await dbPool.getConnection();
    console.log(` MySQL Database Connected Successfully to [${ENV.DB.NAME}] on ${ENV.DB.HOST}:${ENV.DB.PORT}`);
    connection.release();
    return true;
  } catch (error) {
    console.warn(`⚠️ MySQL Connection Warning: ${error.message}`);
    console.warn('⚠️ Server will continue running, but DB-dependent endpoints will fail until MySQL is accessible.');
    return false;
  }
};

export default dbPool;
