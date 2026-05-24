import { TradingTerminal } from "@/components/features/openclaw/TradingTerminal";

export default function OpenclawPage() {
  return (
    <div className="flex flex-col items-center justify-start p-2 md:p-6 min-h-[calc(100vh-100px)]">
      <div className="text-center mb-6 shrink-0">
        <h1 className="text-4xl font-black mb-2 font-display uppercase tracking-tight">OpenClaw AI Terminal</h1>
        <p className="text-muted-foreground text-xs md:text-sm max-w-2xl mx-auto uppercase tracking-wider font-mono">
          GPU-Accelerated Autonomous AI Agents & Execution System
        </p>
      </div>
      
      <TradingTerminal />
    </div>
  );
}

