import Redis from 'ioredis';
import { ENV } from './env.config.js';

let redisClient = null;
let isRedisConnected = false;

if (ENV.REDIS.ENABLED) {
  try {
    const redisOptions = {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) {
          // Stop retrying quickly to fallback to in-memory gracefully
          return null;
        }
        return Math.min(times * 100, 1000);
      },
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
    };

    if (ENV.REDIS.URL) {
      redisClient = new Redis(ENV.REDIS.URL, redisOptions);
    } else {
      redisClient = new Redis({
        host: ENV.REDIS.HOST,
        port: ENV.REDIS.PORT,
        password: ENV.REDIS.PASSWORD,
        ...redisOptions
      });
    }

    // Connect asynchronously
    redisClient.connect().then(() => {
      isRedisConnected = true;
      console.log(`✅ Redis Connected Successfully on ${ENV.REDIS.HOST}:${ENV.REDIS.PORT}`);
    }).catch((err) => {
      isRedisConnected = false;
      console.log(`ℹ️ Redis Server not detected on port ${ENV.REDIS.PORT} — Activated High-Speed In-Memory Cache Fallback`);
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
    });
  } catch (error) {
    isRedisConnected = false;
    console.log('ℹ️ Redis initialization note: Running in High-Speed In-Memory Cache mode.');
  }
}

export const getRedisClient = () => redisClient;
export const getIsRedisConnected = () => isRedisConnected;

export default {
  getRedisClient,
  getIsRedisConnected
};
