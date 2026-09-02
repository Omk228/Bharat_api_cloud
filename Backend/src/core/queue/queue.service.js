import { Queue } from 'bullmq';
import { getRedisClient, getIsRedisConnected } from '../config/redis.config.js';
import { processAuditJob } from './audit.worker.js';
import { ENV } from '../config/env.config.js';

let auditQueue = null;

/**
 * Initialize BullMQ Queue
 */
function getAuditQueue() {
  if (auditQueue) return auditQueue;

  if (getIsRedisConnected() && ENV.REDIS.ENABLED) {
    try {
      const redis = getRedisClient();
      auditQueue = new Queue('api-audit-queue', {
        connection: redis,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: 1000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });

      auditQueue.on('error', () => {
        // Suppress background version check errors gracefully
      });
    } catch (err) {
      auditQueue = null;
    }
  }

  return auditQueue;
}

export class QueueService {
  /**
   * Push an API audit & billing job to BullMQ or In-Process Async Queue (<0.8ms)
   * @param {object} jobData
   */
  static async addAuditJob(jobData) {
    const queue = getAuditQueue();

    if (queue && getIsRedisConnected()) {
      try {
        await queue.add('log-and-settle', jobData);
        return true;
      } catch (err) {
        // Fallback to in-process async executor if Redis queue add fails
        setImmediate(() => {
          processAuditJob(jobData).catch(() => {});
        });
        return false;
      }
    }

    // High-speed In-Process non-blocking microtask fallback (Zero Latency Overhead)
    setImmediate(() => {
      processAuditJob(jobData).catch((err) => {
        console.error('❌ [ASYNC LOG ERROR]:', err.message);
      });
    });

    return true;
  }
}

export default QueueService;
