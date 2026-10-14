import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Phone,
  MessageSquare,
  PhoneCall,
  Zap,
  Square,
  Volume2,
  VolumeX,
  Copy,
  Trash2,
  Terminal as TerminalIcon,
  ShieldAlert,
  ChevronDown,
  Check,
  Send,
  Layers,
} from "lucide-react";
import "./App.css";

// Attack / Dispatch Mode Types
export type AttackMode = "sms_wa" | "sms_call";

interface ModeOption {
  id: AttackMode;
  title: string;
  subTitle: string;
  icon: React.ReactNode;
  iconBg: string;
  tags: { label: string; type: "sms" | "wa" | "call" }[];
}

const ATTACK_MODES: ModeOption[] = [
  {
    id: "sms_wa",
    title: "SMS + WhatsApp",
    subTitle: "Simultaneous SMS OTPs & WhatsApp Notifications",
    icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
    iconBg: "rgba(37, 211, 102, 0.15)",
    tags: [
      { label: "SMS", type: "sms" },
      { label: "WhatsApp", type: "wa" },
    ],
  },
  {
    id: "sms_call",
    title: "SMS + Call",
    subTitle: "Dual Blast: Fast SMS OTPs & Automated Voice Calls",
    icon: <PhoneCall className="w-4 h-4 text-purple-400" />,
    iconBg: "rgba(168, 85, 247, 0.15)",
    tags: [
      { label: "SMS", type: "sms" },
      { label: "Voice Call", type: "call" },
    ],
  },
];

interface LogEntry {
  id: string;
  timestamp: string;
  channel: "sms" | "wa" | "call" | "sys";
  message: string;
  status: "success" | "error" | "info";
  latency: number;
}

// Backend API Gateway base URL
const BACKEND_API_BASE =
  (import.meta as any).env?.VITE_BACKEND_URL || "/api/v1";

// Helper to trigger backend SMS and Call sender APIs
async function callBackendSender(
  channel: "sms" | "call" | "wa" | "both",
  targetNumber: string
) {
  let path = "/sender/sms";
  if (channel === "call") path = "/sender/call";
  else if (channel === "both") path = "/sender/dispatch";

  const primaryEndpoint = `${BACKEND_API_BASE}${path}`;
  const directEndpoint = `http://localhost:5002/api/v1${path}`;

  const startTime = Date.now();

  const tryRequest = async (url: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: targetNumber, channel }),
    });
    const json = await res.json().catch(() => null);
    return { res, json };
  };

  try {
    let responseObj;
    try {
      responseObj = await tryRequest(primaryEndpoint);
    } catch {
      // Fallback to direct backend URL if proxy had an issue
      responseObj = await tryRequest(directEndpoint);
    }

    const { res, json } = responseObj;
    const latencyMs = Date.now() - startTime;
    const isSuccess = res.ok && json?.status === "success" && json?.data?.success !== false;
    const upstreamPayload = json?.upstreamJson || json?.data?.upstreamJson || json?.data?.response;

    return {
      success: isSuccess,
      statusCode: res.status,
      latencyMs: json?.data?.latencyMs || latencyMs,
      upstreamStatus: json?.data?.statusCode,
      worker: json?.data?.worker || json?.data?.results?.call?.worker,
      raw: json,
      upstreamPayload,
      results: json?.data?.results,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      statusCode: 0,
      latencyMs,
      error: err.message || "Failed to reach backend",
      raw: null,
      upstreamPayload: null,
      results: null,
    };
  }
}

export default function App() {
  // Input fields state
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<AttackMode>("sms_wa");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  // Looping system specifications:
  // - sms + whatsapp: 20 iterations (1 min interval = 20 mins total)
  // - call + sms: 25 iterations (1 min interval = 25 mins total)
  const targetCount = selectedMode === "sms_wa" ? 20 : 25;
  const loopTotalMins = targetCount;
  const [refreshCountdown, setRefreshCountdown] = useState<number>(60);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [backendStatus, setBackendStatus] = useState<"connected" | "connecting" | "offline">("connecting");

  // Call Worker 30s switching timer & state
  const [rotationSeconds, setRotationSeconds] = useState<number>(() => {
    const now = Date.now();
    return 30 - Math.floor((now % 30000) / 1000);
  });
  const [activeCallWorker, setActiveCallWorker] = useState<string>(() => {
    const idx = Math.floor(Date.now() / 30000) % 2;
    return idx === 0 ? "call-worker-1" : "call-worker-2";
  });

  // Real Upstream Single Trigger state
  const [isTestingSingle, setIsTestingSingle] = useState<boolean>(false);

  // Runtime Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sentCount, setSentCount] = useState<number>(0);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [smsSent, setSmsSent] = useState<number>(0);
  const [waSent, setWaSent] = useState<number>(0);
  const [callSent, setCallSent] = useState<number>(0);

  // Terminal Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const runIntervalRef = useRef<any>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Ping backend API status on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${BACKEND_API_BASE}/health`);
        if (res.ok) {
          setBackendStatus("connected");
          return;
        }
      } catch {
        // Fallback to direct backend
      }

      try {
        const directRes = await fetch("http://localhost:5002/api/v1/health");
        if (directRes.ok) {
          setBackendStatus("connected");
          return;
        }
      } catch {
        // Both failed
      }

      setBackendStatus("offline");
    };

    checkHealth();
  }, []);

  // Real-time 30-second call worker rotation timer & backend synchronization
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const secRemaining = 30 - Math.floor((now % 30000) / 1000);
      const idx = Math.floor(now / 30000) % 2;
      setRotationSeconds(secRemaining);
      setActiveCallWorker(idx === 0 ? "call-worker-1" : "call-worker-2");
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_API_BASE}/sender/status`).catch(() => null);
        if (res && res.ok) {
          const json = await res.json();
          if (json?.data?.activeCallWorker) {
            setActiveCallWorker(json.data.activeCallWorker);
          }
          if (typeof json?.data?.secondsUntilSwitch === "number") {
            setRotationSeconds(json.data.secondsUntilSwitch);
          }
        }
      } catch {}
    };
    syncStatus();
    const pollInterval = setInterval(syncStatus, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // Clean phone input (numbers only, max 10)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 10) {
      setPhoneNumber(raw);
    }
  };

  // Detect Indian Operator based on prefix
  const detectCarrier = (phone: string) => {
    if (phone.length < 2) return null;
    const prefix2 = phone.substring(0, 2);
    const prefix3 = phone.substring(0, 3);

    if (["98", "99", "97", "96", "88", "85", "84", "80"].includes(prefix2)) {
      return { name: "Airtel India", circle: "North/West Circle", color: "#ef4444" };
    }
    if (["91", "90", "89", "86", "79", "78", "77", "76", "75", "70", "63", "62"].includes(prefix2)) {
      return { name: "Reliance Jio 5G", circle: "Pan-India", color: "#3b82f6" };
    }
    if (["94", "93", "81", "82", "83", "92"].includes(prefix2)) {
      return { name: "Vodafone Idea (Vi)", circle: "Metro & West", color: "#f59e0b" };
    }
    if (["940", "941", "942", "943", "944"].includes(prefix3)) {
      return { name: "BSNL Mobile", circle: "National", color: "#10b981" };
    }
    return { name: "Indian Telecom Gateway", circle: "Standard Circle", color: "#94a3b8" };
  };

  const carrierInfo = detectCarrier(phoneNumber);
  const isPhoneValid = phoneNumber.length === 10;

  // Sound Synthesizer (Web Audio API)
  const playSoundEffect = (type: "send" | "success" | "stop") => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "send") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "stop") {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // Audio might be blocked by browser policy until interaction
    }
  };

  // Simultaneous Dual Dispatch to BOTH SMS and Call Upstream Provider URLs
  const handleDualDispatch = async (targetPhone?: string) => {
    const target = targetPhone || phoneNumber;
    if (target.length !== 10 || isTestingSingle) return;

    setIsTestingSingle(true);
    playSoundEffect("send");

    const initialLog: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      channel: "sys",
      message: `[DUAL-DISPATCH] Sending simultaneous requests to BOTH SMS and Call Upstream Providers for +91 ${target}...`,
      status: "info",
      latency: 0,
    };
    setLogs((p) => [...p, initialLog]);

    try {
      // Concurrently trigger BOTH SMS and Voice Call upstream provider APIs
      const [smsRes, callRes] = await Promise.all([
        callBackendSender("sms", target),
        callBackendSender("call", target),
      ]);

      // Update counters
      setSentCount((s) => s + 2);
      setSmsSent((s) => s + 1);
      setCallSent((c) => c + 1);

      if (smsRes.success) setSuccessCount((s) => s + 1);
      else setFailedCount((f) => f + 1);

      if (callRes.success) setSuccessCount((s) => s + 1);
      else setFailedCount((f) => f + 1);



      // Format SMS log
      const smsUp = smsRes.upstreamPayload;
      let smsDetails = "";
      if (smsUp?.total_services) {
        smsDetails = ` | Services: ${smsUp.total_services} | Sent: ${smsUp.sent} | Ok: ${smsUp.success} | Author: "${smsUp.by || 'Pd Bhai ❤️'}"`;
      }
      const smsLog: LogEntry = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        channel: "sms",
        message: `[SMS-GATEWAY] Upstream response (${smsRes.latencyMs}ms)${smsDetails} -> ${smsRes.success ? 'DELIVERED' : smsRes.error || 'ERROR'}`,
        status: smsRes.success ? "success" : "error",
        latency: smsRes.latencyMs,
      };

      // Format Call log
      const callWorkerInfo = callRes.worker ? ` [${callRes.worker}]` : "";
      const callLog: LogEntry = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        channel: "call",
        message: `[VOICE-CALL] Upstream call dispatch${callWorkerInfo} (${callRes.latencyMs}ms) -> ${callRes.success ? 'TRANSMITTED' : callRes.error || 'FAILED'}`,
        status: callRes.success ? "success" : "error",
        latency: callRes.latencyMs,
      };

      setLogs((p) => [...p, smsLog, callLog]);
      playSoundEffect(smsRes.success || callRes.success ? "send" : "stop");
    } finally {
      setIsTestingSingle(false);
    }
  };

  // Direct Single Test Trigger & Upstream JSON Fetch
  const handleTestSingleTrigger = async () => {
    if (!isPhoneValid || isTestingSingle) return;

    if (selectedMode === "sms_call") {
      return handleDualDispatch(phoneNumber);
    }

    setIsTestingSingle(true);
    playSoundEffect("send");

    const channel = "sms";
    const channelLabel = "SMS-GATEWAY";

    const initialLog: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      channel,
      message: `[DIRECT-TRIGGER] Dispatching to upstream Base URL for +91 ${phoneNumber}... Waiting for API response.`,
      status: "info",
      latency: 0,
    };
    setLogs((p) => [...p, initialLog]);

    try {
      const backendResult = await callBackendSender(channel, phoneNumber);
      const isSuccess = backendResult.success;
      if (isSuccess) {
        setSuccessCount((s) => s + 1);
      } else {
        setFailedCount((f) => f + 1);
      }
      setSentCount((s) => s + 1);
      setSmsSent((s) => s + 1);


      const up = backendResult.upstreamPayload;
      let details = "";
      if (up?.total_services) {
        details = ` | Services: ${up.total_services} | Sent: ${up.sent} | Ok: ${up.success} | Author: "${up.by || 'Pd Bhai ❤️'}"`;
      }

      const finishLog: LogEntry = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        channel,
        message: `[${channelLabel}] ${isSuccess ? "Response Received" : "Error"} (${backendResult.latencyMs}ms)${details}`,
        status: isSuccess ? "success" : "error",
        latency: backendResult.latencyMs,
      };
      setLogs((p) => [...p, finishLog]);
      playSoundEffect(isSuccess ? "send" : "stop");
    } finally {
      setIsTestingSingle(false);
    }
  };

  // Dispatch a single loop iteration to upstream provider URLs
  const dispatchLoopIteration = (iterationNum: number) => {
    if (selectedMode === "sms_call") {
      setSmsSent((s) => s + 1);
      setCallSent((c) => c + 1);

      Promise.allSettled([
        callBackendSender("sms", phoneNumber),
        callBackendSender("call", phoneNumber),
      ]).then(([smsRes, callRes]) => {
        const smsVal = smsRes.status === "fulfilled" ? smsRes.value : null;
        const callVal = callRes.status === "fulfilled" ? callRes.value : null;

        if (smsVal?.success) setSuccessCount((s) => s + 1);
        else setFailedCount((f) => f + 1);

        if (callVal?.success) setSuccessCount((s) => s + 1);
        else setFailedCount((f) => f + 1);


        const smsLog: LogEntry = {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          channel: "sms",
          message: `[SMS-GATEWAY] Refresh #${iterationNum}/${targetCount} Dispatched -> ${smsVal?.success ? "OK" : "Err"} (${smsVal?.latencyMs || 0}ms)`,
          status: smsVal?.success ? "success" : "error",
          latency: smsVal?.latencyMs || 0,
        };

        const callWorkerInfo = callVal?.worker ? ` [${callVal.worker}]` : "";
        const callLog: LogEntry = {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          channel: "call",
          message: `[VOICE-CALL] Refresh #${iterationNum}/${targetCount} Dispatched${callWorkerInfo} -> ${callVal?.success ? "OK" : "Err"} (${callVal?.latencyMs || 0}ms)`,
          status: callVal?.success ? "success" : "error",
          latency: callVal?.latencyMs || 0,
        };

        const timerLog: LogEntry = {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          channel: "sys",
          message: `⏱️ [UPSTREAM REFRESH] Request active. Next session refresh in 60s (${targetCount - iterationNum} remaining).`,
          status: "info",
          latency: 0,
        };

        setLogs((p) => [...p.slice(-150), smsLog, callLog, ...(iterationNum < targetCount ? [timerLog] : [])]);
        playSoundEffect("send");
      });
    } else {
      // SMS + WhatsApp mode
      const channel = iterationNum % 2 === 0 ? "wa" : "sms";
      if (channel === "sms") setSmsSent((s) => s + 1);
      else setWaSent((w) => w + 1);

      const channelLabel = channel === "sms" ? "SMS-API" : "WHATSAPP-MSG";

      callBackendSender(channel, phoneNumber).then((backendResult) => {
        const isSuccess = backendResult.success;
        if (isSuccess) setSuccessCount((s) => s + 1);
        else setFailedCount((f) => f + 1);


        const up = backendResult.upstreamPayload;
        let details = "";
        if (up?.total_services) {
          details = ` | Svcs: ${up.total_services} | Sent: ${up.sent} | Ok: ${up.success} | Author: "${up.by || 'Pd Bhai'}"`;
        }

        const statusStr = backendResult.statusCode
          ? `HTTP ${backendResult.statusCode}`
          : backendResult.error || "Err";
        const workerInfo = backendResult.worker ? ` [${backendResult.worker}]` : "";

        const logItem: LogEntry = {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          channel,
          message: `[${channelLabel}] Refresh #${iterationNum}/${targetCount} Dispatched via Backend${workerInfo} -> ${statusStr} (${backendResult.latencyMs}ms)${details}`,
          status: isSuccess ? "success" : "error",
          latency: backendResult.latencyMs,
        };

        const timerLog: LogEntry = {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          channel: "sys",
          message: `⏱️ [UPSTREAM REFRESH] Request active. Next session refresh in 60s (${targetCount - iterationNum} remaining).`,
          status: "info",
          latency: 0,
        };

        setLogs((p) => [...p.slice(-150), logItem, ...(iterationNum < targetCount ? [timerLog] : [])]);
        playSoundEffect("send");
      });
    }
  };

  // Start 1-Minute Upstream Refresh Loop (20 iters for SMS+WA, 25 iters for SMS+Call)
  const handleStartBanger = () => {
    if (!isPhoneValid) return;
    setIsRunning(true);
    setSentCount(1);
    setSuccessCount(0);
    setFailedCount(0);
    setSmsSent(0);
    setWaSent(0);
    setCallSent(0);
    setRefreshCountdown(60);

    const initialLog: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      channel: "sys",
      message: `[LOOP-START] Target: +91 ${phoneNumber} | Mode: ${
        activeModeObj.title
      } | Total Iterations: ${targetCount} | Refresh: Every 1 Min (~${loopTotalMins} Mins Total)`,
      status: "info",
      latency: 0,
    };
    setLogs([initialLog]);
    playSoundEffect("send");

    // Also notify backend background loop manager
    fetch(`${BACKEND_API_BASE}/sender/loop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneNumber, mode: selectedMode, maxIterations: targetCount, intervalMs: 60000 }),
    }).catch(() => null);

    // Dispatch Iteration 1 immediately
    dispatchLoopIteration(1);
  };

  // Stop / Abort Refresh Loop
  const handleStopBanger = () => {
    setIsRunning(false);
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }
    setRefreshCountdown(60);
    playSoundEffect("stop");

    // Stop backend background loop
    fetch(`${BACKEND_API_BASE}/sender/loop/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneNumber }),
    }).catch(() => null);

    const abortLog: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      channel: "sys",
      message: `[SYS-ABORT] Upstream refresh loop terminated by operator. Process cleared.`,
      status: "error",
      latency: 0,
    };
    setLogs((prev) => [...prev, abortLog]);
  };

  // 1-Minute Recurring Upstream Refresh Interval & Countdown
  useEffect(() => {
    if (!isRunning) return;

    runIntervalRef.current = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          // 60 seconds elapsed -> trigger next iteration!
          setSentCount((prevSent) => {
            const nextIteration = prevSent + 1;
            if (nextIteration > targetCount) {
              setIsRunning(false);
              if (runIntervalRef.current) {
                clearInterval(runIntervalRef.current);
                runIntervalRef.current = null;
              }
              setLogs((p) => [
                ...p,
                {
                  id: Math.random().toString(),
                  timestamp: new Date().toLocaleTimeString(),
                  channel: "sys",
                  message: `🎉 [SESSION COMPLETE] Successfully delivered all ${targetCount}/${targetCount} upstream refreshes over ${loopTotalMins} minutes for +91 ${phoneNumber}.`,
                  status: "info",
                  latency: 0,
                },
              ]);
              return prevSent;
            }

            // Dispatch next iteration to upstream
            dispatchLoopIteration(nextIteration);
            return nextIteration;
          });
          return 60; // reset countdown to 60s
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (runIntervalRef.current) {
        clearInterval(runIntervalRef.current);
        runIntervalRef.current = null;
      }
    };
  }, [isRunning, targetCount, loopTotalMins, selectedMode, phoneNumber]);

  // Current active mode details
  const activeModeObj = ATTACK_MODES.find((m) => m.id === selectedMode) || ATTACK_MODES[0];

  return (
    <div className="banger-app">
      <div className="ambient-glow" />
      <div className="grid-overlay" />

      {/* Header Bar */}
      <header className="banger-header">
        <div className="brand-container">
          <div className="brand-logo-icon">
            <Flame className="w-5 h-5 text-white fire-icon" />
          </div>
          <div className="brand-title-wrap">
            <div className="brand-title">
              PULSE BANGER <span className="brand-badge">V2.4 PRO</span>
            </div>
            <div className="brand-subtitle">
              Multi-Channel High-Velocity SMS, WhatsApp & Call Stream Console
            </div>
          </div>
        </div>

        <div className="header-status-group">
          <div className="status-indicator">
            <span
              className={`pulse-dot ${
                isRunning
                  ? "busy"
                  : backendStatus === "connected"
                  ? ""
                  : "offline"
              }`}
            />
            <span>
              {isRunning
                ? "STREAMING ACTIVE"
                : backendStatus === "connected"
                ? "BACKEND CONNECTED"
                : "ENGINE READY"}
            </span>
          </div>

          <button
            id="sound-toggle-btn"
            className="icon-btn"
            title={soundEnabled ? "Mute Sound" : "Enable Sound"}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="banger-main-grid">
        {/* Left Column: Configuration Console */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div className="card-top">
            <div className="card-title-wrap">
              <Zap className="w-5 h-5 text-pink-500" />
              <h2>Dispatch Configuration</h2>
            </div>
            <span className="card-tag">TARGET SPECIFICATION</span>
          </div>

          {/* 1. Target Phone Number Input */}
          <div className="field-group">
            <div className="field-label-row">
              <label htmlFor="target-phone-input" className="field-label">
                <Phone className="w-3.5 h-3.5 text-pink-400" />
                Target Mobile Number *
              </label>
              <span className="field-hint">Indian (+91) Numbers Only</span>
            </div>

            <div className="phone-input-wrapper">
              <div className="country-flag-box">
                <span>🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                id="target-phone-input"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="Enter 10-digit mobile number"
                className="phone-native-input"
                disabled={isRunning}
                autoComplete="off"
              />
              <div className="input-actions">
                {phoneNumber && (
                  <button
                    id="clear-phone-btn"
                    type="button"
                    className="mini-action-btn"
                    onClick={() => !isRunning && setPhoneNumber("")}
                    disabled={isRunning}
                  >
                    Clear
                  </button>
                )}
                <button
                  id="paste-phone-btn"
                  type="button"
                  className="mini-action-btn"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const digits = text.replace(/\D/g, "").slice(-10);
                      if (digits.length === 10) setPhoneNumber(digits);
                    } catch {}
                  }}
                  disabled={isRunning}
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Carrier Detection Badge */}
            <div className="carrier-detect-bar">
              <span className={`carrier-badge ${isPhoneValid ? "valid" : ""}`}>
                {isPhoneValid && carrierInfo ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span style={{ color: carrierInfo.color }}>{carrierInfo.name}</span>
                    <span className="text-gray-500">· {carrierInfo.circle}</span>
                  </>
                ) : phoneNumber.length > 0 ? (
                  <span>Enter {10 - phoneNumber.length} more digits</span>
                ) : (
                  <span>Waiting for target phone input...</span>
                )}
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                {phoneNumber.length}/10 Digits
              </span>
            </div>
          </div>

          {/* 2. Attack Mode Dropdown (SMS + WhatsApp, SMS + WhatsApp or Call, SMS Only) */}
          <div className="field-group" ref={dropdownRef}>
            <div className="field-label-row">
              <label id="mode-dropdown-label" className="field-label">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Attack & Dispatch Mode *
              </label>
              <span className="field-hint">Select Multi-Channel Vector</span>
            </div>

            <div className={`select-wrapper ${isDropdownOpen ? "open" : ""}`}>
              <button
                id="channel-mode-dropdown-trigger"
                type="button"
                className={`custom-select-trigger ${isDropdownOpen ? "open" : ""}`}
                onClick={() => !isRunning && setIsDropdownOpen(!isDropdownOpen)}
                disabled={isRunning}
              >
                <div className="selected-option-content">
                  <div className="option-icon-box" style={{ background: activeModeObj.iconBg }}>
                    {activeModeObj.icon}
                  </div>
                  <div className="option-text-group">
                    <span className="option-primary-title">
                      {activeModeObj.title}
                      <span className="channel-tags">
                        {activeModeObj.tags.map((t, idx) => (
                          <span key={idx} className={`channel-pill pill-${t.type}`}>
                            {t.label}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="option-sub-desc">{activeModeObj.subTitle}</span>
                  </div>
                </div>
                <ChevronDown className={`dropdown-arrow ${isDropdownOpen ? "rotated" : ""}`} />
              </button>

              {/* Dropdown Options List */}
              {isDropdownOpen && (
                <div className="dropdown-menu-list">
                  {ATTACK_MODES.map((mode) => (
                    <div
                      key={mode.id}
                      id={`mode-option-${mode.id}`}
                      className={`dropdown-item ${selectedMode === mode.id ? "active" : ""}`}
                      onClick={() => {
                        setSelectedMode(mode.id);
                        setIsDropdownOpen(false);
                        if (mode.id === "sms_call") {
                          if (isPhoneValid) {
                            handleDualDispatch(phoneNumber);
                          } else {
                            setLogs((p) => [
                              ...p,
                              {
                                id: Math.random().toString(),
                                timestamp: new Date().toLocaleTimeString(),
                                channel: "sys",
                                message: `[MODE ACTIVE: SMS + CALL] Dual blast vector enabled. Enter 10-digit number to blast both SMS and Call upstream providers simultaneously.`,
                                status: "info",
                                latency: 0,
                              },
                            ]);
                          }
                        }
                      }}
                    >
                      <div className="selected-option-content">
                        <div className="option-icon-box" style={{ background: mode.iconBg }}>
                          {mode.icon}
                        </div>
                        <div className="option-text-group">
                          <span className="option-primary-title">
                            {mode.title}
                            {selectedMode === mode.id && (
                              <Check className="w-3.5 h-3.5 text-pink-400 inline ml-1" />
                            )}
                          </span>
                          <span className="option-sub-desc">{mode.subTitle}</span>
                        </div>
                      </div>
                      <div className="channel-tags">
                        {mode.tags.map((t, idx) => (
                          <span key={idx} className={`channel-pill pill-${t.type}`}>
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Mode Select Pills */}
            <div className="count-pills">
              {ATTACK_MODES.map((mode) => (
                <button
                  key={mode.id}
                  id={`quick-mode-${mode.id}`}
                  type="button"
                  className={`count-pill-btn ${selectedMode === mode.id ? "selected" : ""}`}
                  onClick={() => {
                    if (!isRunning) {
                      setSelectedMode(mode.id);
                      setIsDropdownOpen(false);
                      if (mode.id === "sms_call") {
                        if (isPhoneValid) {
                          handleDualDispatch(phoneNumber);
                        } else {
                          setLogs((p) => [
                            ...p,
                            {
                              id: Math.random().toString(),
                              timestamp: new Date().toLocaleTimeString(),
                              channel: "sys",
                              message: `[MODE ACTIVE: SMS + CALL] Dual blast vector enabled. Enter 10-digit number to blast both SMS and Call upstream providers simultaneously.`,
                              status: "info",
                              latency: 0,
                            },
                          ]);
                        }
                      }
                    }
                  }}
                  disabled={isRunning}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
                    {mode.icon}
                    <span>{mode.title}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Live 30-Second Call Worker Rotation Countdown Indicator */}
            {selectedMode === "sms_call" && (
              <div className="rotation-status-badge">
                <span className="rotation-pill">
                  <span className="rotation-dot" />
                  <span>
                    Call Worker: <strong style={{ color: "#d8b4fe" }}>{activeCallWorker}</strong>
                  </span>
                </span>
                <span className="rotation-timer">
                  ⏱️ Switches URL in {rotationSeconds}s (Time-limit bypass)
                </span>
              </div>
            )}
          </div>

          {/* 3. Action Buttons (Single Test Trigger & Stream Blast) */}
          <div className="launch-button-wrap" style={{ marginTop: "2rem" }}>
            {!isRunning ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button
                  id="test-single-trigger-btn"
                  type="button"
                  className={`launch-btn single ${!isPhoneValid || isTestingSingle ? "disabled" : ""}`}
                  onClick={handleTestSingleTrigger}
                  disabled={!isPhoneValid || isTestingSingle}
                >
                  <Send className="w-5 h-5 text-cyan-300" />
                  <span>
                    {isTestingSingle
                      ? selectedMode === "sms_call"
                        ? "DISPATCHING SMS + CALL UPSTREAM..."
                        : "DISPATCHING UPSTREAM..."
                      : selectedMode === "sms_call"
                      ? "BLAST SMS + CALL (DUAL UPSTREAM)"
                      : "TEST SINGLE TRIGGER & GET JSON"}
                  </span>
                </button>

                <button
                  id="start-banger-btn"
                  type="button"
                  className={`launch-btn start ${!isPhoneValid || isTestingSingle ? "disabled" : ""}`}
                  onClick={handleStartBanger}
                  disabled={!isPhoneValid || isTestingSingle}
                >
                  <Flame className="w-5 h-5 fire-icon" />
                  <span>START</span>
                </button>
              </div>
            ) : (
              <button
                id="abort-banger-btn"
                type="button"
                className="launch-btn abort"
                onClick={handleStopBanger}
              >
                <Square className="w-5 h-5 fill-current" />
                <span>STOP</span>
              </button>
            )}
          </div>
        </section>

        {/* Right Column: Real-time Telemetry & Live Terminal */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div className="card-top">
            <div className="card-title-wrap">
              <TerminalIcon className="w-5 h-5 text-emerald-400" />
              <h2>Live Telemetry & Logs</h2>
            </div>
            <span className="card-tag">REALTIME STREAM FEED</span>
          </div>

          {/* Active Loop Progress Banner */}
          {isRunning && (
            <div className="loop-progress-banner">
              <div className="loop-progress-header">
                <span>🔄 1-MIN UPSTREAM REFRESH LOOP: <strong>{activeModeObj.title}</strong></span>
                <span className="loop-badge">ITERATION {sentCount} / {targetCount}</span>
              </div>
              <div className="loop-progress-bar-bg">
                <div
                  className="loop-progress-bar-fill"
                  style={{ width: `${Math.min(100, (sentCount / targetCount) * 100)}%` }}
                />
              </div>
              <div className="loop-progress-meta">
                <span>⏱️ Next 1-Min Upstream Refresh in: <strong>{refreshCountdown}s</strong></span>
                <span>Session Target: ~{loopTotalMins} Mins Total</span>
              </div>
            </div>
          )}

          {/* Telemetry Metrics Grid */}
          <div className="telemetry-grid">
            <div className="stat-box">
              <div className="stat-label">Loop Progress</div>
              <div className="stat-val sent">{sentCount} / {targetCount}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Delivered</div>
              <div className="stat-val ok">{successCount}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Failed</div>
              <div className="stat-val err">{failedCount}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{isRunning ? "Next Refresh" : "Refresh Cycle"}</div>
              <div className="stat-val speed">{isRunning ? `${refreshCountdown}s` : "1m / req"}</div>
            </div>
          </div>

          {/* Sub-channel Dispatched Breakdown */}
          <div className="channel-breakdown">
            <div className="channel-stat-item">
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>SMS Dispatched: <strong className="text-white">{smsSent}</strong></span>
            </div>
            {selectedMode === "sms_wa" ? (
              <div className="channel-stat-item">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Pushed: <strong className="text-white">{waSent}</strong></span>
              </div>
            ) : (
              <div className="channel-stat-item">
                <PhoneCall className="w-3.5 h-3.5 text-purple-400" />
                <span>Voice Calls Triggered: <strong className="text-white">{callSent}</strong></span>
              </div>
            )}
          </div>

          {/* Terminal Console Window */}
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="terminal-dot dot-red" />
                <span className="terminal-dot dot-yellow" />
                <span className="terminal-dot dot-green" />
              </div>
              <span className="terminal-title">GATEWAY DISPATCH STREAM CONSOLE</span>
              <div className="terminal-controls">
                <button
                  id="clear-logs-btn"
                  className="term-btn"
                  onClick={() => setLogs([])}
                  title="Clear Console"
                >
                  <Trash2 className="w-3 h-3 inline mr-1" />
                  Clear
                </button>
              </div>
            </div>

            <div className="terminal-body">
              {logs.length === 0 ? (
                <div className="terminal-empty">
                  <TerminalIcon className="w-7 h-7 text-gray-600 mb-1" />
                  <p>Console idle. Configure target and click "START BANGER STREAM".</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="terminal-line">
                    <span className="terminal-time">[{log.timestamp}]</span>
                    <span
                      className={`terminal-tag ${
                        log.channel === "sms"
                          ? "tag-sms"
                          : log.channel === "wa"
                          ? "tag-wa"
                          : log.channel === "call"
                          ? "tag-call"
                          : "tag-sys"
                      }`}
                    >
                      [{log.channel.toUpperCase()}]
                    </span>
                    <span
                      className={`terminal-msg ${
                        log.status === "error" ? "error" : "success"
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </section>
      </main>



      {/* Safety & Compliance Footer */}
      <footer className="banger-footer">
        <div className="disclaimer-badge">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>AUTHORIZED PENETRATION & STRESS TESTING ONLY</span>
        </div>
        <p>
          This dashboard is strictly for network load simulation, rate-limit testing, and security verification.
          Do not target numbers without explicit consent.
        </p>
      </footer>
    </div>
  );
}
