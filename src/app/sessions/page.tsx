"use client";

import { SessionsBoard } from "@/components/features/sessions/SessionsBoard";
import { ModuleSubscriptionWidget } from "@/components/global/subscription/ModuleSubscriptionWidget";

export default function SessionsPage() {
  return (
    <div className="flex flex-col items-center justify-start p-8 min-h-[calc(100vh-100px)] w-full">
      <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-border/40 pb-6 mb-8 shrink-0">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-black mb-2 font-display uppercase tracking-tight">Sessions</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Monitor and join active live trading sessions in the Street Sync network.
          </p>
        </div>
        <ModuleSubscriptionWidget moduleId="sessions" />
      </div>
      
      <div className="w-full flex-1">
        <SessionsBoard />
      </div>
    </div>
  );
}
