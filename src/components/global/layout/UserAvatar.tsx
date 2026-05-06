"use client";

import { useWallet } from "@solana/wallet-adapter-react";

export function UserAvatar() {
  const { publicKey } = useWallet();
  
  // Use the public key as the seed. If not connected, it won't render anyway due to Sidebar logic, but provide a fallback.
  const seed = publicKey ? publicKey.toString() : "guest";
  const displayId = publicKey ? publicKey.toString().substring(0, 4).toUpperCase() : "GUEST";

  return (
    <div className="flex items-center gap-3">
      {/* Avatar Image Wrapper */}
      <div className="relative group/avatar cursor-pointer shrink-0">
        <img
          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=transparent`}
          alt="User Avatar"
          className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-bounce group-hover/avatar:scale-110 transition-transform duration-300 pointer-events-auto"
        />
      </div>

      {/* Expanded Text Area */}
      <div className="md:hidden md:group-hover:flex flex-col justify-center whitespace-nowrap transition-opacity overflow-hidden flex">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground font-display tracking-tight">
            User_{displayId}
          </span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] shrink-0" />
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
          Online
        </span>
      </div>
    </div>
  );
}
