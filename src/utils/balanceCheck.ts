import React from "react";
import toast from "react-hot-toast";
import { Connection, PublicKey } from "@solana/web3.js";

/**
 * Renders a custom toast warning for insufficient funds with quick options to
 * auto-request 1 SOL on Devnet or open the official Solana Faucet website.
 */
export const showInsufficientFundsToast = (
  publicKey: PublicKey,
  currentBalance: number,
  requiredAmount: number,
  connection: Connection,
  onSuccess?: () => void
) => {
  toast((t) => (
    React.createElement("div", { className: "flex flex-col gap-3 p-1 max-w-xs" },
      React.createElement("div", { className: "flex items-start gap-2.5" },
        React.createElement("span", { className: "text-lg shrink-0" }, "⚠️"),
        React.createElement("div", { className: "flex-1 min-w-0" },
          React.createElement("p", { className: "font-bold text-xs uppercase tracking-wide text-foreground font-display" },
            "Insufficient Funds"
          ),
          React.createElement("p", { className: "text-[11px] text-muted-foreground mt-1 leading-relaxed" },
            "You need ",
            React.createElement("span", { className: "font-bold text-foreground font-mono" }, requiredAmount.toFixed(4)),
            " SOL but only have ",
            React.createElement("span", { className: "font-bold text-destructive font-mono" }, currentBalance.toFixed(5)),
            " SOL."
          )
        )
      ),
      React.createElement("div", { className: "flex gap-2 justify-end mt-2 pt-2 border-t border-border/40" },
        React.createElement("a", {
          href: "https://faucet.solana.com/",
          target: "_blank",
          rel: "noopener noreferrer",
          className: "px-2.5 py-1.5 bg-secondary hover:bg-muted text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-all text-muted-foreground hover:text-foreground text-center"
        }, "Faucet Web"),
        React.createElement("button", {
          onClick: async () => {
            toast.dismiss(t.id);
            const airdropId = toast.loading("Requesting 1 SOL Devnet Airdrop...");
            try {
              const txSig = await connection.requestAirdrop(publicKey, 1_000_000_000);
              await connection.confirmTransaction(txSig, "confirmed");
              toast.dismiss(airdropId);
              toast.success("Airdrop Successful! 1 SOL added to your wallet.");
              if (onSuccess) onSuccess();
            } catch (e: any) {
              console.error("Airdrop failed:", e);
              toast.dismiss(airdropId);
              toast.error("Airdrop failed. Please use Faucet Web.", { duration: 5000 });
            }
          },
          className: "px-2.5 py-1.5 bg-primary text-primary-foreground hover:opacity-90 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center"
        }, "Auto Airdrop")
      )
    )
  ), {
    duration: 12000,
    style: {
      background: "var(--card)",
      color: "var(--foreground)",
      border: "1px solid var(--border)",
      borderRadius: "0.75rem",
      padding: "0.75rem",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
    }
  });
};

/**
 * Checks balance and returns true if user has sufficient SOL (including estimated fee),
 * otherwise displays the custom insufficient funds toast and returns false.
 */
export const checkSolBalance = async (
  publicKey: PublicKey,
  requiredSol: number,
  connection: Connection,
  onSuccess?: () => void
): Promise<boolean> => {
  try {
    const balanceLamports = await connection.getBalance(publicKey, "confirmed");
    const balanceSol = balanceLamports / 1e9;
    const estimatedFee = 0.00005; // buffer for fee
    
    if (balanceSol < requiredSol + estimatedFee) {
      showInsufficientFundsToast(publicKey, balanceSol, requiredSol, connection, onSuccess);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to fetch balance in checkSolBalance:", e);
    // If balance check itself fails, we bypass to let the wallet handler try
    return true;
  }
};
