import { FC, ReactNode, useState } from "react";
import { ExtensionType } from "@solana/spl-token";

export type BadgeType = "SPL" | "TOKEN_2022" | "EXTENSION";

interface TokenBadgeProps {
  type: BadgeType;
  extensionType?: ExtensionType;
  className?: string;
}

const Tooltip = ({ children, content }: { children: ReactNode; content: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/95 text-white text-xs rounded-md p-2.5 shadow-xl z-50 pointer-events-none transition-all duration-200 text-center font-normal leading-normal whitespace-normal">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/95"></div>
        </div>
      )}
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
      case ExtensionType.TransferFeeConfig:
        label = "💸 Transfer Fee";
        tooltip = "A transaction fee is collected on transfers.";
        style = "bg-blue-500/10 text-blue-500 border-blue-500/20";
        break;
      case ExtensionType.InterestBearingConfig:
        label = "📈 Interest Bearing";
        tooltip = "Tokens accumulate interest continuously.";
        style = "bg-blue-500/10 text-blue-500 border-blue-500/20";
        break;
      case ExtensionType.PermanentDelegate:
        label = "👤 Perm Delegate";
        tooltip = "The platform has absolute authority to transfer or burn tokens.";
        style = "bg-purple-500/10 text-purple-500 border-purple-500/20";
        break;
      case ExtensionType.MintCloseAuthority:
        label = "🔒 Close Auth";
        tooltip = "Authority can close the mint account permanently.";
        style = "bg-purple-500/10 text-purple-500 border-purple-500/20";
        break;
      case ExtensionType.PausableConfig:
        label = "⏸️ Pausable";
        tooltip = "Authority can pause and resume token transfers.";
        style = "bg-purple-500/10 text-purple-500 border-purple-500/20";
        break;
      case ExtensionType.DefaultAccountState:
        label = "❄️ Default State";
        tooltip = "New accounts are frozen by default.";
        style = "bg-purple-500/10 text-purple-500 border-purple-500/20";
        break;
      case ExtensionType.NonTransferable:
        label = "🔒 Soulbound";
        tooltip = "These tokens are Soulbound and cannot be transferred.";
        style = "bg-orange-500/10 text-orange-500 border-orange-500/20";
        break;
      case ExtensionType.TokenGroup:
        label = "📁 Token Group Parent";
        tooltip = "This token acts as a collection/parent group.";
        style = "bg-orange-500/10 text-orange-500 border-orange-500/20";
        break;
      case ExtensionType.TokenGroupMember:
        label = "🏷️ Token Group Child";
        tooltip = "This token is a member of a parent token group.";
        style = "bg-orange-500/10 text-orange-500 border-orange-500/20";
        break;
      case ExtensionType.TransferHook:
        label = "⚓ Transfer Hook";
        tooltip = "External program executes on every transfer.";
        style = "bg-orange-500/10 text-orange-500 border-orange-500/20";
        break;
      case ExtensionType.TokenMetadata:
        label = "📄 Metadata";
        tooltip = "Stores native metadata directly in the mint account.";
        style = "bg-green-500/10 text-green-500 border-green-500/20";
        break;
      case ExtensionType.MetadataPointer:
        label = "📍 Meta Pointer";
        tooltip = "Points to where token metadata is stored.";
        style = "bg-green-500/10 text-green-500 border-green-500/20";
        break;
      case ExtensionType.ImmutableOwner:
        label = "🔒 Immutable Owner";
        tooltip = "Associated token accounts cannot change ownership.";
        style = "bg-green-500/10 text-green-500 border-green-500/20";
        break;
      case ExtensionType.CpiGuard:
        label = "🛡️ CPI Guard";
        tooltip = "Locks token account from unauthorized Cross-Program Invocations.";
        style = "bg-green-500/10 text-green-500 border-green-500/20";
        break;
      case ExtensionType.MemoTransfer:
        label = "📝 Memo Required";
        tooltip = "Requires memo text for all incoming transfers.";
        style = "bg-green-500/10 text-green-500 border-green-500/20";
        break;
      default:
        return null;
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
