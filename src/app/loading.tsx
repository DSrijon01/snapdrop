export default function Loading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center mb-6">
        {/* Glowing aura */}
        <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl animate-pulse scale-125" />
        
        {/* App Icon Container */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/40 flex items-center justify-center bg-black/40">
          <img
            src="/logo.png"
            alt="Street Sync"
            className="w-full h-full object-cover animate-pulse"
          />
        </div>

        {/* Orbiting spinner ring */}
        <div className="absolute -inset-2 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
      </div>

      <h3 className="font-display font-black text-xl sm:text-2xl tracking-wider text-foreground uppercase mb-2">
        STREET <span className="text-primary">SYNC</span>
      </h3>
      
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        <span>Syncing Data...</span>
      </div>
    </div>
  );
}
