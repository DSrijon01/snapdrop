import { AdminPanel } from "@/components/features/one-click-launch/AdminPanel";

export default function OneClickLaunchPage() {
  return (
    <div className="flex flex-col items-center justify-start p-8 min-h-[calc(100vh-100px)]">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black mb-2 font-display uppercase tracking-tight">One-Click Launch</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Manage protocols, token launches, and staking configuration.
        </p>
      </div>
      
      <AdminPanel />
    </div>
  );
}
