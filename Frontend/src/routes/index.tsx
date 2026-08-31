import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldCheck,
  Landmark,
  Fingerprint,
  CreditCard,
  ArrowRight,
  Check,
  Copy,
  Terminal,
  Globe,
  Lock,
  Zap,
  FileCheck,
  Banknote,
  ScanFace,
  Building2,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bharat API Cloud — KYC & Banking APIs for Fintechs" },
      {
        name: "description",
        content:
          "Bharat API Cloud provides production-ready KYC verification, identity checks, and banking APIs. Verify users, validate accounts, and go live in days.",
      },
      { property: "og:title", content: "Bharat API Cloud — KYC & Banking APIs for Fintechs" },
      {
        property: "og:description",
        content:
          "Production-ready KYC verification, identity checks, and banking APIs. Verify users, validate accounts, and go live in days.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const codeSnippet = `curl https://api.bharatapicloud.io/v1/verify/kyc \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "pan": "ABCDE1234F",
    "name": "Aarav Sharma",
    "dob": "1990-04-12"
  }'`;

const responseSnippet = `{
  "status": "verified",
  "match_score": 0.98,
  "pan_valid": true,
  "name_match": "exact",
  "request_id": "kyc_8f3a2c1d"
}`;

function CodeBlock({ code, title }: { code: string; title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-terminal">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Terminal className="h-3.5 w-3.5" />
          {title}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground/90">
        {code}
      </pre>
    </div>
  );
}

const products = [
  {
    icon: ScanFace,
    title: "KYC Verification API",
    desc: "PAN, Aadhaar (via DigiLocker), GSTIN, and document OCR verification with liveness detection. Real-time results in under 3 seconds.",
    tags: ["PAN", "Aadhaar", "OCR", "Liveness"],
  },
  {
    icon: Landmark,
    title: "Bank Account Verification",
    desc: "Penny-drop and reverse penny-drop verification for 400+ banks. Validate account holder names before disbursals and payouts.",
    tags: ["Penny Drop", "IFSC", "400+ Banks"],
  },
  {
    icon: Banknote,
    title: "Account Aggregator",
    desc: "Consent-based access to bank statements and financial data through RBI-regulated Account Aggregator rails.",
    tags: ["AA Rails", "Bank Statements", "Consent"],
  },
  {
    icon: CreditCard,
    title: "Payouts & Collections",
    desc: "IMPS, NEFT, RTGS, and UPI payouts with virtual account collections. Automated reconciliation included.",
    tags: ["IMPS", "UPI", "Virtual Accounts"],
  },
];

const stats = [
  { value: "99.98%", label: "API uptime SLA" },
  { value: "<3s", label: "Avg. verification time" },
  { value: "120M+", label: "Verifications processed" },
  { value: "400+", label: "Banks connected" },
];

const pricing = [
  {
    name: "Sandbox",
    price: "Free",
    desc: "Test every API with unlimited sandbox calls.",
    features: ["Unlimited sandbox calls", "Test data & webhooks", "API docs & SDKs", "Community support"],
    cta: "Start building",
    featured: false,
  },
  {
    name: "Growth",
    price: "₹4,999",
    period: "/mo",
    desc: "For startups going live with verification flows.",
    features: [
      "10,000 API calls / month",
      "PAN + bank verification",
      "99.9% uptime SLA",
      "Email & chat support",
      "Webhook retries",
    ],
    cta: "Go live",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "High-volume, regulated workloads with dedicated infra.",
    features: [
      "Unlimited volume pricing",
      "All APIs incl. AA & payouts",
      "99.98% uptime SLA",
      "Dedicated success manager",
      "Custom data residency",
      "On-prem deployment option",
    ],
    cta: "Talk to sales",
    featured: false,
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Bharat API Cloud</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#products" className="transition-colors hover:text-foreground">Products</a>
            <a href="#developers" className="transition-colors hover:text-foreground">Developers</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href="/docs" className="transition-colors hover:text-foreground">Docs</a>
            <a href="/status" className="transition-colors hover:text-foreground">Status</a>

          </nav>
          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Sign in
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get API keys <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="grid-bg relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              All systems operational · v2.4 live
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient">KYC & Banking APIs</span>
              <br />
              built for India&apos;s fintechs
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Verify identities, validate bank accounts, and move money with one
              integration. RBI-compliant infrastructure trusted by 500+ lenders,
              NBFCs, and fintech platforms.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </a>
            <a
              href="/docs"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold transition-colors hover:bg-accent"
            >
              <Terminal className="h-4 w-4" /> View API docs
            </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> ISO 27001</span>
              <span className="flex items-center gap-1.5"><FileCheck className="h-3.5 w-3.5" /> SOC 2 Type II</span>
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> RBI compliant</span>
            </div>
          </div>
          <div className="glow-primary space-y-4">
            <CodeBlock code={codeSnippet} title="POST /v1/verify/kyc" />
            <CodeBlock code={responseSnippet} title="200 OK · 1.8s" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Products</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            One platform for identity & banking rails
          </h2>
          <p className="mt-4 text-muted-foreground">
            Modular APIs you can adopt individually or as a complete stack — from
            onboarding to disbursal.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {products.map((p) => (
            <div
              key={p.title}
              className="group rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Developers */}
      <section id="developers" className="border-y border-border bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Developers</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Integrate in an afternoon, not a quarter
            </h2>
            <ul className="mt-8 space-y-5">
              {[
                { icon: Zap, text: "RESTful APIs with idempotent requests and sub-second p99 latency" },
                { icon: Globe, text: "SDKs for Node.js, Python, Java, Go, and PHP" },
                { icon: Lock, text: "Webhooks with HMAC signatures and automatic retries" },
                { icon: Fingerprint, text: "Sandbox mirrors production — no surprise behavior at go-live" },
              ].map((f) => (
                <li key={f.text} className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <f.icon className="h-4.5 w-4.5" />
                  </div>
                  <p className="pt-1.5 text-sm text-muted-foreground">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <CodeBlock
            title="Node.js SDK"
            code={`import { BharatApiClient } from "@bharatapicloud/sdk";

const client = new BharatApiClient(process.env.BHARAT_API_KEY);

const result = await client.kyc.verifyPan({
  pan: "ABCDE1234F",
  name: "Aarav Sharma",
});

if (result.status === "verified") {
  await client.bank.verifyAccount({
    account: "50100234567890",
    ifsc: "HDFC0001234",
  });
}`}
          />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Start free, scale on volume
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Transparent per-call pricing. No setup fees, no minimum commitments.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {pricing.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.featured
                  ? "glow-primary border-primary bg-card"
                  : "border-border bg-card"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.desc}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90 ${
                  plan.featured
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-secondary"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="grid-bg border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ship compliant onboarding this week
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Get sandbox keys instantly. Talk to our team about production access and volume pricing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get API keys <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="inline-flex items-center rounded-lg border border-border bg-card px-8 py-3 font-semibold transition-colors hover:bg-accent"
            >
              Contact sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-semibold">Bharat API Cloud</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              KYC & banking infrastructure for modern financial products.
            </p>
          </div>
          {[
            { h: "Products", links: ["KYC Verification", "Bank Verification", "Account Aggregator", "Payouts"] },
            { h: "Developers", links: ["API Reference", "SDKs", "Sandbox", "Status"] },
            { h: "Company", links: ["About", "Security", "Compliance", "Contact"] },
          ].map((col) => (
            <div key={col.h}>
              <h4 className="text-sm font-semibold">{col.h}</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="transition-colors hover:text-foreground">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © 2026 Bharat API Cloud Technologies Pvt. Ltd. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
