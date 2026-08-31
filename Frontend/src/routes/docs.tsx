import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Search,
  Copy,
  Check,
  Webhook,
  Loader2,
  KeyRound,
  Terminal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TryItConsole } from "@/components/docs/TryItConsole";
import {
  API_GROUPS,
  BASE_URL,
  endpoints,
  sampleInput,
  WEBHOOK_EVENTS,
  type ApiEndpoint,
  type ApiGroup,
} from "@/lib/api-catalog";
import {
  getDashboard,
  getSession,
  signWebhookEvent,
  verifyWebhookSignature,
} from "@/lib/demo-store";
import { generateSnippet, INSTALL_COMMANDS, LANGUAGES, type LanguageId } from "@/lib/sdk-snippets";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "API Docs — KYC & Banking Verification Endpoints | VeroKYC" },
      {
        name: "description",
        content:
          "Full VeroKYC API reference: PAN, Aadhaar, GSTIN, penny-drop bank verification, Account Aggregator and payouts. Live Try-It console, SDK snippets and webhook signature tester.",
      },
      { property: "og:title", content: "VeroKYC API Documentation" },
      {
        property: "og:description",
        content:
          "22+ KYC and banking endpoints with request/response examples, SDKs in 6 languages and an interactive console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ApiGroup | "All">("All");
  const [method, setMethod] = useState<"All" | "GET" | "POST" | "DELETE">("All");
  const [activeId, setActiveId] = useState(endpoints[0]!.id);
  const [lang, setLang] = useState<LanguageId>("curl");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setSignedIn(Boolean(getSession()));
    const sync = () => setSignedIn(Boolean(getSession()));
    window.addEventListener("verokyc:state", sync);
    return () => window.removeEventListener("verokyc:state", sync);
  }, []);

  const { data: account } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => getDashboard(),
    enabled: signedIn,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return endpoints.filter((e) => {
      if (group !== "All" && e.group !== group) return false;
      if (method !== "All" && e.method !== method) return false;
      if (!q) return true;
      const haystack = [
        e.title,
        e.desc,
        e.path,
        e.group,
        ...e.tags,
        ...e.params.map((p) => `${p.name} ${p.desc}`),
        JSON.stringify(e.sampleBody ?? e.sampleQuery ?? {}),
        JSON.stringify(e.sampleResponse),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, group, method]);

  const active = endpoints.find((e) => e.id === activeId) ?? filtered[0] ?? endpoints[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">VeroKYC</span>
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">Developer docs</span>
          <div className="ml-auto flex items-center gap-3">
            {signedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                <KeyRound className="h-4 w-4" /> API keys
              </Link>
            ) : (
              <Link
                to="/auth"
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                Get API keys
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        <aside className="sticky top-24 hidden h-[calc(100vh-8rem)] w-72 shrink-0 overflow-y-auto lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search endpoints, params…"
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["All", ...API_GROUPS] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  group === g
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["All", "GET", "POST", "DELETE"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-full border px-2.5 py-1 font-mono text-xs transition-colors ${
                  method === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {filtered.length} of {endpoints.length} endpoints
          </p>

          <nav className="mt-3 space-y-4 pb-10">
            {API_GROUPS.map((g) => {
              const items = filtered.filter((e) => e.group === g);
              if (!items.length) return null;
              return (
                <div key={g}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {g}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((e) => (
                      <li key={e.id}>
                        <button
                          onClick={() => setActiveId(e.id)}
                          className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            active.id === e.id
                              ? "bg-secondary text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {e.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-10 pb-20">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h1 className="text-2xl font-bold tracking-tight">VeroKYC API reference</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              REST over HTTPS, JSON in and out. Base URL{" "}
              <code className="rounded bg-terminal px-1.5 py-0.5 font-mono text-xs">{BASE_URL}</code>.
              Authenticate every request with{" "}
              <code className="rounded bg-terminal px-1.5 py-0.5 font-mono text-xs">
                Authorization: Bearer sk_test_…
              </code>
              .
            </p>
            {account?.limits && (
              <p className="mt-3 text-xs text-muted-foreground">
                Your {account.profile?.plan} plan: {account.limits.monthly_requests.toLocaleString("en-IN")}{" "}
                requests/month · {account.limits.rate_limit_per_minute} req/min ·{" "}
                {account.monthlyUsage.toLocaleString("en-IN")} used so far.
              </p>
            )}
          </section>

          <section className="lg:hidden">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search endpoints…"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <select
              value={active.id}
              onChange={(e) => setActiveId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              {filtered.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.group} — {e.title}
                </option>
              ))}
            </select>
          </section>

          <EndpointDetail endpoint={active} />

          <section className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      lang === l.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <CodeBlock
                title={`${LANGUAGES.find((l) => l.id === lang)!.label} request`}
                code={generateSnippet(lang, active, sampleInput(active), apiKey.trim() || undefined)}
              />
              <div className="mt-4">
                <CodeBlock title="Install the SDK" code={INSTALL_COMMANDS[lang]} />
              </div>
            </div>
            <TryItConsole
              endpoint={active}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              signedIn={signedIn}
            />
          </section>

          <WebhookTester keys={account?.keys ?? []} signedIn={signedIn} />

          <section>
            <h2 className="mb-3 text-lg font-semibold">Errors</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Code</th>
                    <th className="px-4 py-2.5 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["400", "invalid_request", "A required parameter is missing or malformed."],
                    ["401", "invalid_api_key", "Missing, revoked or wrong-environment API key."],
                    ["402", "insufficient_credits", "Wallet balance too low for a billable verification."],
                    ["404", "not_found", "The requested record or reference id does not exist."],
                    ["409", "duplicate_request", "An identical idempotency key was already processed."],
                    ["429", "rate_limited", "Plan rate limit or monthly quota exhausted."],
                    ["502", "provider_unavailable", "Upstream government/bank source timed out. Retry with backoff."],
                  ].map(([status, code, meaning]) => (
                    <tr key={code} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-mono">{status}</td>
                      <td className="px-4 py-2.5 font-mono text-primary">{code}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function EndpointDetail({ endpoint }: { endpoint: ApiEndpoint }) {
  return (
    <section className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
            {endpoint.method}
          </span>
          <code className="font-mono text-sm">{endpoint.path}</code>
          {endpoint.latency && (
            <span className="text-xs text-muted-foreground">avg {endpoint.latency}</span>
          )}
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">{endpoint.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{endpoint.desc}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {endpoint.tags.map((t) => (
            <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Parameter</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoint.params.map((p) => (
              <tr key={p.name} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs">
                  {p.name}
                  {p.required && <span className="ml-1 text-destructive">*</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.type}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{p.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CodeBlock
          title={endpoint.method === "GET" ? "Example parameters" : "Example request body"}
          code={JSON.stringify(sampleInput(endpoint), null, 2)}
        />
        <CodeBlock title="Example response · 200" code={JSON.stringify(endpoint.sampleResponse, null, 2)} />
      </div>
    </section>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Terminal className="h-3.5 w-3.5" /> {title}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`Copy ${title}`}
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="overflow-x-auto bg-terminal px-4 py-3 font-mono text-xs leading-relaxed">{code}</pre>
    </div>
  );
}

type KeyOption = { id: string; label: string; environment: string; revoked: boolean };

function WebhookTester({ keys, signedIn }: { keys: KeyOption[]; signedIn: boolean }) {
  const verify = verifyWebhookSignature;
  const usable = keys.filter((k) => !k.revoked);
  const [keyId, setKeyId] = useState("");
  const [eventType, setEventType] = useState<string>(WEBHOOK_EVENTS[0]!);
  const [event, setEvent] = useState<{ timestamp: string; body: string; header: string } | null>(null);
  const [headerInput, setHeaderInput] = useState("");
  const [bodyInput, setBodyInput] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof verify>> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!keyId && usable[0]) setKeyId(usable[0].id);
  }, [usable, keyId]);

  async function generate() {
    setBusy(true);
    setResult(null);
    try {
      const res = await signWebhookEvent({ keyId, eventType });
      if (!res.ok) return;
      setEvent({ timestamp: res.timestamp, body: res.body, header: res.header });
      setHeaderInput(res.header);
      setBodyInput(res.body);
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    if (!event) return;
    setBusy(true);
    try {
      setResult(
        await verify({ keyId, timestamp: event.timestamp, body: bodyInput, header: headerInput }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Webhook className="h-4 w-4 text-primary" /> Webhook signature tester
      </h2>
      <div className="rounded-xl border border-border bg-card p-5">
        {!signedIn || usable.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {signedIn ? (
              <>
                Create an API key in your{" "}
                <Link to="/dashboard" className="text-primary hover:underline">
                  dashboard
                </Link>{" "}
                — each key carries its own webhook signing secret.
              </>
            ) : (
              <>
                <Link to="/auth" className="text-primary hover:underline">
                  Sign in
                </Link>{" "}
                to generate signed test events against your own webhook secret.
              </>
            )}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label>
                <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  Signing key
                </span>
                <select
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {usable.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label} ({k.environment})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  Event
                </span>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {WEBHOOK_EVENTS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={generate}
                disabled={busy || !keyId}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Generate signed event
              </button>
            </div>

            {event && (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                    Verokyc-Signature header
                  </span>
                  <input
                    value={headerInput}
                    onChange={(e) => setHeaderInput(e.target.value)}
                    className="w-full rounded-lg border border-border bg-terminal px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                    Raw payload (edit to see verification fail)
                  </span>
                  <textarea
                    value={bodyInput}
                    onChange={(e) => setBodyInput(e.target.value)}
                    rows={10}
                    spellCheck={false}
                    className="w-full rounded-lg border border-border bg-terminal px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                  />
                </label>
                <button
                  onClick={check}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verify signature
                </button>

                {result && (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      result.valid
                        ? "border-success/40 bg-success/5 text-success"
                        : "border-destructive/40 bg-destructive/5 text-destructive"
                    }`}
                  >
                    <p className="font-semibold">{result.valid ? "Signature valid" : "Signature invalid"}</p>
                    <p className="mt-1 text-muted-foreground">{result.reason}</p>
                  </div>
                )}

                <CodeBlock
                  title="Verify in your backend (Node.js)"
                  code={`import crypto from "node:crypto";

export function verifyVeroKycSignature(rawBody, header, secret, toleranceSec = 300) {
  const timestamp = /t=(\\d+)/.exec(header)?.[1];
  const provided = /v1=([a-f0-9]+)/.exec(header)?.[1];
  if (!timestamp || !provided) return false;

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSec) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}`}
                />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
