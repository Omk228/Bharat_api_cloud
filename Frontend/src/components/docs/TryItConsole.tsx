import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Play, Loader2, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

import { sampleInput, type ApiEndpoint } from "@/lib/api-catalog";
import { tryEndpoint } from "@/lib/demo-store";

export function TryItConsole({
  endpoint,
  apiKey,
  onApiKeyChange,
  signedIn,
}: {
  endpoint: ApiEndpoint;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  signedIn: boolean;
}) {
  const [payload, setPayload] = useState(() => JSON.stringify(sampleInput(endpoint), null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setPayload(JSON.stringify(sampleInput(endpoint), null, 2));
    setParseError(null);
  }, [endpoint]);

  const mutation = useMutation({
    mutationFn: async () => {
      let input: Record<string, unknown>;
      try {
        input = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        throw new Error("Request body is not valid JSON.");
      }
      return tryEndpoint({ endpointId: endpoint.id, apiKey: apiKey.trim(), input });
    },
    onError: (e: Error) => setParseError(e.message),
    onSuccess: () => setParseError(null),
  });

  const result = mutation.data;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Terminal className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Try it</h4>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {endpoint.method} {endpoint.path}
        </span>
      </div>

      {!signedIn ? (
        <div className="p-6 text-sm text-muted-foreground">
          <Link to="/auth" className="font-medium text-primary hover:underline">
            Create a free developer account
          </Link>{" "}
          to generate an API key and run live requests from this page.
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              API key
            </span>
            <input
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="sk_test_…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Paste a key from your{" "}
              <Link to="/dashboard" className="text-primary hover:underline">
                dashboard
              </Link>
              . Requests count against your monthly quota.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Request {endpoint.method === "GET" ? "parameters" : "body"}
            </span>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={Math.min(14, payload.split("\n").length + 1)}
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-terminal px-3 py-2 font-mono text-xs outline-none focus:border-primary"
            />
          </label>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !apiKey.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Send request
          </button>

          {parseError && <p className="text-xs text-destructive">{parseError}</p>}

          {result && (
            <div className="rounded-lg border border-border">
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2 text-xs">
                <span
                  className={
                    result.ok && result.status < 300
                      ? "font-mono text-success"
                      : "font-mono text-destructive"
                  }
                >
                  {result.status} {result.ok && result.status < 300 ? "OK" : "Error"}
                </span>
                {result.ok && (
                  <>
                    <span className="text-muted-foreground">{result.durationMs} ms</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">
                      {result.mode}
                    </span>
                    <span className="ml-auto text-muted-foreground">
                      {result.usage.used}/{result.usage.quota} requests this month
                    </span>
                  </>
                )}
              </div>
              <pre className="overflow-x-auto bg-terminal px-3 py-3 font-mono text-xs leading-relaxed">
                {result.ok ? result.body : JSON.stringify({ error: result.error }, null, 2)}
              </pre>
              {result.ok && result.note && (
                <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  {result.note}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
