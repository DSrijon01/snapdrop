"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  X, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Apple, 
  Smartphone,
  ArrowRight,
  DollarSign
} from "lucide-react";
import toast from "react-hot-toast";

interface BuyWithCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAsset?: string;
}

export function BuyWithCardModal({ isOpen, onClose, defaultAsset = "SOL" }: BuyWithCardModalProps) {
  const [fiatAmount, setFiatAmount] = useState<string>("100");
  const [targetAsset, setTargetAsset] = useState<string>(defaultAsset);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "apple" | "google">("apple");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const getEstimatedCrypto = () => {
    const usd = parseFloat(fiatAmount) || 0;
    if (targetAsset === "SOL") return (usd / 142.5).toFixed(4);
    if (targetAsset === "USDC") return (usd * 0.995).toFixed(2);
    if (targetAsset === "TSLA") return (usd / 184.5).toFixed(4);
    if (targetAsset === "NVDA") return (usd / 128.2).toFixed(4);
    return (usd / 100).toFixed(2);
  };

  const handleExecutePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      toast.success(`Successfully purchased ${getEstimatedCrypto()} ${targetAsset} with ${paymentMethod === 'apple' ? 'Apple Pay' : paymentMethod === 'google' ? 'Google Pay' : 'Credit Card'}!`);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border p-5 sm:p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-5 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-all"
        >
          <X size={18} />
        </button>

        {!isSuccess ? (
          <>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={18} className="text-primary" />
                <span className="text-[10px] font-mono uppercase tracking-widest font-black text-primary">
                  Fiat On-Ramp
                </span>
              </div>
              <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground">
                Buy with Card or Apple Pay
              </h3>
              <p className="text-xs text-muted-foreground">
                Instantly deposit crypto or tokenized equities directly into your Solana wallet.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("apple")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-mono font-bold ${
                  paymentMethod === "apple"
                    ? "bg-primary/10 border-primary text-foreground shadow-sm"
                    : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Apple size={18} />
                <span>Apple Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("google")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-mono font-bold ${
                  paymentMethod === "google"
                    ? "bg-primary/10 border-primary text-foreground shadow-sm"
                    : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone size={18} />
                <span>Google Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-mono font-bold ${
                  paymentMethod === "card"
                    ? "bg-primary/10 border-primary text-foreground shadow-sm"
                    : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <CreditCard size={18} />
                <span>Debit Card</span>
              </button>
            </div>

            {/* You Pay (USD) */}
            <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground font-bold">
                <span>You Spend (USD)</span>
                <span>Fee: $0.00 (Zero Fee Demo)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-display text-muted-foreground">$</span>
                <input
                  type="number"
                  value={fiatAmount}
                  onChange={(e) => setFiatAmount(e.target.value)}
                  className="w-full bg-transparent text-2xl font-black font-display text-foreground outline-none"
                  placeholder="100"
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="flex gap-2 pt-1">
                {["50", "100", "250", "500"].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFiatAmount(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                      fiatAmount === amt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* You Receive */}
            <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground font-bold">
                <span>You Receive</span>
                <span>Rate: Real-time</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black font-display text-primary">
                  {getEstimatedCrypto()}
                </span>
                <select
                  value={targetAsset}
                  onChange={(e) => setTargetAsset(e.target.value)}
                  className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs font-bold font-display text-foreground outline-none"
                >
                  <option value="SOL">SOL - Solana</option>
                  <option value="USDC">USDC - USD Coin</option>
                  <option value="TSLA">TSLA - Tesla</option>
                  <option value="NVDA">NVDA - NVIDIA</option>
                </select>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handleExecutePayment}
              disabled={isProcessing || !parseFloat(fiatAmount)}
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-black font-display uppercase tracking-wider text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <span>Pay ${fiatAmount || "0"} & Mint to Wallet</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground">
              <ShieldCheck size={14} className="text-green-500" />
              <span>Simulated Apple Pay & MoonPay On-Ramp Gateway</span>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h4 className="text-xl font-black font-display uppercase text-foreground">
                Payment Completed!
              </h4>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Successfully purchased {getEstimatedCrypto()} {targetAsset}. Tokens have been credited to your connected wallet.
              </p>
            </div>

            <button
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold font-display uppercase text-xs tracking-wider transition-all"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
