import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Layers,
  Search,
  Clock,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { endpoints, API_GROUPS, type ApiGroup } from "@/lib/api-catalog";

export const Route = createFileRoute("/_authenticated/dashboard/apis")({
  head: () => ({
    meta: [
      { title: "API Directory & Catalog — Bharat API Cloud" },
      {
        name: "description",
        content: "Explore 350+ Banking, KYC verification, Account Aggregator, and Payout APIs.",
      },
    ],
  }),
  component: ApisPage,
});

function ApisPage() {
  const [selectedGroup, setSelectedGroup] = useState<ApiGroup | "All">("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return endpoints.filter((e) => {
      if (selectedGroup !== "All" && e.group !== selectedGroup) return false;
      if (!q) return true;
      const haystack = [e.title, e.desc, e.path, e.group, ...e.tags].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedGroup, query]);

  return (
    <DashboardLayout activeTab="apis">
      {() => (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Layers className="h-5 w-5 text-primary" /> API Catalog & Services
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Explore 350+ Banking, KYC verification, Account Aggregator, and Payout APIs.
              </p>
            </div>

            <Link
              to="/docs"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" /> Open Interactive Try-It Docs <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Category Pills */}
            <div className="flex overflow-x-auto gap-1.5 pb-1">
              <button
                onClick={() => setSelectedGroup("All")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedGroup === "All"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                All Categories ({endpoints.length})
              </button>
              {API_GROUPS.map((g) => {
                const count = endpoints.filter((e) => e.group === g).length;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedGroup === g
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search Bar */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search API name, path, tag..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-card py-1.5 pl-9 pr-3 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Grid of APIs */}
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((ep) => (
              <div
                key={ep.id}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                        ep.method === "POST"
                          ? "bg-primary/15 text-primary"
                          : ep.method === "GET"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {ep.method}
                    </span>

                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {ep.group}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {ep.title}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-muted-foreground break-all">{ep.path}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">{ep.desc}</p>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ep.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3 text-primary" /> {ep.latency} avg latency
                  </span>

                  <div className="flex items-center gap-2">
                    {ep.id === "verify-pan" && (
                      <Link
                        to="/dashboard/test-api"
                        className="inline-flex items-center gap-1 rounded bg-primary/10 border border-primary/30 px-2 py-0.5 font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    <Link
                      to="/docs"
                      search={{ endpoint: ep.id }}
                      className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Schema & cURL <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
