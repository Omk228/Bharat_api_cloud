import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck, Loader2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DEMO_EMAIL, DEMO_PASSWORD, getSession, signIn } from "@/lib/demo-store";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Developer Sign In — VeroKYC API Console" },
      {
        name: "description",
        content:
          "Sign in to the VeroKYC developer console with demo credentials to generate API keys, rotate secrets, export usage logs and test KYC and banking endpoints.",
      },
      { property: "og:title", content: "Developer Sign In — VeroKYC" },
      {
        property: "og:description",
        content: "Sign in with demo credentials to generate API keys and test KYC & banking endpoints.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getSession()) navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      signIn(email, password, mode === "signup" ? name : undefined);
      if (mode === "signup" && company.trim()) {
        // company is captured again during onboarding; keep the value handy
        window.sessionStorage.setItem("verokyc.signup.company", company.trim());
      }
      toast.success("Signed in to the demo console.");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function useDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setMode("signin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">VeroKYC</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signup" ? "Create a developer account" : "Sign in to your console"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate API keys, rotate secrets, export logs and replay webhooks.
          </p>

          <div className="mt-5 rounded-lg border border-primary/40 bg-primary/5 p-4 text-xs">
            <p className="font-semibold uppercase tracking-wider text-primary">Demo credentials</p>
            <p className="mt-2 font-mono text-foreground">{DEMO_EMAIL}</p>
            <p className="font-mono text-foreground">{DEMO_PASSWORD}</p>
            <button
              onClick={useDemo}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <Wand2 className="h-3.5 w-3.5" /> Fill demo login
            </button>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              This build runs without a database — any email plus a 6+ character password works, and your
              console data is stored locally in this browser.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field label="Your name" value={name} onChange={setName} placeholder="Aarav Sharma" />
                <Field
                  label="Company"
                  value={company}
                  onChange={setCompany}
                  placeholder="Acme Fintech Pvt Ltd"
                />
              </>
            )}
            <Field
              label="Work email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to VeroKYC?"}{" "}
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={255}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
    </label>
  );
}
