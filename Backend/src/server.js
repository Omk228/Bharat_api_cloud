import app from './app.js';
import { ENV } from './config/env.config.js';
import { testDbConnection, dbPool } from './config/db.config.js';
import { initDatabase } from './config/initDb.js';

const PORT = ENV.PORT;

const server = app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🚀 Bharat API Cloud Backend Server`);
  console.log(`📡 Environment: ${ENV.NODE_ENV}`);
  console.log(`🌐 Server URL : http://localhost:${PORT}`);
  console.log(`🔗 API Route  : http://localhost:${PORT}/api/v1`);
  console.log(`🩺 Health API : http://localhost:${PORT}/api/v1/health`);
  console.log('====================================================');

  // Verify Database Connection & Initialize Tables
  const isConnected = await testDbConnection();
  if (isConnected) {
    await initDatabase();
  }
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log(' HTTP Server closed.');
    try {
      await dbPool.end();
      console.log(' MySQL Connection Pool closed.');
      process.exit(0);
    } catch (err) {
      console.error(' Error while closing MySQL pool:', err);
      process.exit(1);
    }
  });

  // Force close after 10s if connections linger
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception thrown:', error);
  process.exit(1);
});
