"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileCode,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { TreasuryTransaction, TransactionCategory, FlowDirection } from "@/types/treasury";
import { CATEGORY_CONFIG, exportToCSV, exportToJSON, ESTIMATED_SOL_USD } from "@/lib/treasuryParser";
import { TransactionDetailModal } from "./TransactionDetailModal";
import toast from "react-hot-toast";

interface TreasuryLedgerTableProps {
  transactions: TreasuryTransaction[];
  accountingSummary: any;
}

export function TreasuryLedgerTable({ transactions, accountingSummary }: TreasuryLedgerTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDirection, setSelectedDirection] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<TreasuryTransaction | null>(null);

  const PAGE_SIZE = 8;

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      // Search matches
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        tx.signature.toLowerCase().includes(query) ||
        tx.counterparty.toLowerCase().includes(query) ||
        (tx.memo && tx.memo.toLowerCase().includes(query)) ||
        tx.categoryLabel.toLowerCase().includes(query);

      // Category filter
      const matchesCategory = selectedCategory === "all" || tx.category === selectedCategory;

      // Direction filter
      const matchesDirection = selectedDirection === "all" || tx.direction === selectedDirection;

      return matchesSearch && matchesCategory && matchesDirection;
    });
  }, [transactions, searchQuery, selectedCategory, selectedDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedTxs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleExportCSV = () => {
    try {
      const csvData = exportToCSV(filtered);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `street_sync_treasury_ledger_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV Ledger exported successfully!");
    } catch (e) {
      toast.error("Failed to export CSV");
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonData = exportToJSON(filtered, accountingSummary);
      const blob = new Blob([jsonData], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `street_sync_treasury_audit_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("JSON Audit ledger exported successfully!");
    } catch (e) {
      toast.error("Failed to export JSON");
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Table Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl shadow-sm">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search signature, wallet, memo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          {/* Direction Filter */}
          <select
            value={selectedDirection}
            onChange={(e) => {
              setSelectedDirection(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-muted/50 border border-border rounded-xl font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Directions</option>
            <option value="inflow">Inflows (Revenue)</option>
            <option value="outflow">Outflows (Expenses)</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-muted/50 border border-border rounded-xl font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <optgroup label="Revenue (Inflows)">
              <option value="nft_fee">NFT Platform Fees</option>
              <option value="token_fee">Token Platform Fees</option>
              <option value="token_creation">Token Creation Fees</option>
              <option value="subscription">Subscription Fees</option>
            </optgroup>
            <optgroup label="Expenses (Outflows)">
              <option value="rent_storage">On-Chain Rent & Storage</option>
              <option value="gas_execution">Network Execution Fees</option>
              <option value="operational_transfer">Operational Transfers</option>
            </optgroup>
          </select>
        </div>

        {/* Right: Export Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl border border-border transition-colors shadow-sm"
            title="Export CSV for spreadsheet bookkeeping"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl border border-border transition-colors shadow-sm"
            title="Export JSON for internal auditing"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-500" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Explorer Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Signature / Slot</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Counterparty / Memo</th>
                <th className="py-3 px-4 text-right">Gross Amount</th>
                <th className="py-3 px-4 text-right">Gas / Rent</th>
                <th className="py-3 px-4 text-right">Net Yield</th>
                <th className="py-3 px-4 text-right">Age</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedTxs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <p className="font-bold text-sm">No transactions match your filters</p>
                    <p className="text-xs mt-1">Try adjusting your search or category selection</p>
                  </td>
                </tr>
              ) : (
                paginatedTxs.map((tx) => {
                  const isInflow = tx.direction === "inflow";
                  const catConfig = CATEGORY_CONFIG[tx.category] || {
                    label: tx.categoryLabel,
                    bgLight: "bg-blue-100 text-blue-800",
                    bgDark: "dark:bg-blue-950 dark:text-blue-300",
                  };

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      {/* Direction Icon & Flow */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span
                            className={`p-1 rounded-md ${
                              isInflow
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {isInflow ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span className={isInflow ? "text-emerald-500" : "text-red-500"}>
                            {isInflow ? "INFLOW" : "OUTFLOW"}
                          </span>
                        </div>
                      </td>

                      {/* Signature & Slot */}
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary group-hover:underline">
                            {tx.signature.slice(0, 10)}...{tx.signature.slice(-4)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Slot: {tx.slot.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig.bgLight} ${catConfig.bgDark}`}
                        >
                          {catConfig.label}
                        </span>
                      </td>

                      {/* Counterparty & Memo */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="font-mono text-foreground truncate font-medium">
                          {tx.counterparty.slice(0, 8)}...{tx.counterparty.slice(-6)}
                        </p>
                        {tx.memo && (
                          <p className="text-[10px] text-muted-foreground truncate" title={tx.memo}>
                            {tx.memo}
                          </p>
                        )}
                      </td>

                      {/* Gross Amount */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <p className={`font-bold ${isInflow ? "text-foreground" : "text-muted-foreground"}`}>
                          {isInflow ? "+" : "-"}
                          {tx.amountSol.toFixed(4)} SOL
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ${(tx.amountSol * ESTIMATED_SOL_USD).toFixed(2)}
                        </p>
                      </td>

                      {/* Gas / Rent */}
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground whitespace-nowrap">
                        <p className="text-[11px]">
                          {(tx.gasSpentSol + tx.rentCostSol).toFixed(5)} SOL
                        </p>
                        {tx.rentCostSol > 0 && (
                          <span className="text-[9px] text-red-400 font-bold">Rent Exemption</span>
                        )}
                      </td>

                      {/* Net Yield */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <p
                          className={`font-black ${
                            tx.netYieldSol > 0
                              ? "text-emerald-500 dark:text-emerald-400"
                              : "text-red-500 dark:text-red-400"
                          }`}
                        >
                          {tx.netYieldSol > 0 ? `+${tx.netYieldSol.toFixed(4)}` : tx.netYieldSol.toFixed(4)} SOL
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ${(tx.netYieldSol * ESTIMATED_SOL_USD).toFixed(2)}
                        </p>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-right text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(tx.timestamp)}
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors"
                          title="Inspect Transaction"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20 text-xs">
          <div className="text-muted-foreground">
            Showing <span className="font-bold text-foreground">{paginatedTxs.length}</span> of{" "}
            <span className="font-bold text-foreground">{filtered.length}</span> transactions
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-border bg-background disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-mono font-bold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-border bg-background disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Drill-down Modal */}
      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
}
