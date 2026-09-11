import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  KeyRound,
  Plus,
  Copy,
  Loader2,
  RefreshCw,
  Ban,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import type { ApiKeyRow } from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Developer Dashboard — Bharat API Cloud" },
      {
        name: "description",
        content: "API keys, usage monitoring, and rate limits.",
      },
    ],
  }),
  component: DashboardOverviewPage,
});

function DashboardOverviewPage() {
  return (
    <DashboardLayout activeTab="overview">
      {(data) => {
        return (
          <div className="space-y-6">
            <ApiKeys keys={data.keys} />
          </div>
        );
      }}
    </DashboardLayout>
  );
}

function SectionHeading({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon} {title}
      </h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function ApiKeys({ keys: _fallbackKeys }: { keys: ApiKeyRow[] }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("Client Server Key");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [visibleTokens, setVisibleTokens] = useState<Record<number, boolean>>({});

  const { data: serverCreds, isLoading } = useQuery({
    queryKey: ["credentials"],
    queryFn: async () => {
      try {
        return await apiClient.getCredentials();
      } catch {
        return [];
      }
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["credentials"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => apiClient.generateCredentials({ label, environment }),
    onSuccess: () => {
      toast.success("New API credentials generated successfully!");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rotateMutation = useMutation({
    mutationFn: async (id: number) => apiClient.rotateToken(id),
    onSuccess: () => {
      toast.success("Token ID rotated successfully! Update your server config.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => apiClient.revokeCredential(id),
    onSuccess: () => {
      toast.success("Credential revoked successfully.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const creds = serverCreds || [];

  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<KeyRound className="h-4 w-4 text-primary" />}
        title="API Credentials (API ID, Key & Token)"
      />

      {/* Generator Box */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Key Label
            </span>
            <input
              value={label}
              maxLength={60}
              placeholder="e.g. AWS Production Backend"
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Environment
            </span>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "sandbox" | "production")}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="sandbox">Sandbox (UAT)</option>
              <option value="production">Production (Live)</option>
            </select>
          </label>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generate New Key
          </button>
        </div>
      </div>

      {/* Credentials Cards List */}
      <div className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading credentials...
          </div>
        )}

        {!isLoading && creds.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No active API credentials found. Click &quot;Generate New Key&quot; above to create one.
          </div>
        )}

        {creds.map((c) => {
          const isVisible = visibleTokens[c.id] ?? false;
          return (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 transition-all hover:border-primary/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-sm">{c.label}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ${
                      c.environment === "production"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    {c.environment}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {c.status}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => rotateMutation.mutate(c.id)}
                    disabled={rotateMutation.isPending}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Rotate Token
                  </button>
                  <button
                    onClick={() => revokeMutation.mutate(c.id)}
                    disabled={revokeMutation.isPending}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Ban className="h-3.5 w-3.5" /> Revoke
                  </button>
                </div>
              </div>

              {/* 3 Key Rows */}
              <div className="grid gap-3 sm:grid-cols-3">
                {/* 1. API ID */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-medium uppercase tracking-wider">API ID</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.api_id);
                        toast.success("API ID copied!");
                      }}
                      className="text-muted-foreground hover:text-primary p-1"
                      title="Copy API ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <code className="block font-mono text-xs font-semibold text-primary break-all">
                    {c.api_id}
                  </code>
                </div>

                {/* 2. API Key */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-medium uppercase tracking-wider">API Key</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.api_key);
                        toast.success("API Key copied!");
                      }}
                      className="text-muted-foreground hover:text-primary p-1"
                      title="Copy API Key"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <code className="block font-mono text-xs text-foreground/90 break-all">
                    {c.api_key}
                  </code>
                </div>

                {/* 3. Token ID */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-medium uppercase tracking-wider">Token ID</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setVisibleTokens((prev) => ({ ...prev, [c.id]: !isVisible }))
                        }
                        className="text-muted-foreground hover:text-primary p-1"
                        title={isVisible ? "Hide Token" : "Show Token"}
                      >
                        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(c.token_id || c.token_id_preview);
                          toast.success("Token ID copied!");
                        }}
                        className="text-muted-foreground hover:text-primary p-1"
                        title="Copy Token ID"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <code className="block font-mono text-xs text-foreground/90 break-all">
                    {isVisible ? c.token_id || c.token_id_preview : c.token_id_preview}
                  </code>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
