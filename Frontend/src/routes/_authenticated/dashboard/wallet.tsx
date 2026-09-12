import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Zap,
  Info,
  Clock,
  Download,
  Receipt,
  RefreshCw,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Eye,
  X,
  FileText,
} from "lucide-react";
import { useState, useRef } from "react";
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
import { apiClient, resolveMediaUrl } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({
    meta: [
      { title: "Bank Account Transfer & Wallet Recharge — Bharat API Cloud" },
      {
        name: "description",
        content: "Recharge your prepaid API wallet via Bank Account Transfer (NEFT/IMPS/RTGS) with UTR and payment screenshot verification.",
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

const BANK_DETAILS = {
  beneficiaryName: "Technosys Future",
  bankName: "Indusind Bank",
  accountNumber: "258964362910",
  ifscCode: "INDB0001032",
  accountType: "Current Account",
  branch: "IndusInd Bank",
  supportedRails: "IMPS / NEFT / RTGS (24x7 Instant Settlement)",
};

function WalletPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Recharge selection state
  const [selectedPack, setSelectedPack] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // UTR & Screenshot upload state
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string | null>(null);
  const [screenshotFileSize, setScreenshotFileSize] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Preview Modal state
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  // Last submitted state
  const [lastSubmittedUtr, setLastSubmittedUtr] = useState<{
    utr: string;
    amount: number;
    submittedAt: string;
    hasScreenshot: boolean;
  } | null>(null);

  // Admin Queue state
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [isLoadingAdminRequests, setIsLoadingAdminRequests] = useState(false);
  const [processingAdminId, setProcessingAdminId] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<"pending" | "all">("pending");

  // Ledger filter state (Recharges only)
  const [filterType, setFilterType] = useState<"all" | "success" | "pending" | "rejected">("all");
  const [search, setSearch] = useState("");

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : selectedPack;
  const currentPack = RECHARGE_PACKS.find((p) => p.amount === effectiveAmount);
  const bonusAmount = currentPack?.bonus || 0;
  const totalCredited = effectiveAmount + bonusAmount;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const compressImage = (dataUrl: string, maxDimension = 1600, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(dataUrl);
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 400000) {
          return resolve(dataUrl);
        }
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const processFile = (file: File) => {
    if (!file) return;

    const validExtensions = /\.(png|jpe?g|webp|pdf|bmp|jfif|heic|heif)$/i;
    const isImageOrPdf =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      validExtensions.test(file.name);

    if (!isImageOrPdf) {
      toast.error("Please upload a valid image file (PNG, JPG, JPEG, WEBP) or PDF receipt");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds 20MB limit. Please upload a smaller screenshot.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      let dataUrl = e.target?.result as string;
      if (!dataUrl) {
        toast.error("Failed to read image file.");
        return;
      }

      // Auto-compress image to ensure fast transfer and prevent payload size errors
      if (file.type.startsWith("image/") || !file.name.toLowerCase().endsWith(".pdf")) {
        try {
          dataUrl = await compressImage(dataUrl);
        } catch (compErr) {
          console.warn("Client compression notice:", compErr);
        }
      }

      setScreenshotDataUrl(dataUrl);
      setScreenshotFileName(file.name);
      const estKb = Math.round((dataUrl.length * 3) / 4 / 1024);
      setScreenshotFileSize(estKb > 1024 ? `${(estKb / 1024).toFixed(1)} MB` : `${estKb} KB`);
      toast.success("Payment screenshot uploaded successfully!");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotDataUrl(null);
    setScreenshotFileName(null);
    setScreenshotFileSize(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Screenshot removed.");
  };

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

  const handleSubmitPayment = async () => {
    if (effectiveAmount <= 0) {
      toast.error("Please enter a valid recharge amount");
      return;
    }

    const cleanUtr = utrNumber.trim().replace(/[\s-]/g, "");
    if (!cleanUtr || cleanUtr.length < 6) {
      toast.error("Please enter your Bank Transfer UTR / IMPS/NEFT Reference Number (Min. 6 digits).");
      return;
    }

    if (!screenshotDataUrl) {
      toast.error("Please upload the screenshot or receipt of your bank payment.");
      return;
    }

    setIsProcessing(true);
    try {
      await submitRechargeRequest({
        amount: effectiveAmount,
        utr_number: cleanUtr,
        paymentMethod: "Bank Account Transfer (NEFT/IMPS/RTGS)",
        screenshot: screenshotDataUrl,
      });

      setLastSubmittedUtr({
        utr: cleanUtr,
        amount: effectiveAmount,
        submittedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        hasScreenshot: Boolean(screenshotDataUrl),
      });

      toast.success(`🎉 Payment details & UTR ${cleanUtr} submitted! Please allow 2-5 minutes for admin verification.`);
      setUtrNumber("");
      handleRemoveScreenshot();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-pricing"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit payment details. Please verify your UTR.");
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
          if (filterType !== "all") {
            if (filterType === "success" && t.status !== "success" && t.status !== undefined) return false;
            if (filterType === "pending" && t.status !== "pending") return false;
            if (filterType === "rejected" && t.status !== "rejected") return false;
          }
          if (search.trim()) {
            const q = search.toLowerCase();
            return (
              t.id.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q) ||
              (t.reference_id && t.reference_id.toLowerCase().includes(q)) ||
              (t.payment_method && t.payment_method.toLowerCase().includes(q)) ||
              (t.utr_number && t.utr_number.toLowerCase().includes(q))
            );
          }
          return true;
        });

        const totalCredits = transactions
          .filter((t) => t.status === "success" || !t.status)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const successCount = transactions.filter((t) => t.status === "success" || !t.status).length;
        const pendingCount = transactions.filter((t) => t.status === "pending").length;

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
                    <p className="text-[11px] font-medium text-muted-foreground">Approved Top-ups</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-foreground">
                      {successCount} Success {pendingCount > 0 ? `· ${pendingCount} Pending` : ""}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[11px] font-medium text-muted-foreground">API Hit Billing</p>
                    <Link
                      to="/dashboard/logs"
                      className="mt-0.5 flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline"
                    >
                      <Zap className="h-3.5 w-3.5 text-primary" /> View API Hit Logs &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 🏦 DEDICATED BANK ACCOUNT TRANSFER & RECHARGE SECTION */}
            {/* ========================================================================= */}
            <section className="space-y-6">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                    <Building2 className="h-5 w-5 text-primary" /> Bank Account Transfer &amp; Recharge
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Transfer via IMPS, NEFT, or RTGS to our official corporate account, then submit your UTR &amp; screenshot.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> 256-Bit Bank-Grade TLS Encryption
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left Column: Choose Pack + Bank Account Details (7 Cols) */}
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
                        <span className="text-[11px]">Min. ₹1 — Max. ₹5,00,000</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-muted-foreground">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={500000}
                          placeholder="e.g. 500"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-2.5 font-mono text-sm font-semibold outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Official Corporate Bank Details Card */}
                  <div className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Step 2 · Transfer Funds to Official Bank Account
                      </span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20">
                        Zero Surcharge
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Beneficiary Name */}
                      <div className="col-span-1 sm:col-span-2 rounded-xl border border-border/80 bg-secondary/30 p-3.5 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-muted-foreground block font-medium">Beneficiary / Company Name</span>
                          <p className="font-bold text-foreground text-sm mt-0.5">{BANK_DETAILS.beneficiaryName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(BANK_DETAILS.beneficiaryName, "Beneficiary Name")}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                        >
                          {copiedField === "Beneficiary Name" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-primary" />}
                          Copy Name
                        </button>
                      </div>

                      {/* Bank Name */}
                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-3">
                        <span className="text-[10px] text-muted-foreground block">Bank Name</span>
                        <p className="font-semibold text-foreground mt-0.5">{BANK_DETAILS.bankName}</p>
                        <span className="text-[10px] text-muted-foreground">{BANK_DETAILS.branch}</span>
                      </div>

                      {/* Account Type */}
                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-3">
                        <span className="text-[10px] text-muted-foreground block">Account Type</span>
                        <p className="font-semibold text-foreground mt-0.5">{BANK_DETAILS.accountType}</p>
                        <span className="text-[10px] text-primary font-medium">Direct Settlement</span>
                      </div>

                      {/* Account Number */}
                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Account Number</span>
                          <p className="font-mono font-bold text-foreground text-sm tracking-wider mt-0.5">{BANK_DETAILS.accountNumber}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(BANK_DETAILS.accountNumber, "Account Number")}
                          className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                          title="Copy Account Number"
                        >
                          {copiedField === "Account Number" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-primary" />}
                        </button>
                      </div>

                      {/* IFSC Code */}
                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">IFSC Code</span>
                          <p className="font-mono font-bold text-foreground text-sm tracking-wider mt-0.5">{BANK_DETAILS.ifscCode}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(BANK_DETAILS.ifscCode, "IFSC Code")}
                          className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                          title="Copy IFSC Code"
                        >
                          {copiedField === "IFSC Code" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-primary" />}
                        </button>
                      </div>
                    </div>

                    {/* Instructions Banner */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground space-y-1.5">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-primary" /> Instructions for Bank Transfer:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                        <li>Open your Mobile Banking or Corporate NetBanking application.</li>
                        <li>Add beneficiary or do quick transfer to the account above via <strong>IMPS / NEFT / RTGS</strong>.</li>
                        <li>Transfer exact amount (<strong>₹{effectiveAmount.toLocaleString("en-IN")}</strong>).</li>
                        <li>Take a screenshot of the confirmation page and copy the <strong>UTR / Ref Number</strong>.</li>
                      </ol>
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

                {/* Right Column: Step 3 UTR & Screenshot Verification Form (5 Cols) */}
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
                              Payment Under Verification
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
                          <p className="text-[10px] text-muted-foreground">Amount</p>
                          <p className="font-mono font-bold text-foreground">₹{lastSubmittedUtr.amount.toLocaleString("en-IN")}</p>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        ✅ Your UTR and payment screenshot have been received. Our admin is matching your transaction against the bank statement. Your balance will be credited instantly upon verification.
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
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Step 3 · Submit UTR &amp; Payment Screenshot
                      </span>
                      <h4 className="mt-1 text-base font-bold text-foreground">
                        Verify Bank Transfer (₹{effectiveAmount.toLocaleString("en-IN")})
                      </h4>
                    </div>

                    {/* Detailed Bill Breakdown */}
                    <div className="space-y-2.5 rounded-xl border border-border/80 bg-secondary/20 p-4 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Transfer Amount</span>
                        <span className="font-mono font-semibold text-foreground">
                          ₹{effectiveAmount.toFixed(2)}
                        </span>
                      </div>

                      {bonusAmount > 0 && (
                        <div className="flex items-center justify-between text-success font-medium">
                          <span>Special Bonus Extra Credit</span>
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

                    {/* Field 1: UTR Input */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          1. Bank Transfer UTR / Reference No. <span className="text-rose-500">*</span>
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {utrNumber.length} chars
                        </span>
                      </label>
                      <input
                        type="text"
                        maxLength={26}
                        placeholder="e.g. INDB24251098234 or 258964362910"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value.trim().toUpperCase())}
                        className="w-full rounded-xl border-2 border-primary/40 bg-background px-3.5 py-2.5 font-mono text-sm font-bold tracking-wider outline-none focus:border-primary text-foreground shadow-sm transition-colors"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        💡 Found on your bank transfer receipt, SMS, or NetBanking statement.
                      </p>
                    </div>

                    {/* Field 2: Screenshot File Upload */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          2. Upload Payment Screenshot / Receipt <span className="text-rose-500">*</span>
                        </span>
                        {screenshotFileSize && (
                          <span className="font-mono text-[10px] text-success font-semibold">
                            {screenshotFileSize}
                          </span>
                        )}
                      </label>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />

                      {!screenshotDataUrl ? (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(true);
                          }}
                          onDragLeave={() => setIsDraggingFile(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                            isDraggingFile
                              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                              : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
                          }`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            Click to browse or drag &amp; drop screenshot
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            PNG, JPG, JPEG, WEBP or PDF receipt up to 8MB
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {screenshotDataUrl.startsWith("data:image/") ? (
                                <img
                                  src={screenshotDataUrl}
                                  alt="Payment Screenshot Preview"
                                  className="h-12 w-12 rounded-lg object-cover border border-border shrink-0 cursor-pointer"
                                  onClick={() => setPreviewImage({ src: screenshotDataUrl, title: screenshotFileName || "Payment Screenshot" })}
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                  <FileText className="h-6 w-6" />
                                </div>
                              )}
                              <div className="overflow-hidden text-xs">
                                <p className="font-semibold text-foreground truncate">{screenshotFileName}</p>
                                <span className="text-[10px] text-success font-medium flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Ready for submission
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {screenshotDataUrl.startsWith("data:image/") && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({ src: screenshotDataUrl, title: screenshotFileName || "Payment Screenshot" })}
                                  className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
                                  title="View Full Size Screenshot"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleRemoveScreenshot}
                                className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                                title="Remove Screenshot"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Verification Button */}
                    <button
                      type="button"
                      disabled={isProcessing || !utrNumber.trim() || utrNumber.trim().length < 6 || !screenshotDataUrl}
                      onClick={handleSubmitPayment}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Submitting for Admin Verification...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" /> Submit UTR &amp; Screenshot (2–5 Mins SLA)
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
                      Match incoming user UTR submissions &amp; payment screenshots with bank account statement.
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
                          <th className="px-4 py-3 text-center">Receipt</th>
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
                            <td className="px-4 py-3 text-center">
                              {req.payment_screenshot ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({ src: req.payment_screenshot, title: `Receipt: UTR ${req.utr_number || req.id}` })}
                                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" /> View Slip
                                </button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">No Slip</span>
                              )}
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
            {/* 📜 RECHARGE & PAYMENT HISTORY TABLE */}
            {/* ========================================================================= */}
            <section className="space-y-4 pt-4 border-t border-border">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold">Wallet Recharge &amp; Payment History</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    History of all wallet top-ups and bank transfer recharges. For API usage debits, visit the{" "}
                    <Link to="/dashboard/logs" className="text-primary font-medium hover:underline inline-flex items-center gap-0.5">
                      API Hit Logs &rarr;
                    </Link>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search Txn ID, UTR, method..."
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
                      onClick={() => setFilterType("success")}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        filterType === "success" ? "bg-secondary text-success font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Success ({transactions.filter((t) => t.status === "success" || !t.status).length})
                    </button>
                    <button
                      onClick={() => setFilterType("pending")}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        filterType === "pending" ? "bg-secondary text-amber-500 font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Pending ({transactions.filter((t) => t.status === "pending").length})
                    </button>
                    {transactions.some((t) => t.status === "rejected") && (
                      <button
                        onClick={() => setFilterType("rejected")}
                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                          filterType === "rejected" ? "bg-secondary text-rose-500 font-semibold" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Rejected ({transactions.filter((t) => t.status === "rejected").length})
                      </button>
                    )}
                  </div>

                  {/* Export CSV */}
                  {transactions.length > 0 && (
                    <button
                      onClick={() => {
                        const csv = toCsv(
                          transactions.map((t) => ({
                            id: t.id,
                            type: (t.type || "CREDIT").toUpperCase(),
                            amount: t.amount,
                            balance_after: t.balance_after,
                            payment_method: t.payment_method || "Bank Transfer",
                            description: t.description,
                            reference_id: t.reference_id,
                            utr_number: t.utr_number || "",
                            status: t.status || "success",
                            created_at: t.created_at,
                          })),
                          ["id", "type", "amount", "balance_after", "payment_method", "description", "reference_id", "utr_number", "status", "created_at"]
                        );
                        downloadCsv(`bharat-recharge-history-${Date.now()}.csv`, csv);
                        toast.success("Recharge History CSV downloaded.");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-primary" /> Export Recharge CSV
                    </button>
                  )}
                </div>
              </div>

              {filteredTxns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  No recharge records matching your search criteria.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3.5">Date &amp; Time</th>
                        <th className="px-4 py-3.5">Txn / Ref ID</th>
                        <th className="px-4 py-3.5">Payment Details &amp; UTR</th>
                        <th className="px-4 py-3.5 text-center">Screenshot</th>
                        <th className="px-4 py-3.5 text-right">Recharged Amount</th>
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
                            <p className="font-medium text-foreground">{txn.description || txn.payment_method || "Wallet Recharge"}</p>
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
                          <td className="px-4 py-3.5 text-center">
                            {txn.payment_screenshot ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ src: txn.payment_screenshot!, title: `Payment Receipt: ${txn.utr_number || txn.id}` })}
                                className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                              >
                                <Eye className="h-3 w-3" /> View Slip
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3.5 text-right font-mono font-bold ${
                              txn.status === "pending"
                                ? "text-amber-500"
                                : "text-success"
                            }`}
                          >
                            +₹{txn.amount.toFixed(2)}
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

            {/* ========================================================================= */}
            {/* 🔍 SCREENSHOT ZOOM PREVIEW MODAL */}
            {/* ========================================================================= */}
            {previewImage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative max-w-3xl w-full max-h-[90vh] rounded-2xl border border-border bg-card p-5 shadow-2xl flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <h4 className="font-bold text-foreground text-sm">{previewImage.title}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto rounded-xl bg-black/20 flex items-center justify-center p-2 min-h-[300px]">
                    {previewImage.src.endsWith(".pdf") || previewImage.src.startsWith("data:application/pdf") ? (
                      <iframe
                        src={resolveMediaUrl(previewImage.src)}
                        title="Receipt PDF"
                        className="w-full h-[70vh] rounded-lg"
                      />
                    ) : (
                      <img
                        src={resolveMediaUrl(previewImage.src)}
                        alt="Payment Receipt Slip"
                        className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-success" /> Verified Upload
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="rounded-lg bg-secondary px-4 py-2 font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </DashboardLayout>
  );
}
