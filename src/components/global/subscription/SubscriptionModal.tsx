"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Shield,
  Sparkles,
  Zap,
  RefreshCw,
  AlertCircle,
  Clock,
  Check,
} from "lucide-react";
import {
  useSubscription,
  MODULE_NAMES,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanId,
} from "@/context/SubscriptionContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/global/wallet/ClientWalletMultiButton";
import { SubscriptionCountdownCards } from "@/components/global/subscription/SubscriptionCountdown";

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
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("30days");
  const [submitting, setSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!activeModuleId) return null;

  const moduleName = MODULE_NAMES[activeModuleId] || "Selected Module";
  const sub = subscriptions[activeModuleId];
  const isSubscribed = sub?.isSubscribed || false;
  const expiresAtDate = sub?.expiresAt ? new Date(sub.expiresAt) : null;
  const currentPlan = SUBSCRIPTION_PLANS[selectedPlanId];

  const handleClose = () => {
    setShowCancelConfirm(false);
    closeSubscriptionModal();
  };

  const handleSubscribe = async () => {
    setSubmitting(true);
    const success = await subscribe(activeModuleId, selectedPlanId);
    setSubmitting(false);
    if (success) {
      handleClose();
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-lg bg-card border border-border/80 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden font-sans my-auto max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all focus:outline-none z-20"
            >
              <X size={18} />
            </button>

            {showCancelConfirm ? (
              /* CONFIRMATION SCREEN */
              <>
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

                <div className="space-y-6 relative z-10">
                  <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 text-center space-y-4">
                    <p className="text-sm font-semibold text-foreground">
                      WARNING: Unsubscribing will immediately terminate your{" "}
                      <span className="text-red-500 font-bold">{moduleName} Pro</span> access.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You will <strong className="text-foreground">NOT</strong> receive any refund or SOL back for the remaining days of your plan.
                    </p>
                  </div>

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
                <div className="flex flex-col items-center text-center mt-1 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
                    <Shield size={22} />
                  </div>
                  <h3 className="text-2xl font-black font-display uppercase tracking-tight text-foreground">
                    {moduleName} Pro
                  </h3>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-widest font-mono mt-0.5">
                    Solana Subscriptions & Allowances
                  </p>
                </div>

                {/* Modal Content */}
                <div className="space-y-4 relative z-10">
                  {/* Active Countdown Section if Subscribed */}
                  {isSubscribed && (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wide">
                          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                          <span>Active Subscription</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>

                      {/* Live Ticking Countdown Matrix */}
                      <SubscriptionCountdownCards expiresAt={sub?.expiresAt} />

                      {expiresAtDate && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                          <span>Expires at:</span>
                          <span className="text-foreground font-semibold">
                            {expiresAtDate.toLocaleDateString()} {expiresAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-Tier Plan Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-muted-foreground uppercase tracking-wider">
                        {isSubscribed ? "Extend Subscription Plan:" : "Choose Subscription Plan:"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanId[]).map((planKey) => {
                        const plan = SUBSCRIPTION_PLANS[planKey];
                        const isSelected = selectedPlanId === planKey;

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`relative p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                              isSelected
                                ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.2)] ring-1 ring-primary"
                                : "bg-card/45 border-border/70 hover:border-border hover:bg-muted/40"
                            }`}
                          >
                            {plan.badge && (
                              <span
                                className={`absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-mono uppercase font-bold tracking-tight ${
                                  plan.popular
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground border border-border"
                                }`}
                              >
                                {plan.badge}
                              </span>
                            )}

                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs font-display uppercase tracking-tight text-foreground">
                                  {plan.durationDays} {plan.durationDays === 1 ? "Day" : "Days"}
                                </span>
                                {isSelected && (
                                  <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                    <Check size={10} strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 line-clamp-1">
                                {plan.description}
                              </p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-border/40">
                              <span className="text-base font-black font-display text-primary">
                                {plan.priceSol} <span className="text-[10px] font-mono text-muted-foreground">SOL</span>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Features Highlights (if not subscribed) */}
                  {!isSubscribed && (
                    <div className="bg-muted/20 border border-border/50 rounded-2xl p-3.5 space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Included with {moduleName} Pro:
                      </h4>
                      <ul className="grid grid-cols-1 gap-1.5 text-xs text-foreground/85">
                        <li className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Full unlocked pro dashboards, feeds & widgets</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Real-time on-chain analytics and instant updates</span>
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Actions Section */}
                  <div className="pt-3 border-t border-border/40 space-y-2.5">
                    {!connected ? (
                      <div className="flex flex-col items-center gap-2.5">
                        <p className="text-[11px] text-muted-foreground uppercase font-mono text-center">
                          Connect wallet to subscribe on Solana
                        </p>
                        <WalletMultiButton className="!w-full !justify-center !bg-primary hover:!bg-primary/90 !rounded-xl !font-bold" />
                      </div>
                    ) : submitting ? (
                      <button
                        disabled
                        className="w-full py-3.5 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs border border-border"
                      >
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing Transaction...</span>
                      </button>
                    ) : isSubscribed ? (
                      <div className="space-y-2">
                        <button
                          onClick={handleSubscribe}
                          className="w-full py-3.5 bg-primary text-primary-foreground hover:opacity-95 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs transition-all focus:outline-none shadow-lg shadow-primary/20 font-display"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>
                            Extend by {currentPlan.durationDays} {currentPlan.durationDays === 1 ? "Day" : "Days"} ({currentPlan.priceSol} SOL)
                          </span>
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(true)}
                          className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider text-[11px] border border-red-500/20 hover:border-red-500/30 transition-all focus:outline-none"
                        >
                          Unsubscribe from Plan
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleSubscribe}
                        className="w-full py-3.5 bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs transition-all focus:outline-none shadow-lg shadow-primary/20 font-display"
                      >
                        <span>
                          Subscribe Now ({currentPlan.priceSol} SOL / {currentPlan.durationDays} {currentPlan.durationDays === 1 ? "Day" : "Days"})
                        </span>
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

