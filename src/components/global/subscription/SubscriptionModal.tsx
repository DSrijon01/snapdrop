"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Sparkles, Calendar, Zap, CreditCard, RefreshCw, AlertCircle } from "lucide-react";
import { useSubscription, MODULE_NAMES } from "@/context/SubscriptionContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/global/wallet/ClientWalletMultiButton";

export const SubscriptionModal: React.FC = () => {
  const {
    showModal,
    activeModuleId,
    subscriptions,
    subscribe,
    cancelSubscription,
    closeSubscriptionModal,
  } = useSubscription();

  const { connected } = useWallet();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!activeModuleId) return null;

  const moduleName = MODULE_NAMES[activeModuleId] || "Selected Module";
  const sub = subscriptions[activeModuleId];
  const isSubscribed = sub?.isSubscribed || false;
  const expiresAt = sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : null;

  const handleClose = () => {
    setShowCancelConfirm(false);
    closeSubscriptionModal();
  };

  const handleSubscribe = async () => {
    setSubmitting(true);
    const success = await subscribe(activeModuleId);
    setSubmitting(false);
    if (success) {
      handleClose();
      // Redirect to the pro section immediately using Next.js router to support basePath
      const proPath = `/${activeModuleId}/${activeModuleId.replace(/-/g, "")}-pro`;
      router.push(proPath);
    }
  };

  const executeCancel = async () => {
    setSubmitting(true);
    await cancelSubscription(activeModuleId);
    setSubmitting(false);
    handleClose();
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-lg bg-card/60 backdrop-blur-xl border border-border/80 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden font-sans"
          >
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus:outline-none"
            >
              <X size={20} />
            </button>

            {showCancelConfirm ? (
              /* CONFIRMATION SCREEN */
              <>
                {/* Modal Header */}
                <div className="flex flex-col items-center text-center mt-2 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 animate-bounce">
                    <AlertCircle size={24} />
                  </div>
                  <h3 className="text-2xl font-black font-display uppercase tracking-tight text-foreground">
                    Confirm Cancellation
                  </h3>
                  <p className="text-muted-foreground text-xs uppercase tracking-widest font-mono mt-1">
                    No-Refund Policy Check
                  </p>
                </div>

                {/* Modal Content */}
                <div className="space-y-6 relative z-10">
                  <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 text-center space-y-4">
                    <p className="text-sm font-semibold text-foreground">
                      WARNING: Unsubscribing will immediately terminate your <span className="text-red-500 font-bold">{moduleName} Pro</span> access.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You will <strong className="text-foreground">NOT</strong> receive any refund or SOL back for the remaining days of your plan.
                    </p>
                  </div>

                  {/* Actions Section */}
                  <div className="flex gap-3 pt-4 border-t border-border/40">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={submitting}
                      className="flex-1 py-3.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/80 transition-all rounded-xl font-bold uppercase tracking-wider text-xs focus:outline-none"
                    >
                      Keep Subscription
                    </button>
                    <button
                      onClick={executeCancel}
                      disabled={submitting}
                      className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white transition-all rounded-xl font-bold uppercase tracking-wider text-xs focus:outline-none shadow-lg shadow-red-600/20 flex items-center justify-center gap-1.5"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pruning...</span>
                        </>
                      ) : (
                        <span>Confirm Cancel</span>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* REGULAR MODAL SCREEN */
              <>
                {/* Modal Header */}
                <div className="flex flex-col items-center text-center mt-2 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 animate-pulse">
                    <Shield size={24} />
                  </div>
                  <h3 className="text-2xl font-black font-display uppercase tracking-tight text-foreground">
                    {moduleName} Pro
                  </h3>
                  <p className="text-muted-foreground text-xs uppercase tracking-widest font-mono mt-1">
                    Solana Subscriptions & Allowances
                  </p>
                </div>

                {/* Modal Content */}
                <div className="space-y-6 relative z-10">
                  {/* Plan Card */}
                  <div className="bg-card/45 border border-border/60 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">30-Day Pro Pass</h4>
                      <p className="text-muted-foreground text-xs font-mono mt-0.5">Renews/Expires dynamically</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-primary font-display">1.0 SOL</span>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono mt-0.5">Per Module</p>
                    </div>
                  </div>

                  {/* Status Section */}
                  {isSubscribed ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-primary font-bold text-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>Subscription Active</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-muted-foreground font-mono">
                        <div className="flex justify-between">
                          <span>Expires on:</span>
                          <span className="text-foreground font-bold">{expiresAt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="text-emerald-500 font-bold">Active / Recurring</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Features Included:</h4>
                      <ul className="space-y-2 text-sm text-foreground/80">
                        <li className="flex items-center gap-2.5">
                          <Zap className="w-4 h-4 text-primary shrink-0" />
                          <span>Premium UI Dashboard & Sidebars</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <span>Advanced AI Sentiment Metrics</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CreditCard className="w-4 h-4 text-primary shrink-0" />
                          <span>Detailed prediction charts and analytics</span>
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Actions Section */}
                  <div className="pt-4 border-t border-border/40">
                    {!connected ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-xs text-muted-foreground uppercase font-mono text-center">
                          Connect wallet to subscribe on Solana
                        </p>
                        <WalletMultiButton className="!w-full !justify-center !bg-primary hover:!bg-primary/90 !rounded-xl !font-bold" />
                      </div>
                    ) : submitting ? (
                      <button
                        disabled
                        className="w-full py-4 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm border border-border"
                      >
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing Transaction...</span>
                      </button>
                    ) : isSubscribed ? (
                      <div className="space-y-3">
                        <button
                          onClick={() => setShowCancelConfirm(true)}
                          className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm border border-red-500/20 hover:border-red-500/30 transition-all focus:outline-none"
                        >
                          Unsubscribe from Plan
                        </button>
                        <button
                          onClick={handleSubscribe}
                          className="w-full py-4 bg-primary text-primary-foreground hover:opacity-95 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm transition-all focus:outline-none shadow-lg shadow-primary/20"
                        >
                          Extend Subscription (1 SOL)
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleSubscribe}
                        className="w-full py-4 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm transition-all focus:outline-none shadow-lg shadow-primary/20 font-display"
                      >
                        Subscribe Now (1 SOL / 30 Days)
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
