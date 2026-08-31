import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ShieldCheck,
  KeyRound,
  Activity,
  Loader2,
  LogOut,
  BookOpen,
  Radio,
  Wallet,
  Layers,
  Webhook,
} from "lucide-react";
import React from "react";

import { endpoints } from "@/lib/api-catalog";
import { getDashboard, signOut, type DashboardData } from "@/lib/demo-store";

export function DashboardLayout({
  children,
  activeTab,
}: {
  children: (data: DashboardData) => React.ReactNode;
  activeTab: "overview" | "wallet" | "apis" | "logs" | "webhooks";
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const routerState = useRouterState();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => getDashboard(),
  });

  function handleSignOut() {
    signOut();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPath = routerState.location.pathname;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Console Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Bharat API Cloud</span>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              Console
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Quick Wallet Pill */}
            <Link
              to="/dashboard/wallet"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>₹{data.walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </Link>

            <Link
              to="/status"
              className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              <Radio className="h-4 w-4" /> Status
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <BookOpen className="h-4 w-4" /> Docs
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* Welcome Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back{data.profile.display_name ? `, ${data.profile.display_name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.profile.company_name || "Developer Account"} · {data.limits.label} plan
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Wallet Balance</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-primary">
                ₹{data.walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Route Links */}
        <div className="flex overflow-x-auto border-b border-border/80 pb-px">
          <div className="flex items-center gap-2">
            <NavRouteLink
              to="/dashboard"
              active={activeTab === "overview" || currentPath === "/dashboard"}
              icon={<KeyRound className="h-4 w-4" />}
              label="Overview & Keys"
            />
            <NavRouteLink
              to="/dashboard/wallet"
              active={activeTab === "wallet" || currentPath.startsWith("/dashboard/wallet")}
              icon={<Wallet className="h-4 w-4" />}
              label="Wallet & Billing"
              badge={`₹${data.walletBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            />
            <NavRouteLink
              to="/dashboard/apis"
              active={activeTab === "apis" || currentPath.startsWith("/dashboard/apis")}
              icon={<Layers className="h-4 w-4" />}
              label="API Directory"
              badge={`${endpoints.length}`}
            />
            <NavRouteLink
              to="/dashboard/logs"
              active={activeTab === "logs" || currentPath.startsWith("/dashboard/logs")}
              icon={<Activity className="h-4 w-4" />}
              label="API Hit Logs"
              badge={`${data.apiHitLogs.length}`}
            />
            <NavRouteLink
              to="/dashboard/webhooks"
              active={activeTab === "webhooks" || currentPath.startsWith("/dashboard/webhooks")}
              icon={<Webhook className="h-4 w-4" />}
              label="Webhooks & Audit"
            />
          </div>
        </div>

        {/* Route Page Content */}
        {children(data)}
      </main>
    </div>
  );
}

function NavRouteLink({
  to,
  active,
  icon,
  label,
  badge,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
        active
          ? "border-primary font-semibold text-foreground"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            active ? "bg-primary/20 text-primary font-semibold" : "bg-secondary text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
