import { dbPool } from '../../core/config/db.config.js';
import { ENV } from '../../core/config/env.config.js';

export const healthService = {
  /**
   * Check overall application and database health
   * @returns {Promise<object>}
   */
  async getHealthStatus() {
    let dbStatus = 'disconnected';
    let dbLatencyMs = null;

    try {
      const startTime = Date.now();
      await dbPool.query('SELECT 1');
      dbLatencyMs = Date.now() - startTime;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = `error: ${error.message}`;
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: ENV.NODE_ENV,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        name: ENV.DB.NAME,
        host: ENV.DB.HOST,
      },
      memoryUsage: {
        rssMb: (process.memoryUsage().rss / (1024 * 1024)).toFixed(2),
        heapUsedMb: (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2),
      },
    };
  },
};

export default healthService;
