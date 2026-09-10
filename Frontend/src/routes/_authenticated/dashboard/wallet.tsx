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
  XCircle,
  AlertCircle,
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
  RefreshCw,
  UserCheck,
  BadgeAlert,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  downloadCsv,
  toCsv,
  submitRechargeRequest,
  approveRechargeRequest,
  rejectRechargeRequest,
  type WalletTransactionRow,
} from "@/lib/demo-store";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({
    meta: [
      { title: "Payment & Wallet Recharge — Bharat API Cloud" },
      {
        name: "description",
        content: "Instant UPI QR, Virtual Account IMPS/NEFT, and Corporate card payments with UTR verification for your prepaid API wallet.",
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
  const [isQrGenerated, setIsQrGenerated] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [generatedAmount, setGeneratedAmount] = useState<number>(1000);
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [qrExpirySeconds, setQrExpirySeconds] = useState(900); // 15 mins
  const [lastSubmittedUtr, setLastSubmittedUtr] = useState<{
    utr: string;
    amount: number;
    submittedAt: string;
  } | null>(null);

  // Admin Queue state
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [isLoadingAdminRequests, setIsLoadingAdminRequests] = useState(false);
  const [processingAdminId, setProcessingAdminId] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<"pending" | "all">("pending");

  // Ledger filter state
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit">("all");
  const [search, setSearch] = useState("");

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : selectedPack;
  const currentPack = RECHARGE_PACKS.find((p) => p.amount === (isQrGenerated ? generatedAmount : effectiveAmount));
  const bonusAmount = currentPack?.bonus || 0;
  const totalCredited = (isQrGenerated ? generatedAmount : effectiveAmount) + bonusAmount;

  // Dynamic UPI URL based on generated amount
  const upiId = "8882746176@pthdfc";
  const activeQrAmount = isQrGenerated ? generatedAmount : effectiveAmount;
  const upiPayUri = `upi://pay?pa=${upiId}&pn=Bharat%20API%20Cloud&am=${activeQrAmount}&cu=INR&tn=Prepaid%20Wallet%20Topup`;

  // Countdown timer for dynamic QR code
  useEffect(() => {
    if (!isQrGenerated) return;
    const timer = setInterval(() => {
      setQrExpirySeconds((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, [isQrGenerated]);

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

  const handleGenerateQr = () => {
    if (effectiveAmount < 100) {
      toast.error("Minimum recharge amount is ₹100");
      return;
    }
    setIsGeneratingQr(true);
    setTimeout(() => {
      setGeneratedAmount(effectiveAmount);
      setIsQrGenerated(true);
      setQrExpirySeconds(900);
      setIsGeneratingQr(false);
      toast.success(`Dynamic UPI QR generated for ₹${effectiveAmount.toLocaleString("en-IN")}`);
    }, 400);
  };

  // Fetch Admin Requests if admin
  const fetchAdminRecharges = async () => {
    setIsLoadingAdminRequests(true);
    try {
      const list = await apiClient.getAdminRecharges({ status: activeAdminTab });
      setAdminRequests(list || []);
    } catch (err) {
      console.warn("Could not load admin recharges:", err);
    } finally {
      setIsLoadingAdminRequests(false);
    }
  };

  const handleAdminApprove = async (id: string | number, amount: number) => {
    setProcessingAdminId(String(id));
    try {
      await approveRechargeRequest(String(id), amount);
      toast.success(`Recharge of ₹${amount.toLocaleString("en-IN")} approved and credited.`);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      fetchAdminRecharges();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve recharge.");
    } finally {
      setProcessingAdminId(null);
    }
  };

  const handleAdminReject = async (id: string | number) => {
    const reason = window.prompt("Enter rejection reason:", "Unmatched or Invalid UTR in Bank Statement");
    if (reason === null) return;

    setProcessingAdminId(String(id));
    try {
      await rejectRechargeRequest(String(id), reason || "Invalid UTR");
      toast.info("Recharge request marked as rejected.");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      fetchAdminRecharges();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject recharge.");
    } finally {
      setProcessingAdminId(null);
    }
  };

  const handleSubmitUtrPayment = async () => {
    const payAmt = isQrGenerated ? generatedAmount : effectiveAmount;
    if (payAmt < 100) {
      toast.error("Minimum recharge amount is ₹100");
      return;
    }

    const cleanUtr = utrNumber.trim().replace(/[\s-]/g, "");
    if (!cleanUtr || cleanUtr.length < 6) {
      toast.error("Please enter your valid 12-digit UPI UTR / Bank Reference Number.");
      return;
    }

    setIsProcessing(true);
    try {
      const methodLabel =
        paymentMethod === "upi"
          ? "UPI Dynamic QR"
          : paymentMethod === "va"
          ? "Virtual Account (NEFT/IMPS)"
          : "Corporate Card";

      await submitRechargeRequest({
        amount: payAmt,
        utr_number: cleanUtr,
        paymentMethod: methodLabel,
      });

      setLastSubmittedUtr({
        utr: cleanUtr,
        amount: payAmt,
        submittedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });

      toast.success(`🎉 UTR ${cleanUtr} submitted! Please wait 2-5 minutes for admin verification.`);
      setUtrNumber("");
      setIsQrGenerated(false);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-pricing"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit recharge request. Please check UTR.");
    } finally {
      setIsProcessing(false);
    }
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

                    {/* Generate QR Button in Step 2 */}
                    {paymentMethod === "upi" && (
                      <div className="pt-2 border-t border-border/60">
                        <button
                          type="button"
                          onClick={handleGenerateQr}
                          disabled={isGeneratingQr || effectiveAmount < 100}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                        >
                          {isGeneratingQr ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Generating Secure Dynamic QR...
                            </>
                          ) : (
                            <>
                              <QrCode className="h-4 w-4" />
                              {isQrGenerated && generatedAmount === effectiveAmount
                                ? `Refresh UPI QR Code (₹${effectiveAmount.toLocaleString("en-IN")})`
                                : `Generate Dynamic UPI QR (₹${effectiveAmount.toLocaleString("en-IN")})`}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                    {/* Right Column: Dynamic Live QR & Checkout Summary (5 Cols) */}
                <div className="space-y-6 lg:col-span-5">
                  {/* Active Pending Verification Notification if user just submitted */}
                  {lastSubmittedUtr && (
                    <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-amber-500/5 p-5 shadow-md animate-in fade-in slide-in-from-top-4 duration-300 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 ring-4 ring-amber-500/10">
                            <Clock className="h-5 w-5 animate-spin" />
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                              Payment Under Admin Verification
                            </h4>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                              Estimated Time: 2–5 Minutes
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-500 border border-amber-500/30">
                          PENDING
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-xl border border-amber-500/20 bg-card/80 p-3 text-xs">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Submitted UTR</p>
                          <p className="font-mono font-bold text-foreground">{lastSubmittedUtr.utr}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Amount Submitted</p>
                          <p className="font-mono font-bold text-foreground">₹{lastSubmittedUtr.amount.toLocaleString("en-IN")}</p>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        ✅ We have received your payment request. Our admin is matching your UTR against the bank statement. Your wallet balance will be credited as soon as verified.
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                        <span>Submitted at: {lastSubmittedUtr.submittedAt}</span>
                        <button
                          type="button"
                          onClick={() => setLastSubmittedUtr(null)}
                          className="font-medium text-primary hover:underline"
                        >
                          Dismiss Notice
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5">
                    {/* QR Code Card (For UPI) or Summary Card */}
                    {paymentMethod === "upi" ? (
                      isQrGenerated ? (
                        <div className="flex flex-col items-center rounded-xl border border-border bg-secondary/30 p-5 text-center transition-all animate-in fade-in duration-300">
                          <div className="flex items-center justify-between w-full text-xs text-muted-foreground mb-3">
                            <span className="font-semibold flex items-center gap-1 text-foreground">
                              <QrCode className="h-3.5 w-3.5 text-primary" /> Dynamic UPI Payment QR
                            </span>
                            <span className="flex items-center gap-1 font-mono text-amber-500 font-semibold text-[11px]">
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
                            Scan &amp; Pay ₹{generatedAmount.toLocaleString("en-IN")}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            UPI ID: <span className="font-mono font-semibold text-foreground">{upiId}</span>
                          </p>

                          {/* Payment Instructions Badge */}
                          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left text-[11px] text-muted-foreground space-y-1 w-full">
                            <p className="font-semibold text-foreground flex items-center gap-1">
                              <Info className="h-3.5 w-3.5 text-primary" /> Steps to Complete Payment:
                            </p>
                            <ol className="list-decimal list-inside space-y-0.5 text-[10.5px]">
                              <li>Scan the QR code using PhonePe / GPay / Paytm / BHIM.</li>
                              <li>Pay exact amount (₹{generatedAmount.toLocaleString("en-IN")}).</li>
                              <li>Copy the <strong>12-Digit UPI UTR / Ref No.</strong> from your UPI app.</li>
                              <li>Paste the UTR below and submit for 2–5 min verification.</li>
                            </ol>
                          </div>

                          {/* Mandatory 12-digit UTR Input */}
                          <div className="mt-4 w-full text-left space-y-1.5">
                            <label className="text-xs font-bold text-foreground flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                Enter 12-Digit UPI UTR / Reference No. <span className="text-rose-500">*</span>
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {utrNumber.length}/12 Digits
                              </span>
                            </label>
                            <input
                              type="text"
                              maxLength={16}
                              placeholder="e.g. 425109823456"
                              value={utrNumber}
                              onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                              className="w-full rounded-xl border-2 border-primary/40 bg-background px-3.5 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-primary text-foreground shadow-sm transition-colors"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              💡 Found in your UPI transaction receipt details as 'UPI Ref ID' or 'UTR'.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-center space-y-3">
                          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3.5 text-primary">
                            <QrCode className="h-8 w-8" />
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground text-sm">Dynamic UPI QR Ready to Generate</h4>
                            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                              Select your desired recharge amount and click below to generate your secure UPI payment QR code for <strong>₹{effectiveAmount.toLocaleString("en-IN")}</strong>.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleGenerateQr}
                            disabled={isGeneratingQr || effectiveAmount < 100}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.99] cursor-pointer"
                          >
                            {isGeneratingQr ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            Generate UPI QR (₹{effectiveAmount.toLocaleString("en-IN")})
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="rounded-xl border border-border bg-secondary/30 p-5 text-center space-y-3">
                        <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary">
                          {paymentMethod === "va" ? <Building2 className="h-7 w-7" /> : <CreditCard className="h-7 w-7" />}
                        </div>
                        <h4 className="font-bold text-foreground text-sm">
                          {paymentMethod === "va" ? "Bank Wire / NEFT Transfer" : "Corporate Payment Gateway"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {paymentMethod === "va"
                            ? "Transfer directly to your designated virtual account, then submit your IMPS/NEFT UTR below."
                            : "Click below to complete transaction via Secure Gateway."}
                        </p>

                        {/* UTR Input for Bank Wire */}
                        <div className="w-full text-left space-y-1.5 pt-2 border-t border-border">
                          <label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>Enter Bank IMPS/NEFT UTR Number <span className="text-rose-500">*</span></span>
                          </label>
                          <input
                            type="text"
                            maxLength={24}
                            placeholder="e.g. YESBH24251098234"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value.trim().toUpperCase())}
                            className="w-full rounded-xl border-2 border-primary/40 bg-background px-3.5 py-2 font-mono text-xs font-bold outline-none focus:border-primary text-foreground"
                          />
                        </div>
                      </div>
                    )}

                    {/* Detailed Bill Breakdown */}
                    <div className="space-y-2.5 rounded-xl border border-border/80 bg-secondary/20 p-4 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Recharge Amount</span>
                        <span className="font-mono font-semibold text-foreground">
                          ₹{(isQrGenerated ? generatedAmount : effectiveAmount).toFixed(2)}
                        </span>
                      </div>

                      {bonusAmount > 0 && (
                        <div className="flex items-center justify-between text-success font-medium">
                          <span>Special Pack Bonus Credit</span>
                          <span className="font-mono font-bold">+₹{bonusAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Verification SLA</span>
                        <span className="font-mono text-amber-500 font-semibold">2–5 Minutes</span>
                      </div>

                      <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-bold text-foreground">
                        <span>Total to be Credited</span>
                        <span className="font-mono text-primary text-base">₹{totalCredited.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Submit UTR Button */}
                    <button
                      type="button"
                      disabled={isProcessing || !utrNumber.trim() || utrNumber.trim().length < 6}
                      onClick={handleSubmitUtrPayment}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Submitting for Admin Verification...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" /> Submit UTR for Admin Verification (2–5 Mins)
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" /> 2–5 Mins Verification
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-success" /> Anti-Fraud Protected
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 🛡️ ADMIN VERIFICATION QUEUE (Shown for Admin users or toggle) */}
            {/* ========================================================================= */}
            {data.profile.plan === "scale" || (data.session?.email && (data.session.email.includes("admin") || data.session.email.includes("demo"))) ? (
              <section className="space-y-4 rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-bold">Admin Payment Verification Desk</h3>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        ADMIN DESK
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Match incoming user UTR submissions with bank account statement and approve or reject recharges.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchAdminRecharges}
                      disabled={isLoadingAdminRequests}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAdminRequests ? "animate-spin" : ""}`} />
                      Refresh Queue
                    </button>
                  </div>
                </div>

                {/* Filter and Queue Table */}
                {adminRequests.length === 0 && !isLoadingAdminRequests ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    Click "Refresh Queue" to load live UTR recharge submissions pending admin verification.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border bg-background">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">User &amp; Email</th>
                          <th className="px-4 py-3">Submitted UTR</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {adminRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                              {new Date(req.created_at).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-foreground">{req.user_name || "User"}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">{req.user_email}</p>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-foreground">
                              {req.utr_number || req.reference_id}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-success">
                              ₹{req.amount.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              {req.status === "pending" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/30">
                                  <Clock className="h-3 w-3" /> Pending (2-5m)
                                </span>
                              ) : req.status === "success" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success border border-success/30">
                                  <Check className="h-3 w-3" /> Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-500 border border-rose-500/30">
                                  <XCircle className="h-3 w-3" /> Rejected
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right space-x-1.5">
                              {req.status === "pending" ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={processingAdminId === String(req.id || req.numeric_id)}
                                    onClick={() => handleAdminApprove(req.numeric_id || req.id, req.amount)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    <Check className="h-3 w-3" /> Approve &amp; Credit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={processingAdminId === String(req.id || req.numeric_id)}
                                    onClick={() => handleAdminReject(req.numeric_id || req.id)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:bg-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    <XCircle className="h-3 w-3" /> Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {req.approved_at ? new Date(req.approved_at).toLocaleTimeString("en-IN") : "Processed"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}

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
                      placeholder="Search Txn ID, UTR, ref..."
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
                            utr_number: t.utr_number || "",
                            status: t.status,
                            created_at: t.created_at,
                          })),
                          ["id", "type", "amount", "balance_after", "description", "reference_id", "utr_number", "status", "created_at"]
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
                        <th className="px-4 py-3.5">Description / UTR</th>
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
                              txn.status === "pending" ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-500">
                                  <Clock className="h-3 w-3" /> Credit (Pending)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                                  <ArrowDownLeft className="h-3 w-3" /> Credit
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                <ArrowUpRight className="h-3 w-3" /> Debit
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-foreground">{txn.description}</p>
                            {txn.utr_number ? (
                              <p className="mt-0.5 font-mono text-[11px] text-primary font-bold">
                                UTR: {txn.utr_number}
                              </p>
                            ) : txn.reference_id ? (
                              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                Ref: {txn.reference_id}
                              </p>
                            ) : null}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3.5 text-right font-mono font-bold ${
                              txn.type === "credit"
                                ? txn.status === "pending"
                                  ? "text-amber-500"
                                  : "text-success"
                                : "text-foreground"
                            }`}
                          >
                            {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono font-medium text-muted-foreground">
                            ₹{txn.balance_after.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-center">
                            {txn.status === "pending" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-500 border border-amber-500/30 animate-pulse">
                                <Clock className="h-3 w-3" /> Pending (2–5m)
                              </span>
                            ) : txn.status === "rejected" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-500 border border-rose-500/30">
                                <XCircle className="h-3 w-3" /> Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success border border-success/30">
                                <Check className="h-3 w-3" /> Success
                              </span>
                            )}
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
