import { StakingDashboard } from "@/components/features/snbl/StakingDashboard";

export default function SnblPage() {
  return (
    <div className="flex flex-col items-center justify-start p-8 min-h-[calc(100vh-100px)]">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black mb-2 font-display uppercase tracking-tight">SNBL Staking</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Stake your SNBL tokens to earn rewards and participate in the Street Sync ecosystem.
        </p>
      </div>
      
      <StakingDashboard />
    </div>
  );
}
