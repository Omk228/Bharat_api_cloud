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
  Terminal,
  ShieldAlert,
  Ban,
  Mail,
} from "lucide-react";
import React from "react";

import { endpoints } from "@/lib/api-catalog";
import { getDashboard, signOut, type DashboardData } from "@/lib/demo-store";
import { ThemeToggle } from "@/components/theme-toggle";

export function DashboardLayout({
  children,
  activeTab,
}: {
  children: (data: DashboardData) => React.ReactNode;
  activeTab: "overview" | "wallet" | "apis" | "logs" | "webhooks" | "test_api";
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

  // Account Suspension Enforcement Screen
  if (data.isSuspended || data.profile?.is_suspended || data.profile?.is_active === false) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold tracking-tight">Bharat API Cloud</span>
              <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive border border-destructive/30">
                Account Suspended
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Suspended Lock Banner / Screen */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="mx-auto max-w-xl w-full rounded-2xl border border-destructive/40 bg-card p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Glowing Red Badge Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive border-2 border-destructive/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <ShieldAlert className="h-10 w-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-destructive border border-destructive/30">
                <Ban className="h-3.5 w-3.5" /> Access Restricted
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Your Account is Suspended by Admin
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your account access, developer console, API keys, test consoles, and live verification services have been suspended by the Bharat API Cloud administration.
              </p>
            </div>

            {/* Account Metadata Card */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Account Name:</span>
                <span className="font-semibold text-foreground">{data.profile.display_name || "Developer"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Registered Email:</span>
                <span className="font-mono font-medium text-foreground">{data.profile.contact_email || data.session?.email}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Account Status:</span>
                <span className="font-bold text-destructive flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-destructive animate-ping" /> Suspended by Admin
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground border-t border-border/60 pt-2">
                <span>Support Reference ID:</span>
                <span className="font-mono text-muted-foreground">ACC-SUSP-{(data.session?.email || data.profile?.contact_email)?.split('@')[0]?.toUpperCase() || 'USER'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href="mailto:support@bharatapicloud.io?subject=Account%20Reactivation%20Request"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-[0.99]"
              >
                <Mail className="h-4 w-4" /> Contact Support Team
              </a>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              If you believe this suspension is an error, please reach out to <span className="font-mono text-primary">support@bharatapicloud.io</span>.
            </p>
          </div>
        </div>
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
            <ThemeToggle />
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
              to="/dashboard/apis"
              active={activeTab === "apis" || currentPath.startsWith("/dashboard/apis")}
              icon={<Layers className="h-4 w-4" />}
              label="API Directory"
              badge={`${endpoints.length}`}
            />
            <NavRouteLink
              to="/dashboard/test-api"
              active={activeTab === "test_api" || currentPath.startsWith("/dashboard/test-api")}
              icon={<Terminal className="h-4 w-4 text-emerald-400" />}
              label="Test API"
              badge="New"
            />
            <NavRouteLink
              to="/dashboard/logs"
              active={activeTab === "logs" || currentPath.startsWith("/dashboard/logs")}
              icon={<Activity className="h-4 w-4" />}
              label="API Hit Logs"
              badge={data.apiHitLogs.length > 0 ? `${data.apiHitLogs.length}` : undefined}
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
