import { FC, ReactNode } from "react";
import { ExtensionType } from "@solana/spl-token";

export type BadgeType = "SPL" | "TOKEN_2022" | "EXTENSION";

interface TokenBadgeProps {
  type: BadgeType;
  extensionType?: ExtensionType;
  className?: string;
}

const Tooltip = ({ children, content }: { children: ReactNode; content: string }) => {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-black/90 text-white text-xs rounded-md p-2 shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
      </div>
    </div>
  );
};

export const TokenBadge: FC<TokenBadgeProps> = ({ type, extensionType, className = "" }) => {
  if (type === "SPL") {
    return (
      <div className={`bg-secondary/50 backdrop-blur-md text-secondary-foreground px-2 py-1 rounded-md text-[10px] font-medium border border-border/50 ${className}`}>
        Standard SPL
      </div>
    );
  }

  if (type === "TOKEN_2022") {
    return (
      <div className={`bg-secondary/50 backdrop-blur-md text-secondary-foreground px-2 py-1 rounded-md text-[10px] font-medium border border-border/50 ${className}`}>
        Token-2022
      </div>
    );
  }

  if (type === "EXTENSION" && extensionType !== undefined) {
    let label = "";
    let tooltip = "";
    let style = "";

    switch (extensionType) {
      case ExtensionType.PermanentDelegate:
        label = "🛡️ Platform Delegated";
        tooltip = "A designated authority can transfer or burn these tokens.";
        style = "bg-blue-500/20 text-blue-500 border-blue-500/30";
        break;
      case ExtensionType.NonTransferable:
        label = "🔒 Soulbound";
        tooltip = "These tokens cannot be transferred to another wallet.";
        style = "bg-purple-500/20 text-purple-500 border-purple-500/30";
        break;
      default:
        return null; // Don't render badges for other extensions like TokenMetadata right now unless needed.
    }

    return (
      <Tooltip content={tooltip}>
        <div className={`px-2 py-1 rounded-md text-[10px] font-medium border cursor-help flex items-center gap-1 ${style} ${className}`}>
          {label}
        </div>
      </Tooltip>
    );
  }

  return null;
};
