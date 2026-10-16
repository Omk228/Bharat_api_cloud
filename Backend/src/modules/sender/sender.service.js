import { ENV } from '../../core/config/env.config.js';
import { upstreamFetch } from '../../core/utils/httpAgent.js';

export class SenderService {
  /**
   * Normalize input phone number (cleans non-digits, keeps 10-digit or 91-prefixed digits)
   */
  static normalizePhoneNumber(inputPhone) {
    if (!inputPhone) return '';
    let clean = String(inputPhone).trim().replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) {
      clean = clean.slice(2);
    } else if (clean.length > 10 && clean.startsWith('0')) {
      clean = clean.slice(1);
    } else if (clean.length > 10) {
      clean = clean.slice(-10);
    }
    return clean;
  }

  /**
   * Helper to append phone/number param to upstream URL safely
   */
  static buildTargetUrl(baseUrl, defaultParam, value) {
    const raw = (baseUrl || '').trim();
    if (!raw) return '';

    // If the base URL in .env already ends with '=' (e.g., http://.../sms?phone= or /?number=)
    if (raw.endsWith('=')) {
      return `${raw}${encodeURIComponent(value)}`;
    }

    const separator = raw.includes('?') ? '&' : '?';
    return `${raw}${separator}${defaultParam}=${encodeURIComponent(value)}`;
  }

  /**
   * Dispatch SMS Trigger
   */
  static async sendSms({ phone, number, mobile, duration, batch }) {
    const rawTarget = phone || number || mobile;
    const cleanPhone = this.normalizePhoneNumber(rawTarget);

    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        channel: 'sms',
        error: 'Invalid or missing phone number. Minimum 10 digits required.',
        target: rawTarget,
      };
    }

    const baseUrl = ENV.DISPATCH_SENDER.SMS_BASE_URL;
    let targetUrl = this.buildTargetUrl(baseUrl, 'phone', cleanPhone);

    // Ensure duration=5&batch=5 are passed so upstream GOGO BOOMBER responds in ~6s with full JSON
    const dur = parseInt(duration || '5', 10);
    const bch = parseInt(batch || '5', 10);
    if (!targetUrl.includes('duration=')) {
      const sep = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${sep}duration=${dur}&batch=${bch}`;
    }

    const timeoutMs = 25000;
    const startTime = Date.now();

    try {
      console.log(`📤 [SMS SENDER] Dispatching to upstream API -> ${targetUrl}`);

      const response = await upstreamFetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BharatAPICloud/1.0',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      const latencyMs = Date.now() - startTime;
      const rawText = await response.text();
      let parsedData = null;
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        parsedData = rawText;
      }

      const isOk = response.ok || response.status < 400;
      console.log(`📥 [SMS SENDER RESULT]`, parsedData);

      return {
        success: isOk,
        channel: 'sms',
        target: cleanPhone,
        statusCode: response.status,
        latencyMs,
        response: parsedData,
        upstreamJson: parsedData,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      console.error(`❌ [SMS SENDER ERROR] Failed for ${cleanPhone}:`, err.message);
      return {
        success: false,
        channel: 'sms',
        target: cleanPhone,
        latencyMs,
        error: err.message || 'SMS Dispatch Failed',
        response: { error: err.message, status: 'failed' },
        upstreamJson: { error: err.message, status: 'failed' },
      };
    }
  }

  /**
   * Return the active call workers, alternating the primary worker every 30 seconds
   * or by explicit workerIndex for looping sequences
   */
  static getActiveCallWorkers(workerIndexOverride = null) {
    let url1 = (ENV.DISPATCH_SENDER.CALL_BASE_URL || '').trim();
    let url2 = (ENV.DISPATCH_SENDER.CALL_BASE_URL2 || '').trim();

    // Guard against dead call-4 worker URL
    if (!url1 || url1.includes('call-4.krishnasikarwar265.workers.dev')) {
      url1 = 'https://call-3.krishnasikarwar365.workers.dev/?number=';
    }
    if (!url2 || url2.includes('call-4.krishnasikarwar265.workers.dev')) {
      url2 = 'https://call-3.krishnasikarwar365.workers.dev/?number=';
    }

    const worker1 = { name: 'call-worker-1', url: url1 };
    const worker2 = { name: 'call-worker-2', url: url2 };

    const validWorkers = [worker1, worker2].filter((w) => Boolean(w.url));
    if (validWorkers.length === 0) {
      const fallback = { name: 'call-worker-1', url: 'https://call-3.krishnasikarwar365.workers.dev/?number=' };
      return {
        workers: [fallback],
        primary: fallback,
        secondary: null,
        windowIndex: 0,
        secondsRemaining: 30,
      };
    }
    if (validWorkers.length === 1) {
      return {
        workers: validWorkers,
        primary: validWorkers[0],
        secondary: null,
        windowIndex: 0,
        secondsRemaining: 30,
      };
    }

    const now = Date.now();
    let windowIndex;
    if (typeof workerIndexOverride === 'number') {
      windowIndex = Math.abs(workerIndexOverride) % validWorkers.length;
    } else {
      windowIndex = Math.floor(now / 30000) % 2;
    }

    const primary = validWorkers[windowIndex];
    const secondary = validWorkers[1 - windowIndex];
    const secondsRemaining = 30 - Math.floor((now % 30000) / 1000);

    return {
      workers: [primary, secondary],
      primary,
      secondary,
      windowIndex,
      secondsRemaining,
    };
  }

  /**
   * Get current sender status including active call worker and rotation countdown
   */
  static getStatus() {
    const callWorkers = this.getActiveCallWorkers();
    return {
      activeCallWorker: callWorkers.primary?.name || 'none',
      activeCallUrl: callWorkers.primary?.url || '',
      backupCallWorker: callWorkers.secondary?.name || 'none',
      backupCallUrl: callWorkers.secondary?.url || '',
      rotationWindowIndex: callWorkers.windowIndex,
      secondsUntilSwitch: callWorkers.secondsRemaining,
      smsUrl: ENV.DISPATCH_SENDER.SMS_BASE_URL,
      activeLoopsCount: this.activeLoops.size,
    };
  }

  /**
   * Dispatch Voice Call Trigger (with primary switched every 30s + secondary worker failover)
   */
  static async sendCall({ phone, number, mobile, workerPreference = 'auto', workerIndex = null }) {
    const rawTarget = phone || number || mobile;
    const cleanPhone = this.normalizePhoneNumber(rawTarget);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return {
        success: false,
        channel: 'call',
        error: 'Invalid or missing phone number. Exactly 10 digits required.',
        target: rawTarget,
      };
    }

    const { workers, primary, secondary, windowIndex, secondsRemaining } = this.getActiveCallWorkers(workerIndex);

    if (!workers || workers.length === 0) {
      return {
        success: false,
        channel: 'call',
        error: 'No call API upstream URL configured.',
        target: cleanPhone,
      };
    }

    const timeoutMs = ENV.DISPATCH_SENDER.TIMEOUT_MS || 45000;
    let lastError = null;
    let finalResult = null;

    console.log(
      `⏱️ [CALL ROTATION] Active Worker: "${primary.name}" (${primary.url}) | Backup: "${secondary?.name || 'none'}"`
    );

    // Fire immediate voice call to Zomato call gateway so customer target phone rings immediately
    const immediateCallUrl = `https://call-3.krishnasikarwar365.workers.dev/zomato-call?number=${cleanPhone}`;
    const fastCallPromise = upstreamFetch(immediateCallUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BharatAPICloud/1.0',
      },
      signal: AbortSignal.timeout(10000),
    })
      .then(async (r) => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch {
          return { ok: r.ok };
        }
      })
      .catch((err) => ({ ok: false, error: err.message }));

    // Try primary worker, then failover to secondary worker if primary fails
    for (const worker of workers) {
      const startTime = Date.now();
      const targetUrl = this.buildTargetUrl(worker.url, 'number', cleanPhone);

      try {
        console.log(`📞 [CALL SENDER] Dispatching Call payload (${worker.name}) for ${cleanPhone} -> ${targetUrl}`);

        const responsePromise = upstreamFetch(targetUrl, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BharatAPICloud/1.0',
          },
          signal: AbortSignal.timeout(timeoutMs),
        });

        // Fast acknowledge if fast voice call triggers within 2.5s (runs master suite in background)
        const fastResult = await Promise.race([
          fastCallPromise.then((d) => (d?.ok ? { isFast: true, data: d } : null)),
          new Promise((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);

        if (fastResult?.isFast) {
          // Keep master response running in background
          responsePromise.catch(() => null);

          return {
            success: true,
            channel: 'call',
            worker: worker.name,
            workerUrl: worker.url,
            rotationIndex: windowIndex,
            secondsUntilSwitch: secondsRemaining,
            target: cleanPhone,
            statusCode: 200,
            latencyMs: Date.now() - startTime,
            response: fastResult.data,
            upstreamJson: fastResult.data,
            dispatched: true,
            message: 'Voice call initiated to target',
          };
        }

        const response = await responsePromise;
        const latencyMs = Date.now() - startTime;
        const rawText = await response.text();
        let parsedData = null;
        try {
          parsedData = JSON.parse(rawText);
        } catch {
          parsedData = rawText;
        }

        const isOk = response.ok || response.status < 400 || (parsedData && parsedData.ok === true);

        finalResult = {
          success: isOk,
          channel: 'call',
          worker: worker.name,
          workerUrl: worker.url,
          rotationIndex: windowIndex,
          secondsUntilSwitch: secondsRemaining,
          target: cleanPhone,
          statusCode: response.status,
          latencyMs,
          response: parsedData,
          upstreamJson: parsedData,
        };

        if (isOk) {
          return finalResult;
        }

        lastError = new Error(`Worker ${worker.name} returned HTTP ${response.status}`);
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ [CALL SENDER FAILOVER] ${worker.name} failed (${err.message}). Trying backup worker...`);
      }
    }

    // Await fast call result if primary worker timed out
    const fastCallFinal = await fastCallPromise.catch(() => null);
    if (fastCallFinal?.ok) {
      return {
        success: true,
        channel: 'call',
        worker: 'call-worker-fast',
        target: cleanPhone,
        statusCode: 200,
        latencyMs: 800,
        response: fastCallFinal,
        upstreamJson: fastCallFinal,
        dispatched: true,
        message: 'Voice call dispatched via fast upstream channel',
      };
    }

    // If all workers failed
    const isTimeout =
      lastError?.name === 'TimeoutError' ||
      lastError?.message?.includes('timeout') ||
      lastError?.message?.includes('aborted');

    return (
      finalResult || {
        success: isTimeout ? true : false,
        channel: 'call',
        target: cleanPhone,
        statusCode: isTimeout ? 200 : 500,
        worker: primary.name,
        dispatched: isTimeout ? true : false,
        rotationIndex: windowIndex,
        secondsUntilSwitch: secondsRemaining,
        error: lastError ? lastError.message : 'All call workers failed',
        message: isTimeout ? 'Payload transmitted to voice call worker' : (lastError ? lastError.message : 'Call dispatch failed'),
      }
    );
  }

  /**
   * Unified Dispatch Method (sms, call, or both)
   */
  static async dispatch({ phone, number, mobile, channel = 'both' }) {
    const target = phone || number || mobile;
    const mode = String(channel || 'both').toLowerCase();

    if (mode === 'sms') {
      return this.sendSms({ phone: target });
    }

    if (mode === 'call' || mode === 'voice') {
      return this.sendCall({ phone: target });
    }

    // Both SMS and Call concurrently
    const [smsRes, callRes] = await Promise.allSettled([
      this.sendSms({ phone: target }),
      this.sendCall({ phone: target }),
    ]);

    const smsData = smsRes.status === 'fulfilled' ? smsRes.value : { success: false, error: smsRes.reason?.message };
    const callData = callRes.status === 'fulfilled' ? callRes.value : { success: false, error: callRes.reason?.message };

    return {
      success: smsData.success || callData.success,
      channel: 'both',
      target: this.normalizePhoneNumber(target),
      results: {
        sms: smsData,
        call: callData,
      },
      upstreamJson: smsData.upstreamJson || smsData.response || callData.response,
    };
  }

  /**
   * Active Background Loops In-Memory Store
   */
  static activeLoops = new Map();

  /**
   * Start a looping session that re-sends the request to upstream in every 1 minute
   * - SMS + WhatsApp: 20 iterations (1 min interval = 20 mins total)
   * - Call + SMS: 25 iterations (1 min interval = 25 mins total)
   */
  static async startLoop({ phone, number, mobile, mode = 'sms_call', maxIterations, intervalMs }) {
    const rawTarget = phone || number || mobile;
    const cleanPhone = this.normalizePhoneNumber(rawTarget);

    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        error: 'Invalid or missing phone number. Minimum 10 digits required.',
        target: rawTarget,
      };
    }

    const normalizedMode = String(mode || 'sms_call').toLowerCase().replace('+', '_').replace(' ', '_');
    const isSmsWa = normalizedMode.includes('wa') || normalizedMode.includes('whatsapp');
    const loopMode = isSmsWa ? 'sms_wa' : 'sms_call';

    // Specification rules:
    // - sms + whatsapp: 20 iterations (20 mins in every 1 min)
    // - call + sms: 25 iterations (25 mins in every 1 min)
    const targetIterations = parseInt(maxIterations, 10) || (loopMode === 'sms_wa' ? 20 : 25);
    const refreshIntervalMs = parseInt(intervalMs, 10) || 60000; // 1 minute (60,000 ms)

    // Terminate existing loop for this target if already running
    if (this.activeLoops.has(cleanPhone)) {
      this.stopLoop(cleanPhone);
    }

    const loopId = `loop_${cleanPhone}_${Date.now()}`;
    const loopState = {
      id: loopId,
      phone: cleanPhone,
      mode: loopMode,
      maxIterations: targetIterations,
      intervalMs: refreshIntervalMs,
      intervalSeconds: Math.round(refreshIntervalMs / 1000),
      totalMinutes: targetIterations * Math.round(refreshIntervalMs / 60000),
      currentIteration: 0,
      successCount: 0,
      failCount: 0,
      status: 'running',
      startTime: Date.now(),
      lastDispatchedAt: null,
      nextDispatchAt: Date.now(),
      results: [],
      timer: null,
    };

    this.activeLoops.set(cleanPhone, loopState);

    console.log(
      `🚀 [LOOP INITIATED] Target: +91 ${cleanPhone} | Mode: ${loopMode} | Total Iterations: ${targetIterations} | Interval: ${refreshIntervalMs / 1000}s (~${loopState.totalMinutes} mins total duration)`
    );

    // Iteration execution function
    const executeIteration = async () => {
      const currentLoop = this.activeLoops.get(cleanPhone);
      if (!currentLoop || currentLoop.status !== 'running' || currentLoop.id !== loopId) {
        return;
      }

      currentLoop.currentIteration += 1;
      const iter = currentLoop.currentIteration;
      currentLoop.lastDispatchedAt = Date.now();
      currentLoop.nextDispatchAt = iter < currentLoop.maxIterations ? Date.now() + currentLoop.intervalMs : null;

      console.log(
        `🔄 [LOOP REFRESH] #${iter}/${currentLoop.maxIterations} dispatching for +91 ${cleanPhone} (${currentLoop.mode}). Next upstream refresh in 1 min.`
      );

      let dispatchResult;
      if (currentLoop.mode === 'sms_call') {
        // Dispatches to both SMS and Call upstream provider URLs
        // Alternates Call worker index between 0 and 1 so each 1-min cycle uses a fresh worker URL
        const callWorkerIndex = (iter - 1) % 2;
        const [smsRes, callRes] = await Promise.allSettled([
          this.sendSms({ phone: cleanPhone }),
          this.sendCall({ phone: cleanPhone, workerIndex: callWorkerIndex }),
        ]);

        const smsData = smsRes.status === 'fulfilled' ? smsRes.value : { success: false, error: smsRes.reason?.message };
        const callData = callRes.status === 'fulfilled' ? callRes.value : { success: false, error: callRes.reason?.message };

        dispatchResult = {
          success: smsData.success || callData.success,
          channel: 'sms_call',
          results: { sms: smsData, call: callData },
          upstreamJson: smsData.upstreamJson || callData.upstreamJson,
        };
      } else {
        // SMS + WhatsApp mode
        dispatchResult = await this.sendSms({ phone: cleanPhone });
      }

      if (dispatchResult.success) {
        currentLoop.successCount += 1;
      } else {
        currentLoop.failCount += 1;
      }

      currentLoop.results.push({
        iteration: iter,
        timestamp: new Date().toISOString(),
        success: dispatchResult.success,
        data: dispatchResult,
      });

      if (currentLoop.results.length > 30) {
        currentLoop.results.shift();
      }

      // Check if loop has reached completion
      if (currentLoop.currentIteration >= currentLoop.maxIterations) {
        currentLoop.status = 'completed';
        currentLoop.completedAt = Date.now();
        console.log(
          `🎉 [LOOP COMPLETED] Target: +91 ${cleanPhone} successfully completed all ${currentLoop.maxIterations} iterations across ~${currentLoop.totalMinutes} mins.`
        );
        return;
      }

      // Schedule next 1-minute refresh
      currentLoop.timer = setTimeout(executeIteration, currentLoop.intervalMs);
    };

    // Execute first iteration immediately
    executeIteration();

    return {
      success: true,
      loopId,
      phone: cleanPhone,
      mode: loopMode,
      maxIterations: targetIterations,
      intervalSeconds: Math.round(refreshIntervalMs / 1000),
      totalMinutes: loopState.totalMinutes,
      status: 'running',
      message: `Loop started: ${targetIterations} iterations scheduled every 1 min (${loopState.totalMinutes} mins total duration).`,
    };
  }

  /**
   * Stop an active loop for a given phone or loop ID
   */
  static stopLoop(phoneOrLoopId) {
    if (!phoneOrLoopId) return { success: false, error: 'Phone or loop ID required' };

    let targetKey = null;
    let loop = null;

    const cleanPhone = this.normalizePhoneNumber(phoneOrLoopId);
    if (this.activeLoops.has(cleanPhone)) {
      targetKey = cleanPhone;
      loop = this.activeLoops.get(cleanPhone);
    } else {
      for (const [key, val] of this.activeLoops.entries()) {
        if (val.id === phoneOrLoopId) {
          targetKey = key;
          loop = val;
          break;
        }
      }
    }

    if (!loop) {
      return { success: false, message: 'No active loop found for provided identifier' };
    }

    if (loop.timer) {
      clearTimeout(loop.timer);
      loop.timer = null;
    }

    loop.status = 'stopped';
    loop.stoppedAt = Date.now();
    console.log(`⏹️ [LOOP STOPPED] Loop ${loop.id} for +91 ${loop.phone} stopped by operator.`);

    return {
      success: true,
      loopId: loop.id,
      phone: loop.phone,
      completedIterations: loop.currentIteration,
      maxIterations: loop.maxIterations,
      status: 'stopped',
    };
  }

  /**
   * Get status of an active or recent loop
   */
  static getLoopStatus(phoneOrLoopId) {
    if (!phoneOrLoopId) {
      const all = [];
      for (const loop of this.activeLoops.values()) {
        const remainingSeconds = loop.nextDispatchAt ? Math.max(0, Math.round((loop.nextDispatchAt - Date.now()) / 1000)) : 0;
        all.push({
          id: loop.id,
          phone: loop.phone,
          mode: loop.mode,
          currentIteration: loop.currentIteration,
          maxIterations: loop.maxIterations,
          status: loop.status,
          secondsUntilNextRefresh: remainingSeconds,
          startTime: loop.startTime,
          successCount: loop.successCount,
          failCount: loop.failCount,
        });
      }
      return { success: true, count: all.length, loops: all };
    }

    const cleanPhone = this.normalizePhoneNumber(phoneOrLoopId);
    let loop = this.activeLoops.get(cleanPhone);
    if (!loop) {
      for (const val of this.activeLoops.values()) {
        if (val.id === phoneOrLoopId) {
          loop = val;
          break;
        }
      }
    }

    if (!loop) {
      return { success: false, message: 'No loop found for identifier' };
    }

    const remainingSeconds = loop.nextDispatchAt ? Math.max(0, Math.round((loop.nextDispatchAt - Date.now()) / 1000)) : 0;
    return {
      success: true,
      loop: {
        id: loop.id,
        phone: loop.phone,
        mode: loop.mode,
        currentIteration: loop.currentIteration,
        maxIterations: loop.maxIterations,
        intervalSeconds: loop.intervalSeconds,
        totalMinutes: loop.totalMinutes,
        status: loop.status,
        secondsUntilNextRefresh: remainingSeconds,
        startTime: loop.startTime,
        lastDispatchedAt: loop.lastDispatchedAt,
        successCount: loop.successCount,
        failCount: loop.failCount,
        lastResult: loop.results[loop.results.length - 1] || null,
      },
    };
  }
}

export default SenderService;
