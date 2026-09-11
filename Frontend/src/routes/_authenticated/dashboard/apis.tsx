import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Layers,
  Search,
  Clock,
  ExternalLink,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { endpoints, API_GROUPS, BASE_URL, type ApiGroup, type ApiEndpoint } from "@/lib/api-catalog";
import { apiClient } from "@/lib/api-client";
import { getStoredUserEmail } from "@/lib/demo-store";

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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyEndpoint = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Endpoint path copied to clipboard");
    setTimeout(() => setCopiedId(null), 1800);
  };
  const [selectedGroup, setSelectedGroup] = useState<ApiGroup | "All">("All");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "not_assigned">("all");
  const [query, setQuery] = useState("");

  const userEmail = getStoredUserEmail();

  const { data: pricingData } = useQuery({
    queryKey: ["user-pricing", userEmail],
    queryFn: () => apiClient.getUserPricing({ email: userEmail }),
    staleTime: 30_000,
  });

  const getEndpointPrice = (ep: ApiEndpoint): { price: number; isCustom: boolean; isAssigned: boolean } => {
    if (!pricingData?.catalog || pricingData.catalog.length === 0) {
      return { price: 2.0, isCustom: false, isAssigned: false };
    }

    // 1. Map endpoint ID to canonical database catalog ID
    const canonicalCatalogId =
      ep.id === "verify-pan"
        ? "api_cat_03"
        : ep.id === "ifsc-lookup"
        ? "api_cat_01"
        : ep.id === "transunion-score-hybrid"
        ? "api_transunion_cibil_v5"
        : ep.id.startsWith("api_")
        ? ep.id
        : `api_${ep.id.replace(/-/g, "_")}`;

    // 2. Find by canonical catalog ID or raw ID
    let catalogItem = pricingData.catalog.find(
      (c) =>
        c.id === canonicalCatalogId ||
        c.id === ep.id ||
        (ep.id === "verify-pan" && c.id === "api_verify_pan")
    );

    // 3. Find by exact endpoint path (strict equality, avoiding false substring overlaps)
    if (!catalogItem) {
      catalogItem = pricingData.catalog.find((c) => c.endpoint_path === ep.path);
    }

    // 4. Resolve known alias routes
    if (!catalogItem) {
      if (ep.id === "mobile-to-prefill") {
        catalogItem = pricingData.catalog.find(
          (c) => c.id === "api_mobile_to_prefill" || c.endpoint_path === "/srv4/credit-report/prefill"
        );
      } else if (ep.id === "ifsc-lookup") {
        catalogItem = pricingData.catalog.find(
          (c) => c.id === "api_cat_01" || c.endpoint_path === "/ifsc" || c.endpoint_path === "/bank/ifsc/:code"
        );
      } else if (ep.id === "verify-pan") {
        catalogItem = pricingData.catalog.find(
          (c) => c.id === "api_cat_03" || c.id === "api_verify_pan" || c.endpoint_path === "/srv2/validation/pan"
        );
      } else if (ep.id === "transunion-score-hybrid") {
        catalogItem = pricingData.catalog.find(
          (c) => c.id === "api_transunion_cibil_v5" || c.endpoint_path === "/srv5/transunion-Score-Hybrid"
        );
      }
    }

    if (catalogItem) {
      return {
        price: catalogItem.effective_price,
        isCustom: catalogItem.is_custom,
        isAssigned: catalogItem.is_assigned === true,
      };
    }

    // Fallback by service key if catalog table lookup was empty
    const serviceKey = ep.id.replace(/-/g, "_");
    if (pricingData?.pricing?.[serviceKey] !== undefined) {
      return {
        price: pricingData.pricing[serviceKey] ?? 2.0,
        isCustom: false,
        isAssigned: pricingData.assigned?.[serviceKey] === true,
      };
    }

    return { price: 2.0, isCustom: false, isAssigned: false };
  };

  const assignedCount = useMemo(() => {
    return endpoints.filter((e) => getEndpointPrice(e).isAssigned).length;
  }, [pricingData]);

  const unassignedCount = useMemo(() => {
    return endpoints.filter((e) => !getEndpointPrice(e).isAssigned).length;
  }, [pricingData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return endpoints.filter((e) => {
      if (selectedGroup !== "All" && e.group !== selectedGroup) return false;

      const { isAssigned } = getEndpointPrice(e);
      if (assignmentFilter === "assigned" && !isAssigned) return false;
      if (assignmentFilter === "not_assigned" && isAssigned) return false;

      if (!q) return true;
      const haystack = [e.title, e.desc, e.path, e.group, ...e.tags].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedGroup, query, assignmentFilter, pricingData]);

  return (
    <DashboardLayout activeTab="apis">
      {() => (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Layers className="h-5 w-5 text-primary" /> API Catalog &amp; Services
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

          {/* Filter Bar: Status Filters + Category Filters + Search */}
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Assignment Status Filter (All / Assigned / Not Assigned) */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/30 p-1">
                <button
                  type="button"
                  onClick={() => setAssignmentFilter("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    assignmentFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  All APIs ({endpoints.length})
                </button>

                <button
                  type="button"
                  onClick={() => setAssignmentFilter("assigned")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    assignmentFilter === "assigned"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  ✓ Assigned ({assignedCount})
                </button>

                <button
                  type="button"
                  onClick={() => setAssignmentFilter("not_assigned")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    assignmentFilter === "not_assigned"
                      ? "bg-amber-500 text-black shadow-sm font-bold"
                      : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  🔒 Not Assigned ({unassignedCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[260px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search API name, path, tag..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex overflow-x-auto gap-1.5 pt-2 border-t border-border/60">
              <button
                onClick={() => setSelectedGroup("All")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                  selectedGroup === "All"
                    ? "bg-secondary text-foreground font-semibold border border-primary/40"
                    : "border border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                All Categories
              </button>
              {API_GROUPS.map((g) => {
                const count = endpoints.filter((e) => e.group === g).length;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                      selectedGroup === g
                        ? "bg-secondary text-foreground font-semibold border border-primary/40"
                        : "border border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {g} ({count})
                  </button>
                );
              })}
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

                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const { price, isCustom, isAssigned } = getEndpointPrice(ep);
                        if (!isAssigned) {
                          return (
                            <span className="rounded px-2 py-0.5 font-mono text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              🔒 Not Assigned
                            </span>
                          );
                        }
                        return (
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold ${
                              isCustom
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            ✓ ₹{price.toFixed(2)}
                          </span>
                        );
                      })()}
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {ep.group}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {ep.title}
                  </h3>
                  <div className="mt-1.5 flex items-center justify-between gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5 font-mono text-xs">
                    <span className="truncate text-muted-foreground select-all">{ep.path}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyEndpoint(ep.path, ep.id)}
                      title="Copy Endpoint path"
                      className="inline-flex shrink-0 items-center gap-1 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                    >
                      {copiedId === ep.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">{ep.desc}</p>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(ep.tags || []).slice(0, 3).map((tag) => (
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
                    <Clock className="h-3 w-3 text-primary" /> {ep.latency || "~200ms"} avg latency
                  </span>

                  <div className="flex items-center gap-2">
                    {ep.id === "digilocker-digital-kyc" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "digilocker" }}
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "verify-pan" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "pan" }}
                        className="inline-flex items-center gap-1 rounded bg-primary/10 border border-primary/30 px-2 py-0.5 font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "verify-pan-plus" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "pan_plus" }}
                        className="inline-flex items-center gap-1 rounded bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 font-medium text-sky-400 hover:bg-sky-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "aadhaar-without-otp" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "aadhaar" }}
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "mobile-to-bank-advance" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "mobile_to_bank" }}
                        className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "bank-penny-less" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "bank" }}
                        className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "mobile-to-prefill" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "prefill" }}
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "mobile-name-finder" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "name_finder" }}
                        className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "requester-ip-lookup" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "ip_lookup" }}
                        className="inline-flex items-center gap-1 rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "reverse-geocoding" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "reverse_geocode" }}
                        className="inline-flex items-center gap-1 rounded bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 font-medium text-teal-400 hover:bg-teal-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "bank-validation" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "bank_validation" }}
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "mobile-to-uan" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "uan" }}
                        className="inline-flex items-center gap-1 rounded bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "uan-to-employment" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "uan_direct" }}
                        className="inline-flex items-center gap-1 rounded bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 font-medium text-purple-400 hover:bg-purple-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "domain-age" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "domain_age" }}
                        className="inline-flex items-center gap-1 rounded bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "mobile-to-upi" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "mobile_upi" }}
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        ⚡ Test In Console
                      </Link>
                    )}
                    {ep.id === "ifsc-lookup" && (
                      <Link
                        to="/dashboard/test-api"
                        search={{ service: "ifsc" }}
                        className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
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
