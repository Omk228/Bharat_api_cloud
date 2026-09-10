import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  History,
  CheckCircle2,
  Loader2,
  QrCode,
  Building2,
  CreditCard,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Zap,
  Info,
  Clock,
  Download,
  Receipt,
  FileCheck,
  Percent,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  downloadCsv,
  toCsv,
  topupWallet,
  type WalletTransactionRow,
} from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({
    meta: [
      { title: "Payment & Wallet Recharge — Bharat API Cloud" },
      {
        name: "description",
        content: "Instant UPI QR, Virtual Account IMPS/NEFT, and Corporate card payments for your prepaid API wallet.",
      },
    ],
  }),
  component: WalletPage,
});

const RECHARGE_PACKS = [
  { amount: 500, label: "Starter", bonus: 0, tag: "Standard" },
  { amount: 1000, label: "Standard", bonus: 0, tag: "Most Popular", popular: true },
  { amount: 2500, label: "Growth", bonus: 100, tag: "+₹100 Bonus" },
  { amount: 5000, label: "Scale", bonus: 350, tag: "+₹350 Bonus" },
  { amount: 10000, label: "Enterprise", bonus: 1000, tag: "+10% Extra", special: true },
];

function WalletPage() {
  const queryClient = useQueryClient();

  // Payment section state
  const [selectedPack, setSelectedPack] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "va" | "card">("upi");
  const [gstin, setGstin] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrExpirySeconds, setQrExpirySeconds] = useState(900); // 15 mins

  // Ledger filter state
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit">("all");
  const [search, setSearch] = useState("");

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : selectedPack;
  const currentPack = RECHARGE_PACKS.find((p) => p.amount === effectiveAmount);
  const bonusAmount = currentPack?.bonus || 0;
  const totalCredited = effectiveAmount + bonusAmount;

  // Dynamic UPI URL
  const upiId = "bharatapicloud@icici";
  const upiPayUri = `upi://pay?pa=${upiId}&pn=Bharat%20API%20Cloud&am=${effectiveAmount}&cu=INR&tn=Prepaid%20Wallet%20Topup`;

  // Countdown timer for dynamic QR code
  useEffect(() => {
    const timer = setInterval(() => {
      setQrExpirySeconds((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExecutePayment = () => {
    if (effectiveAmount < 100) {
      toast.error("Minimum recharge amount is ₹100");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      topupWallet({
        amount: totalCredited,
        paymentMethod:
          paymentMethod === "upi"
            ? "UPI Instant QR"
            : paymentMethod === "va"
            ? "Virtual Account (NEFT/IMPS)"
            : "Corporate Card",
        note: bonusAmount > 0 ? `Recharge ₹${effectiveAmount} (+₹${bonusAmount} Bonus Credit)` : `Recharge ₹${effectiveAmount}`,
      });

      toast.success(`🎉 Payment of ₹${effectiveAmount.toLocaleString("en-IN")} successful! ₹${totalCredited.toLocaleString("en-IN")} credited to your wallet.`);
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-pricing"] });
    }, 1200);
  };

  return (
    <DashboardLayout activeTab="wallet">
      {(data) => {
        const transactions = data.walletTransactions;
        const balance = data.walletBalance;

        const filteredTxns = transactions.filter((t) => {
          if (filterType !== "all" && t.type !== filterType) return false;
          if (search.trim()) {
            const q = search.toLowerCase();
            return (
              t.id.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q) ||
              (t.reference_id && t.reference_id.toLowerCase().includes(q)) ||
              (t.api_endpoint && t.api_endpoint.toLowerCase().includes(q))
            );
          }
          return true;
        });

        const totalCredits = transactions
          .filter((t) => t.type === "credit")
          .reduce((acc, curr) => acc + curr.amount, 0);
        const totalDebits = transactions
          .filter((t) => t.type === "debit")
          .reduce((acc, curr) => acc + curr.amount, 0);

        return (
          <div className="space-y-8">
            {/* Top Overview: Balance Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Prepaid API Wallet · Live Real-Time
                    </span>
                  </div>
                  <h2 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Zero maintenance charges. Balance automatically debits per successful API verification call.
                  </p>
                </div>

                {/* Quick Wallet Stats Strip */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card/80 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Total Recharged</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-success">
                      +₹{totalCredits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">API Consumption</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-foreground">
                      -₹{totalDebits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[11px] font-medium text-muted-foreground">Settlement SLA</p>
                    <p className="mt-0.5 flex items-center gap-1 font-mono text-sm font-bold text-primary">
                      <Zap className="h-3.5 w-3.5 text-primary" /> Instant (&lt;2s)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 💳 DEDICATED PAYMENT & RECHARGE SECTION */}
            {/* ========================================================================= */}
            <section className="space-y-6">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                    <CreditCard className="h-5 w-5 text-primary" /> Instant Wallet Recharge & Checkout
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select a pack or enter custom amount. Instant credit via UPI, Net Banking, or Virtual Account.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> 256-Bit Bank-Grade TLS Encryption
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left Column: Recharge Amount & Payment Method Selection (7 Cols) */}
                <div className="space-y-6 lg:col-span-7">
                  {/* Step 1: Select Pack */}
                  <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Step 1 · Choose Recharge Pack
                      </span>
                      {bonusAmount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                          <Sparkles className="h-3.5 w-3.5" /> +₹{bonusAmount} Extra Credit Applied!
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
                      {RECHARGE_PACKS.map((pack) => {
                        const isSelected = selectedPack === pack.amount && !customAmount;
                        return (
                          <button
                            key={pack.amount}
                            type="button"
                            onClick={() => {
                              setSelectedPack(pack.amount);
                              setCustomAmount("");
                            }}
                            className={`relative flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                                : "border-border bg-secondary/30 hover:border-border/80 hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {pack.popular && (
                              <span className="absolute -top-2.5 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                                POPULAR
                              </span>
                            )}
                            {pack.special && (
                              <span className="absolute -top-2.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white">
                                10% EXTRA
                              </span>
                            )}
                            <span className="font-mono text-sm font-bold text-foreground">
                              ₹{pack.amount.toLocaleString("en-IN")}
                            </span>
                            <span className="mt-1 text-[10px] font-semibold text-primary">
                              {pack.tag}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Amount Input */}
                    <div className="pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Or enter custom amount:</span>
                        <span className="text-[11px]">Min. ₹100 — Max. ₹5,00,000</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted-foreground">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={100}
                          max={500000}
                          placeholder="e.g. 15000"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-2.5 font-mono text-sm font-semibold outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Payment Rail Selection */}
                  <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Step 2 · Select Payment Method
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("upi")}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all cursor-pointer ${
                          paymentMethod === "upi"
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <QrCode className="h-5 w-5" />
                        <span className="text-xs">UPI / Dynamic QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("va")}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all cursor-pointer ${
                          paymentMethod === "va"
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Building2 className="h-5 w-5" />
                        <span className="text-xs">Virtual Account (NEFT)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all cursor-pointer ${
                          paymentMethod === "card"
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <CreditCard className="h-5 w-5" />
                        <span className="text-xs">Cards / NetBanking</span>
                      </button>
                    </div>

                    {/* Method Specific Details View */}
                    <div className="rounded-xl border border-border bg-secondary/20 p-4">
                      {paymentMethod === "upi" && (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">UPI ID for Direct Payment</p>
                              <p className="mt-0.5 font-mono text-xs text-primary font-bold">{upiId}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(upiId, "UPI ID")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                            >
                              {copiedField === "UPI ID" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                              Copy UPI ID
                            </button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Scan the live QR code on the right with Google Pay, PhonePe, Paytm, CRED, or any BHIM UPI app. Balance reflects instantly.
                          </p>
                        </div>
                      )}

                      {paymentMethod === "va" && (
                        <div className="space-y-3 text-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="font-semibold text-foreground">Dedicated Corporate Virtual Account</span>
                            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                              Zero Charges
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border/80 bg-card p-2.5">
                              <span className="text-[10px] text-muted-foreground">Bank Name</span>
                              <p className="font-semibold text-foreground">YES Bank Ltd</p>
                            </div>
                            <div className="rounded-lg border border-border/80 bg-card p-2.5">
                              <span className="text-[10px] text-muted-foreground">Account Type</span>
                              <p className="font-semibold text-foreground">Current / Virtual Account</p>
                            </div>
                            <div className="rounded-lg border border-border/80 bg-card p-2.5 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-muted-foreground">Account Number</span>
                                <p className="font-mono font-bold text-foreground">BAC99210488</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy("BAC99210488", "Account Number")}
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                {copiedField === "Account Number" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <div className="rounded-lg border border-border/80 bg-card p-2.5 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-muted-foreground">IFSC Code</span>
                                <p className="font-mono font-bold text-foreground">YESB0CMSNOC</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy("YESB0CMSNOC", "IFSC Code")}
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                {copiedField === "IFSC Code" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            👉 Add this as a beneficiary in your corporate net banking. Funds transferred via IMPS, NEFT, or RTGS auto-reconcile to your wallet in real-time.
                          </p>
                        </div>
                      )}

                      {paymentMethod === "card" && (
                        <div className="space-y-2 text-xs">
                          <p className="font-semibold text-foreground">Corporate Cards &amp; NetBanking Gateway</p>
                          <p className="text-[11px] text-muted-foreground">
                            Supports Visa, MasterCard, RuPay Corporate Cards, and Net Banking for 50+ Indian commercial banks.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Optional GSTIN for B2B Invoice */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Receipt className="h-3.5 w-3.5" /> Company GSTIN (For B2B Tax Invoice)
                        </span>
                        <span className="text-[10px]">Optional (18% ITC Eligible)</span>
                      </div>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="e.g. 27AAECV1234C1ZP"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs font-semibold uppercase outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Dynamic Live QR & Checkout Summary (5 Cols) */}
                <div className="space-y-6 lg:col-span-5">
                  <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5">
                    {/* QR Code Card (For UPI) or Summary Card */}
                    {paymentMethod === "upi" ? (
                      <div className="flex flex-col items-center rounded-xl border border-border bg-secondary/30 p-5 text-center">
                        <div className="flex items-center justify-between w-full text-xs text-muted-foreground mb-3">
                          <span className="font-semibold flex items-center gap-1 text-foreground">
                            <QrCode className="h-3.5 w-3.5 text-primary" /> Dynamic UPI QR
                          </span>
                          <span className="flex items-center gap-1 font-mono text-amber-400 font-semibold text-[11px]">
                            <Clock className="h-3 w-3" /> Expires in {formatTimer(qrExpirySeconds)}
                          </span>
                        </div>

                        {/* Generated Visual QR Code Box */}
                        <div className="relative rounded-2xl border-2 border-primary/40 bg-white p-3 shadow-md">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                              upiPayUri
                            )}&margin=4`}
                            alt="Scan UPI QR Code"
                            className="h-44 w-44 rounded-lg"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="rounded-full bg-white p-1 shadow-md border border-slate-200">
                              <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-sm font-bold text-foreground">
                          Scan &amp; Pay ₹{effectiveAmount.toLocaleString("en-IN")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Supported Apps: Google Pay, PhonePe, Paytm, CRED &amp; BHIM
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border bg-secondary/30 p-5 text-center space-y-2">
                        <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary">
                          {paymentMethod === "va" ? <Building2 className="h-7 w-7" /> : <CreditCard className="h-7 w-7" />}
                        </div>
                        <h4 className="font-bold text-foreground text-sm">
                          {paymentMethod === "va" ? "Bank Wire / NEFT Transfer" : "Corporate Payment Gateway"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {paymentMethod === "va"
                            ? "Transfer directly to your designated virtual account."
                            : "Click below to complete transaction via Secure Gateway."}
                        </p>
                      </div>
                    )}

                    {/* Detailed Bill Breakdown */}
                    <div className="space-y-2.5 rounded-xl border border-border/80 bg-secondary/20 p-4 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Recharge Amount</span>
                        <span className="font-mono font-semibold text-foreground">₹{effectiveAmount.toFixed(2)}</span>
                      </div>

                      {bonusAmount > 0 && (
                        <div className="flex items-center justify-between text-success font-medium">
                          <span>Special Pack Bonus Credit</span>
                          <span className="font-mono font-bold">+₹{bonusAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>GST (18% ITC input credit)</span>
                        <span className="font-mono">₹0.00 (Inclusive)</span>
                      </div>

                      <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-bold text-foreground">
                        <span>Total Credited to Wallet</span>
                        <span className="font-mono text-primary text-base">₹{totalCredited.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      disabled={isProcessing || effectiveAmount < 100}
                      onClick={handleExecutePayment}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Verifying &amp; Crediting Wallet...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" /> Add ₹{totalCredited.toLocaleString("en-IN")} to Wallet Now
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-success" /> Instant Activation
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCheck className="h-3 w-3 text-primary" /> Tax Invoice Generated
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 📜 TRANSACTION LEDGER & STATEMENT TABLE */}
            {/* ========================================================================= */}
            <section className="space-y-4 pt-4 border-t border-border">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">Wallet Transaction Ledger &amp; Invoices</h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search Txn ID, API, ref..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="rounded-lg border border-border bg-card py-1.5 pl-9 pr-3 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs">
                    <button
                      onClick={() => setFilterType("all")}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        filterType === "all" ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({transactions.length})
                    </button>
                    <button
                      onClick={() => setFilterType("credit")}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        filterType === "credit" ? "bg-secondary text-success font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Credits
                    </button>
                    <button
                      onClick={() => setFilterType("debit")}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        filterType === "debit" ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Debits
                    </button>
                  </div>

                  {/* Export CSV */}
                  {transactions.length > 0 && (
                    <button
                      onClick={() => {
                        const csv = toCsv(
                          transactions.map((t) => ({
                            id: t.id,
                            type: t.type.toUpperCase(),
                            amount: t.amount,
                            balance_after: t.balance_after,
                            description: t.description,
                            reference_id: t.reference_id,
                            status: t.status,
                            created_at: t.created_at,
                          })),
                          ["id", "type", "amount", "balance_after", "description", "reference_id", "status", "created_at"]
                        );
                        downloadCsv(`bharat-wallet-ledger-${Date.now()}.csv`, csv);
                        toast.success("Transaction Ledger CSV downloaded.");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-primary" /> Export Ledger CSV
                    </button>
                  )}
                </div>
              </div>

              {filteredTxns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  No wallet transactions matching your search criteria.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3.5">Date &amp; Time</th>
                        <th className="px-4 py-3.5">Txn ID</th>
                        <th className="px-4 py-3.5">Type</th>
                        <th className="px-4 py-3.5">Description / Trigger</th>
                        <th className="px-4 py-3.5 text-right">Amount</th>
                        <th className="px-4 py-3.5 text-right">Balance After</th>
                        <th className="px-4 py-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredTxns.map((txn) => (
                        <tr key={txn.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                            {new Date(txn.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                            {txn.id}
                          </td>
                          <td className="px-4 py-3.5">
                            {txn.type === "credit" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                                <ArrowDownLeft className="h-3 w-3" /> Credit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                <ArrowUpRight className="h-3 w-3" /> Debit
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-foreground">{txn.description}</p>
                            {txn.reference_id && (
                              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                Ref: {txn.reference_id}
                              </p>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3.5 text-right font-mono font-bold ${
                              txn.type === "credit" ? "text-success" : "text-foreground"
                            }`}
                          >
                            {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono font-medium text-muted-foreground">
                            ₹{txn.balance_after.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-center">
                            <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success border border-success/30">
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        );
      }}
    </DashboardLayout>
  );
}
