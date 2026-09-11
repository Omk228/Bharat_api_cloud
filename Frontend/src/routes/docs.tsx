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
  Clock,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  API_GROUPS,
  BASE_URL,
  DEFAULT_ERROR_CODES,
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
import { ThemeToggle } from "@/components/theme-toggle";

export type DocsSearch = {
  endpoint?: string | undefined;
  id?: string | undefined;
};

export const Route = createFileRoute("/docs")({
  validateSearch: (search: Record<string, unknown>): DocsSearch => ({
    endpoint: typeof search["endpoint"] === "string" ? (search["endpoint"] as string) : undefined,
    id: typeof search["id"] === "string" ? (search["id"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "API Docs — KYC & Banking Verification Endpoints | Bharat API Cloud" },
      {
        name: "description",
        content:
          "Full Bharat API Cloud API reference: PAN, Aadhaar, GSTIN, penny-drop bank verification, Account Aggregator and payouts. Live Try-It console, SDK snippets and webhook signature tester.",
      },
      { property: "og:title", content: "Bharat API Cloud API Documentation" },
      {
        property: "og:description",
        content:
          "350+ KYC and banking endpoints with request/response examples, SDKs in 6 languages and an interactive console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const searchParams = Route.useSearch();
  const [signedIn, setSignedIn] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ApiGroup | "All">("All");
  const [method, setMethod] = useState<"All" | "GET" | "POST" | "DELETE">("All");

  const initialTarget = searchParams.endpoint || searchParams.id;
  const initialId = initialTarget && endpoints.some((e) => e.id === initialTarget)
    ? initialTarget
    : endpoints[0]!.id;

  const [activeId, setActiveId] = useState(initialId);
  const [lang, setLang] = useState<LanguageId>("curl");
  const [apiKey, setApiKey] = useState("");

  // Sync activeId when URL query changes (e.g. clicking different API cards from dashboard)
  useEffect(() => {
    const target = searchParams.endpoint || searchParams.id;
    if (target && endpoints.some((e) => e.id === target)) {
      setActiveId(target);
    }
  }, [searchParams.endpoint, searchParams.id]);

  useEffect(() => {
    setSignedIn(Boolean(getSession()));
    const sync = () => setSignedIn(Boolean(getSession()));
    window.addEventListener("bharatapi:state", sync);
    return () => window.removeEventListener("bharatapi:state", sync);
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
            <span className="text-lg font-semibold tracking-tight">Bharat API Cloud</span>
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">Developer docs</span>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
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
            <h1 className="text-2xl font-bold tracking-tight">Bharat API Cloud reference</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              REST over HTTPS, JSON in and out. Base URL{" "}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(BASE_URL);
                  toast.success("Base Gateway URL copied!");
                }}
                title="Click to copy Base Gateway URL"
                className="inline-flex items-center gap-1 rounded bg-terminal px-2 py-0.5 font-mono text-xs text-primary hover:bg-secondary border border-border/60 transition-colors cursor-pointer"
              >
                {BASE_URL}
                <Copy className="h-3 w-3 text-muted-foreground ml-0.5" />
              </button>
              . Authenticate every request with{" "}
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
            </div>
            <div className="space-y-4">
              <CodeBlock title="Install SDK / Client" code={INSTALL_COMMANDS[lang]} />
              {active.id === "verify-pan" && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" /> Interactive Test Console
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Test live PAN verification with full dynamic identity cards and raw responses in the dedicated console.
                  </p>
                  <Link
                    to="/dashboard/test-api"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                  >
                    ⚡ Open Test API Console
                  </Link>
                </div>
              )}
            </div>
          </section>

          <WebhookTester keys={account?.keys ?? []} signedIn={signedIn} />

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Errors & HTTP Status Codes</h2>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
                <ShieldCheck className="h-3.5 w-3.5" /> Failed billable requests automatically refund to wallet
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Code</th>
                    <th className="px-4 py-2.5 font-medium">Meaning</th>
                    <th className="px-4 py-2.5 font-medium">Response / Retry Time</th>
                    <th className="px-4 py-2.5 font-medium">Refund Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["400", "invalid_request", "A required parameter is missing, invalid format or malformed JSON.", "< 120ms (Instant)", "No charge", "text-foreground"],
                    ["401", "invalid_api_key", "Missing, revoked or wrong-environment API key / token auth failure.", "< 80ms (Instant)", "No charge", "text-foreground"],
                    ["402", "insufficient_credits", "Wallet balance too low for a billable verification.", "< 100ms (Instant)", "No charge", "text-foreground"],
                    ["404", "not_found", "The requested record, PAN or reference id does not exist.", "~150ms", "No charge", "text-foreground"],
                    ["409", "duplicate_request", "An identical idempotency key was already processed.", "~120ms", "No charge", "text-foreground"],
                    ["412", "precondition_failed", "Precondition or entity validation verification check failed.", "~300ms", "Refund processed", "text-primary"],
                    ["429", "rate_limited", "Plan rate limit or monthly quota exhausted. Auto-resets in 60s.", "Wait 60s", "No charge", "text-foreground"],
                    ["500", "internal_server_error", "Server processing error occurred. Retry with exponential backoff.", "~500ms (Retry 5s)", "Refund processed", "text-primary"],
                    ["502", "provider_unavailable", "Upstream government/bank source timed out or unreachable.", "15s Timeout", "Refund processed", "text-primary"],
                    ["503", "service_unavailable", "Upstream ITD/NSDL/Bank portal is under maintenance window.", "Retry in 30s", "Refund processed", "text-primary"],
                    ["504", "gateway_timeout", "Upstream verification gateway timed out after waiting.", "15s Timeout", "Refund processed", "text-primary"],
                    ["505", "http_version_not_supported", "HTTP version not supported by the gateway.", "< 50ms", "No charge", "text-foreground"],
                  ].map(([status, code, meaning, time, refund, refundTone]) => (
                    <tr key={code} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${
                          Number(status) >= 500
                            ? "bg-destructive/15 text-destructive border border-destructive/20"
                            : Number(status) >= 400
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            : "bg-secondary text-foreground"
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-primary text-xs font-medium">{code}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{meaning}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/70" /> {time}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          refund === "Refund processed"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {refund}
                        </span>
                      </td>
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <section className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
            {endpoint.method}
          </span>
          <code className="font-mono text-sm bg-secondary/60 px-2.5 py-1 rounded border border-border/60">{endpoint.path}</code>
          <button
            type="button"
            onClick={() => handleCopy(endpoint.path, "Endpoint Path")}
            title="Copy Endpoint Path"
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/60 transition-colors cursor-pointer active:scale-95"
          >
            {copiedField === "Endpoint Path" ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-[11px]">Copy Path</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleCopy(`${BASE_URL}${endpoint.path}`, "Full Endpoint URL")}
            title="Copy Full Endpoint URL"
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-colors cursor-pointer active:scale-95"
          >
            {copiedField === "Full Endpoint URL" ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-[11px]">Copied Full URL</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-[11px]">Copy Full URL</span>
              </>
            )}
          </button>
          {endpoint.latency && (
            <span className="text-xs text-muted-foreground ml-auto">avg {endpoint.latency}</span>
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
        <ResponseTabsViewer endpoint={endpoint} />
      </div>
    </section>
  );
}

function ResponseTabsViewer({ endpoint }: { endpoint: ApiEndpoint }) {
  const [tab, setTab] = useState<"success" | "failed" | "errors">("success");
  const [copied, setCopied] = useState(false);

  const successJson = useMemo(
    () => JSON.stringify(endpoint.sampleResponse, null, 2),
    [endpoint.sampleResponse]
  );

  const failedJson = useMemo(() => {
    if (endpoint.sampleFailedResponse) {
      return JSON.stringify(endpoint.sampleFailedResponse, null, 2);
    }
    return JSON.stringify(
      {
        http_response_code: 200,
        result_code: 102,
        request_id: "0199c2bb-4b54-8af1-80e4-5506bd8a86c7",
        client_ref_num: "testapis-jc36fwn",
        message: "Invalid input or entity verification failed",
        result: {
          status: "Invalid",
        },
      },
      null,
      2
    );
  }, [endpoint.sampleFailedResponse]);

  const errorList = endpoint.errorCodes ?? DEFAULT_ERROR_CODES;
  const statusMsg = endpoint.statusMessage ?? "Refund processed";

  const errorJson = useMemo(
    () =>
      JSON.stringify(
        {
          http_response_code: 400,
          result_code: 103,
          request_id: "0199c2bb-4b54-8af1-80e4-5506bd8a86c7",
          client_ref_num: "testapis-jc36fwn",
          message: "Invalid Pan number or combination of inputs",
          status_message: statusMsg,
        },
        null,
        2
      ),
    [statusMsg]
  );

  const activeCode = tab === "success" ? successJson : tab === "failed" ? failedJson : errorJson;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Response Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setTab("success")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === "success"
                ? "bg-success/15 text-success border border-success/30 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Response (200 · 101)
          </button>
          <button
            onClick={() => setTab("failed")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === "failed"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Failed Response (200 · 102)
          </button>
          <button
            onClick={() => setTab("errors")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === "errors"
                ? "bg-destructive/15 text-destructive border border-destructive/30 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            Possible Error Codes
          </button>
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(activeCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-muted-foreground transition-colors hover:text-foreground p-1"
          aria-label="Copy response"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      {tab === "success" && (
        <div>
          <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground font-mono">
            <span className="text-success flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-success"></span>
              HTTP 200 OK · result_code: 101 (Verified)
            </span>
          </div>
          <pre className="max-h-[380px] overflow-x-auto overflow-y-auto bg-terminal px-4 py-3 font-mono text-xs leading-relaxed text-foreground/90">
            {successJson}
          </pre>
        </div>
      )}

      {tab === "failed" && (
        <div>
          <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground font-mono">
            <span className="text-amber-400 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
              HTTP 200 OK · result_code: 102 (Invalid Input / Failed)
            </span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary font-sans font-medium">
              Status: {statusMsg}
            </span>
          </div>
          <pre className="max-h-[380px] overflow-x-auto overflow-y-auto bg-terminal px-4 py-3 font-mono text-xs leading-relaxed text-foreground/90">
            {failedJson}
          </pre>
        </div>
      )}

      {tab === "errors" && (
        <div className="p-4 space-y-4 max-h-[440px] overflow-y-auto">
          {/* Status Message Info */}
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
            <div className="mt-0.5 rounded-full bg-primary/20 p-1 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Status Message:</span>
                <span className="rounded-md bg-primary/20 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                  {statusMsg}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground leading-relaxed">
                Billable requests resulting in failed verification or upstream error codes automatically initiate a wallet credit refund.
              </p>
            </div>
          </div>

          {/* Error Codes Table */}
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Possible Error Codes
            </span>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {errorList.map((err) => (
                    <tr key={err.code} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      <td className="px-3 py-2 font-mono font-semibold text-destructive">
                        {err.code}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{err.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample Error Payload */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sample Error Payload
            </span>
            <pre className="overflow-x-auto rounded-lg border border-border bg-terminal px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground/90">
              {errorJson}
            </pre>
          </div>
        </div>
      )}
    </div>
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
                    Bharat-API-Signature header
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

export function verifyBharatApiSignature(rawBody, header, secret, toleranceSec = 300) {
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
