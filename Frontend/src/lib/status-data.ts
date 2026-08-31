export type ComponentState = "operational" | "degraded" | "partial_outage" | "maintenance";

export type StatusComponent = {
  id: string;
  name: string;
  group: string;
  state: ComponentState;
  uptime30d: number;
  uptime90d: number;
  p95LatencyMs: number;
  /** 45 daily buckets, newest last. 0 = ok, 1 = degraded, 2 = outage */
  history: number[];
};

export type IncidentUpdate = { at: string; status: string; body: string };

export type Incident = {
  id: string;
  title: string;
  impact: "none" | "minor" | "major" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  startedAt: string;
  resolvedAt: string | null;
  components: string[];
  updates: IncidentUpdate[];
};

function bars(spec: Record<number, number> = {}): number[] {
  return Array.from({ length: 45 }, (_, i) => spec[i] ?? 0);
}

export const STATUS_COMPONENTS: StatusComponent[] = [
  {
    id: "kyc-pan",
    name: "PAN & GSTIN verification",
    group: "KYC",
    state: "operational",
    uptime30d: 99.99,
    uptime90d: 99.98,
    p95LatencyMs: 410,
    history: bars(),
  },
  {
    id: "kyc-aadhaar",
    name: "Aadhaar OTP / DigiLocker",
    group: "KYC",
    state: "degraded",
    uptime30d: 99.42,
    uptime90d: 99.71,
    p95LatencyMs: 1840,
    history: bars({ 41: 1, 43: 1, 44: 1 }),
  },
  {
    id: "kyc-ocr",
    name: "Document OCR & face match",
    group: "KYC",
    state: "operational",
    uptime30d: 99.96,
    uptime90d: 99.94,
    p95LatencyMs: 980,
    history: bars({ 22: 1 }),
  },
  {
    id: "bank-pennydrop",
    name: "Penny drop & reverse penny drop",
    group: "Banking",
    state: "operational",
    uptime30d: 99.97,
    uptime90d: 99.9,
    p95LatencyMs: 2210,
    history: bars({ 12: 2 }),
  },
  {
    id: "bank-ifsc",
    name: "IFSC & UPI VPA lookup",
    group: "Banking",
    state: "operational",
    uptime30d: 100,
    uptime90d: 99.99,
    p95LatencyMs: 120,
    history: bars(),
  },
  {
    id: "aa-consent",
    name: "Account Aggregator consent & FI fetch",
    group: "Account Aggregator",
    state: "operational",
    uptime30d: 99.88,
    uptime90d: 99.82,
    p95LatencyMs: 3120,
    history: bars({ 30: 1, 31: 2 }),
  },
  {
    id: "payouts",
    name: "Payouts (IMPS / NEFT / UPI)",
    group: "Payments",
    state: "operational",
    uptime30d: 99.95,
    uptime90d: 99.93,
    p95LatencyMs: 1450,
    history: bars({ 8: 1 }),
  },
  {
    id: "webhooks",
    name: "Webhook delivery",
    group: "Platform",
    state: "operational",
    uptime30d: 99.99,
    uptime90d: 99.97,
    p95LatencyMs: 240,
    history: bars(),
  },
  {
    id: "console",
    name: "Developer console & docs",
    group: "Platform",
    state: "operational",
    uptime30d: 100,
    uptime90d: 99.99,
    p95LatencyMs: 180,
    history: bars(),
  },
];

export const INCIDENTS: Incident[] = [
  {
    id: "inc-2026-08-29",
    title: "Elevated latency on Aadhaar OTP initiation",
    impact: "minor",
    status: "monitoring",
    startedAt: "2026-08-29T14:20:00.000Z",
    resolvedAt: null,
    components: ["kyc-aadhaar"],
    updates: [
      {
        at: "2026-08-30T04:10:00.000Z",
        status: "monitoring",
        body: "Upstream DigiLocker latency has returned to normal for 6 hours. We are keeping the incident open while we monitor retry queues. Success rate is back above 99.5%.",
      },
      {
        at: "2026-08-29T16:05:00.000Z",
        status: "identified",
        body: "The issue is caused by rate limiting at the UIDAI gateway during peak hours. We have shifted OTP initiation to a secondary pool and increased retry backoff.",
      },
      {
        at: "2026-08-29T14:20:00.000Z",
        status: "investigating",
        body: "We are seeing p95 latency above 1.8s on POST /kyc/aadhaar/otp with intermittent 504s. Other KYC endpoints are unaffected.",
      },
    ],
  },
  {
    id: "inc-2026-08-12",
    title: "Penny drop failures for two partner banks",
    impact: "major",
    status: "resolved",
    startedAt: "2026-08-12T06:45:00.000Z",
    resolvedAt: "2026-08-12T09:12:00.000Z",
    components: ["bank-pennydrop"],
    updates: [
      {
        at: "2026-08-12T09:12:00.000Z",
        status: "resolved",
        body: "Routing was moved to a healthy sponsor bank and all queued verifications were replayed. 1,284 affected requests were re-processed at no charge.",
      },
      {
        at: "2026-08-12T07:30:00.000Z",
        status: "identified",
        body: "A sponsor bank NPCI connection was returning ACCOUNT_UNREACHABLE for valid accounts. Failover to the secondary rail is in progress.",
      },
      {
        at: "2026-08-12T06:45:00.000Z",
        status: "investigating",
        body: "Increased failure rate reported on POST /bank/penny-drop for HDFC and ICICI beneficiary accounts.",
      },
    ],
  },
  {
    id: "inc-2026-07-30",
    title: "Scheduled maintenance — Account Aggregator FI fetch",
    impact: "none",
    status: "resolved",
    startedAt: "2026-07-30T18:30:00.000Z",
    resolvedAt: "2026-07-30T19:40:00.000Z",
    components: ["aa-consent"],
    updates: [
      {
        at: "2026-07-30T19:40:00.000Z",
        status: "resolved",
        body: "Maintenance completed. FI data sessions now support incremental fetch windows up to 24 months.",
      },
      {
        at: "2026-07-30T18:30:00.000Z",
        status: "investigating",
        body: "Planned maintenance window started. Consent creation stayed online; FI fetch requests were queued and retried automatically.",
      },
    ],
  },
  {
    id: "inc-2026-07-04",
    title: "Webhook delivery backlog",
    impact: "minor",
    status: "resolved",
    startedAt: "2026-07-04T11:05:00.000Z",
    resolvedAt: "2026-07-04T11:58:00.000Z",
    components: ["webhooks"],
    updates: [
      {
        at: "2026-07-04T11:58:00.000Z",
        status: "resolved",
        body: "The backlog drained fully. All events were delivered with valid signatures; no events were dropped.",
      },
      {
        at: "2026-07-04T11:05:00.000Z",
        status: "investigating",
        body: "Webhook deliveries are delayed by up to 9 minutes due to a queue consumer restart loop.",
      },
    ],
  },
];

export const STATE_LABEL: Record<ComponentState, string> = {
  operational: "Operational",
  degraded: "Degraded performance",
  partial_outage: "Partial outage",
  maintenance: "Under maintenance",
};
