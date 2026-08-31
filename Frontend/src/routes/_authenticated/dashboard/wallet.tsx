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
  X,
  QrCode,
  Building,
  CreditCard,
} from "lucide-react";
import { useMemo, useState } from "react";
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
      { title: "Wallet & Billing Ledger — Bharat API Cloud" },
      {
        name: "description",
        content: "Prepaid API wallet balance, recharge options, and full debit/credit transaction ledger.",
      },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const queryClient = useQueryClient();
  const [showTopup, setShowTopup] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit">("all");
  const [search, setSearch] = useState("");

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
            {/* Wallet Balance Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Prepaid API Wallet · Active
                    </span>
                  </div>
                  <h2 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Balance auto-deducts per successful API call. Zero maintenance charges.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowTopup(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow transition-opacity hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Add Balance / Recharge
                  </button>
                </div>
              </div>

              {/* Quick Insights Strip */}
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border/80 pt-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Recharged</p>
                  <p className="mt-1 font-mono text-base font-semibold text-success">
                    +₹{totalCredits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">API Deductions</p>
                  <p className="mt-1 font-mono text-base font-semibold text-foreground">
                    -₹{totalDebits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs text-muted-foreground">Auto-Debit Engine</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Real-time instant
                  </p>
                </div>
              </div>
            </div>

            {/* Recharge Modal */}
            {showTopup && (
              <TopupModal
                onClose={() => setShowTopup(false)}
                onSuccess={() => {
                  setShowTopup(false);
                  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                }}
              />
            )}

            {/* Wallet Transactions / Ledger Table */}
            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Wallet Transaction Ledger</h3>
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
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Export Ledger CSV
                    </button>
                  )}
                </div>
              </div>

              {filteredTxns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No wallet transactions matching your search criteria.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-secondary/50 font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-4 py-3">Txn ID</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Trigger / Description</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Balance After</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredTxns.map((txn) => (
                        <tr key={txn.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {new Date(txn.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-foreground">
                            {txn.id}
                          </td>
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{txn.description}</p>
                            {txn.reference_id && (
                              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                Ref: {txn.reference_id}
                              </p>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold ${
                              txn.type === "credit" ? "text-success" : "text-foreground"
                            }`}
                          >
                            {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-medium text-muted-foreground">
                            ₹{txn.balance_after.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
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

function TopupModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("UPI Instant Transfer");
  const [busy, setBusy] = useState(false);

  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  function handleRecharge(e: React.FormEvent) {
    e.preventDefault();
    if (finalAmount < 100) {
      toast.error("Minimum recharge amount is ₹100");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      topupWallet({
        amount: finalAmount,
        paymentMethod: method,
        note: "Instant Console Top-up",
      });
      toast.success(`₹${finalAmount.toLocaleString("en-IN")} added to wallet successfully!`);
      setBusy(false);
      onSuccess();
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Recharge API Wallet</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleRecharge} className="mt-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Amount
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[500, 1000, 2500, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setAmount(val);
                    setCustomAmount("");
                  }}
                  className={`rounded-lg border py-2 text-xs font-semibold transition-all ${
                    amount === val && !customAmount
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-foreground hover:border-primary/50"
                  }`}
                >
                  ₹{val.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <input
                type="number"
                placeholder="Or enter custom amount (e.g. 10000)"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min={100}
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Method
            </label>
            <div className="mt-2 space-y-2">
              {[
                { id: "UPI Instant Transfer", label: "UPI (GPay / PhonePe / Paytm / QR)", icon: QrCode },
                { id: "Net Banking (RTGS/NEFT)", label: "Net Banking / Corporate IMPS", icon: Building },
                { id: "Corporate Credit/Debit Card", label: "Corporate Credit / Debit Card", icon: CreditCard },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs transition-all ${
                    method === m.id
                      ? "border-primary bg-primary/5 font-semibold text-foreground"
                      : "border-border bg-secondary/20 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <m.icon className="h-4 w-4 text-primary" />
                    <span>{m.label}</span>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={method === m.id}
                    onChange={() => setMethod(m.id)}
                    className="accent-primary"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Top-up Amount</span>
              <span className="font-mono font-semibold text-foreground">₹{finalAmount.toFixed(2)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-muted-foreground">
              <span>GST (18% input credit eligible)</span>
              <span className="font-mono text-xs">₹0.00 (Inclusive)</span>
            </div>
            <div className="mt-2 border-t border-border/60 pt-2 flex items-center justify-between font-bold text-sm">
              <span>Total Payable</span>
              <span className="font-mono text-primary">₹{finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || finalAmount < 100}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm & Add ₹{finalAmount.toFixed(2)}
          </button>
        </form>
      </div>
    </div>
  );
}
