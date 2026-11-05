import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletReadyState,
  WalletConnectionError,
  SendTransactionOptions,
} from "@solana/wallet-adapter-base";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  getStoredPhantomSession,
  initiateSolflareMobileConnect,
  initiatePhantomMobileSignMessage,
  initiatePhantomMobileSignTransaction,
  initiatePhantomMobileSignAllTransactions,
  disconnectPhantomMobileSession,
} from "./phantomDeeplink";
import { isStandaloneApp } from "@/utils/isStandaloneApp";

export const SolflareMobileWalletName = "Solflare" as WalletName<"Solflare">;

export class SolflareMobileWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = SolflareMobileWalletName;
  url = "https://solflare.com";
  icon =
    "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJTIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMwMjA1MGE7c3Ryb2tlOiNmZmVmNDY7c3Ryb2tlLW1pdGVybGltaXQ6MTA7c3Ryb2tlLXdpZHRoOi41cHg7fS5jbHMtMntmaWxsOiNmZmVmNDY7fTwvc3R5bGU+PC9kZWZzPjxyZWN0IGNsYXNzPSJjbHMtMiIgeD0iMCIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTIiIHJ5PSIxMiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI0LjIzLDI2LjQybDIuNDYtMi4zOCw0LjU5LDEuNWMzLjAxLDEsNC41MSwyLjg0LDQuNTEsNS40MywwLDEuOTYtLjc1LDMuMjYtMi4yNSw0LjkzbC0uNDYuNS4xNy0xLjE3Yy42Ny00LjI2LS41OC02LjA5LTQuNzItNy40M2wtNC4zLTEuMzhoMFpNMTguMDUsMTEuODVsMTIuNTIsNC4xNy0yLjcxLDIuNTktNi41MS0yLjE3Yy0yLjI1LS43NS0zLjAxLTEuOTYtMy4zLTQuNTF2LS4wOGgwWk0xNy4zLDMzLjA2bDIuODQtMi43MSw1LjM0LDEuNzVjMi44LjkyLDMuNzYsMi4xMywzLjQ2LDUuMThsLTExLjY1LTQuMjJoMFpNMTMuNzEsMjAuOTVjMC0uNzkuNDItMS41NCwxLjEzLTIuMTcuNzUsMS4wOSwyLjA1LDIuMDUsNC4wOSwyLjcxbDQuNDIsMS40Ni0yLjQ2LDIuMzgtNC4zNC0xLjQyYy0yLS42Ny0yLjg0LTEuNjctMi44NC0yLjk2TTI2LjgyLDQyLjg3YzkuMTgtNi4wOSwxNC4xMS0xMC4yMywxNC4xMS0xNS4zMiwwLTMuMzgtMi01LjI2LTYuNDMtNi43MmwtMy4zNC0xLjEzLDkuMTQtOC43Ny0xLjg0LTEuOTYtMi43MSwyLjM4LTEyLjgxLTQuMjJjLTMuOTcsMS4yOS04Ljk3LDUuMDktOC45Nyw4Ljg5LDAsLjQyLjA0LjgzLjE3LDEuMjktMy4zLDEuODgtNC42MywzLjYzLTQuNjMsNS44LDAsMi4wNSwxLjA5LDQuMDksNC41NSw1LjIybDIuNzUuOTItOS41Miw5LjE0LDEuODQsMS45NiwyLjk2LTIuNzEsMTQuNzMsNS4yMmgwWiIvPjwvc3ZnPg==";
  supportedTransactionVersions = new Set(["legacy" as const, 0 as const]);
  readonly isSolflareMobileAdapter = true;

  private _publicKey: PublicKey | null = null;
  private _connecting = false;
  private _readyState: WalletReadyState = WalletReadyState.NotDetected;

  // Track whether connect() was initiated by an explicit user gesture (button click)
  private static _isExplicitUserInteraction = false;

  public static markExplicitUserInteraction(): void {
    SolflareMobileWalletAdapter._isExplicitUserInteraction = true;
  }

  constructor() {
    super();

    if (typeof window !== "undefined") {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isApp = isStandaloneApp();
      const hasInjected = Boolean(
        (window as any).solflare?.isSolflare || (window as any).SolflareApp
      );

      // On mobile or standalone app without injected extension, Solflare is ready via universal deep links
      if ((isMobile || isApp) && !hasInjected) {
        this._readyState = WalletReadyState.Installed;
      }

      // Check if session was already established for Solflare
      const stored = getStoredPhantomSession();
      if (stored && stored.publicKey && stored.walletType === "solflare") {
        try {
          this._publicKey = new PublicKey(stored.publicKey);
          setTimeout(() => {
            if (this._publicKey) {
              this.emit("connect", this._publicKey);
            }
          }, 0);
        } catch {
          this._publicKey = null;
        }
      }

      // Listen for custom connect / disconnect events
      const handleConnect = (e: any) => {
        const detail = e.detail;
        if (detail && detail.publicKey && detail.walletType === "solflare") {
          try {
            this._publicKey = new PublicKey(detail.publicKey);
            this.emit("connect", this._publicKey);
          } catch (err) {
            console.error("[SolflareMobileAdapter] Invalid pubkey on connect:", err);
          }
        }
      };

      window.addEventListener("solflare_mobile_connected", handleConnect);
      window.addEventListener("phantom_mobile_connected", handleConnect);

      window.addEventListener("solflare_mobile_disconnected", () => {
        this._publicKey = null;
        this.emit("disconnect");
      });
      window.addEventListener("phantom_mobile_disconnected", () => {
        const storedAfter = getStoredPhantomSession();
        if (!storedAfter) {
          this._publicKey = null;
          this.emit("disconnect");
        }
      });
    }
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  async connect(): Promise<void> {
    try {
      // 1. If stored session exists and is Solflare, silently restore it
      const stored = getStoredPhantomSession();
      if (stored && stored.publicKey && stored.walletType === "solflare") {
        this._publicKey = new PublicKey(stored.publicKey);
        this.emit("connect", this._publicKey);
        return;
      }

      // 2. CRITICAL PROTECTION: Never redirect on background autoConnect!
      if (!SolflareMobileWalletAdapter._isExplicitUserInteraction) {
        console.debug(
          "[SolflareMobileAdapter] AutoConnect skipped: no stored Solflare session and not user-initiated."
        );
        return;
      }

      SolflareMobileWalletAdapter._isExplicitUserInteraction = false;

      if (this.connecting) return;

      this._connecting = true;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("street_sync_close_all_modals"));
      }
      initiateSolflareMobileConnect();
    } catch (error: any) {
      this.emit("error", new WalletConnectionError(error?.message));
      throw error;
    } finally {
      this._connecting = false;
      SolflareMobileWalletAdapter._isExplicitUserInteraction = false;
    }
  }

  async disconnect(): Promise<void> {
    disconnectPhantomMobileSession();
    this._publicKey = null;
    this.emit("disconnect");
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected || !this._publicKey) {
      throw new Error("Wallet not connected");
    }

    return new Promise<Uint8Array>((resolve, reject) => {
      let timeoutId: any = null;

      const handleSigned = (e: any) => {
        cleanup();
        if (e.detail) {
          try {
            resolve(bs58.decode(e.detail));
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error("No signature received from Solflare Mobile."));
        }
      };

      const handleError = (e: any) => {
        cleanup();
        reject(new Error(e.detail?.error || "Message signing rejected by user in Solflare."));
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener("phantom_mobile_signed", handleSigned);
        window.removeEventListener("solflare_mobile_signed", handleSigned);
        window.removeEventListener("phantom_mobile_error", handleError);
        window.removeEventListener("solflare_mobile_error", handleError);
      };

      window.addEventListener("phantom_mobile_signed", handleSigned);
      window.addEventListener("solflare_mobile_signed", handleSigned);
      window.addEventListener("phantom_mobile_error", handleError);
      window.addEventListener("solflare_mobile_error", handleError);

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Message signing timed out in Solflare."));
      }, 5 * 60 * 1000);

      try {
        const returnTarget = typeof window !== "undefined" && window.location.pathname.includes("sessions")
          ? `${window.location.origin}/sessions`
          : undefined;
        initiatePhantomMobileSignMessage(message, returnTarget);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (!this.connected || !this._publicKey) {
      const stored = getStoredPhantomSession();
      if (stored && stored.publicKey && stored.walletType === "solflare") {
        this._publicKey = new PublicKey(stored.publicKey);
      } else {
        throw new Error("Wallet not connected");
      }
    }

    const session = getStoredPhantomSession();
    if (!session || session.walletType !== "solflare") {
      throw new Error("Solflare Mobile session not found. Please reconnect your wallet.");
    }

    const isVersioned = "version" in (transaction as any);

    if (!isVersioned) {
      const tx = transaction as Transaction;
      if (!tx.feePayer) {
        tx.feePayer = this._publicKey;
      }
    }

    let serializedBytes: Uint8Array;
    try {
      if (isVersioned) {
        serializedBytes = (transaction as VersionedTransaction).serialize();
      } else {
        serializedBytes = (transaction as Transaction).serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });
      }
    } catch (err: any) {
      console.error("[SolflareMobileAdapter] Transaction serialization error:", err);
      throw new Error(`Failed to serialize transaction for mobile signing: ${err?.message || err}`);
    }

    return new Promise<T>((resolve, reject) => {
      let timeoutId: any = null;

      const handleSigned = (e: any) => {
        cleanup();
        if (e.detail?.transaction) {
          try {
            const signedBytes = bs58.decode(e.detail.transaction);
            if (isVersioned) {
              const deserialized = VersionedTransaction.deserialize(signedBytes);
              resolve(deserialized as unknown as T);
            } else {
              const deserialized = Transaction.from(signedBytes);
              resolve(deserialized as unknown as T);
            }
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error("No signed transaction received from Solflare Mobile."));
        }
      };

      const handleError = (e: any) => {
        cleanup();
        reject(new Error(e.detail?.error || "Transaction rejected by user in Solflare."));
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener("phantom_mobile_tx_signed", handleSigned);
        window.removeEventListener("solflare_mobile_tx_signed", handleSigned);
        window.removeEventListener("phantom_mobile_error", handleError);
        window.removeEventListener("solflare_mobile_error", handleError);
      };

      window.addEventListener("phantom_mobile_tx_signed", handleSigned);
      window.addEventListener("solflare_mobile_tx_signed", handleSigned);
      window.addEventListener("phantom_mobile_error", handleError);
      window.addEventListener("solflare_mobile_error", handleError);

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Transaction signing timed out in Solflare."));
      }, 5 * 60 * 1000);

      try {
        const returnTarget = typeof window !== "undefined" && window.location.pathname.includes("sessions")
          ? `${window.location.origin}/sessions`
          : undefined;
        initiatePhantomMobileSignTransaction(serializedBytes, returnTarget);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    if (!this.connected || !this._publicKey) {
      const stored = getStoredPhantomSession();
      if (stored && stored.publicKey && stored.walletType === "solflare") {
        this._publicKey = new PublicKey(stored.publicKey);
      } else {
        throw new Error("Wallet not connected");
      }
    }

    const session = getStoredPhantomSession();
    if (!session || session.walletType !== "solflare") {
      throw new Error("Solflare Mobile session not found. Please reconnect your wallet.");
    }

    const serializedList: Uint8Array[] = [];
    const isVersionedList: boolean[] = [];

    for (const transaction of transactions) {
      const isVersioned = "version" in (transaction as any);
      isVersionedList.push(isVersioned);
      if (!isVersioned) {
        const tx = transaction as Transaction;
        if (!tx.feePayer) tx.feePayer = this._publicKey;
        serializedList.push(
          tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          })
        );
      } else {
        serializedList.push((transaction as VersionedTransaction).serialize());
      }
    }

    return new Promise<T[]>((resolve, reject) => {
      let timeoutId: any = null;

      const handleSigned = (e: any) => {
        cleanup();
        if (e.detail?.transactions && Array.isArray(e.detail.transactions)) {
          try {
            const results: T[] = [];
            for (let i = 0; i < e.detail.transactions.length; i++) {
              const raw = bs58.decode(e.detail.transactions[i]);
              if (isVersionedList[i]) {
                results.push(VersionedTransaction.deserialize(raw) as unknown as T);
              } else {
                results.push(Transaction.from(raw) as unknown as T);
              }
            }
            resolve(results);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error("No transactions received from Solflare Mobile."));
        }
      };

      const handleError = (e: any) => {
        cleanup();
        reject(new Error(e.detail?.error || "Transactions rejected by user in Solflare."));
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener("phantom_mobile_all_tx_signed", handleSigned);
        window.removeEventListener("solflare_mobile_all_tx_signed", handleSigned);
        window.removeEventListener("phantom_mobile_error", handleError);
        window.removeEventListener("solflare_mobile_error", handleError);
      };

      window.addEventListener("phantom_mobile_all_tx_signed", handleSigned);
      window.addEventListener("solflare_mobile_all_tx_signed", handleSigned);
      window.addEventListener("phantom_mobile_error", handleError);
      window.addEventListener("solflare_mobile_error", handleError);

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Batch transaction signing timed out in Solflare."));
      }, 5 * 60 * 1000);

      try {
        const returnTarget = typeof window !== "undefined" && window.location.pathname.includes("sessions")
          ? `${window.location.origin}/sessions`
          : undefined;
        initiatePhantomMobileSignAllTransactions(serializedList, returnTarget);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options: SendTransactionOptions = {}
  ): Promise<TransactionSignature> {
    if (!this.connected || !this._publicKey) {
      const stored = getStoredPhantomSession();
      if (stored && stored.publicKey && stored.walletType === "solflare") {
        this._publicKey = new PublicKey(stored.publicKey);
      } else {
        throw new Error("Wallet not connected");
      }
    }

    const session = getStoredPhantomSession();
    if (!session || session.walletType !== "solflare") {
      throw new Error("Solflare Mobile session not found. Please reconnect your wallet.");
    }

    const isVersioned = "version" in (transaction as any);
    if (isVersioned) {
      if (options.signers && options.signers.length > 0) {
        (transaction as VersionedTransaction).sign(options.signers);
      }
    } else {
      const tx = transaction as Transaction;
      tx.feePayer = tx.feePayer || this._publicKey;
      if (!tx.recentBlockhash) {
        const { blockhash } = await connection.getLatestBlockhash(
          options.preflightCommitment || "confirmed"
        );
        tx.recentBlockhash = blockhash;
      }
      if (options.signers && options.signers.length > 0) {
        for (const s of options.signers) {
          tx.partialSign(s);
        }
      }
    }

    const signedTx = await this.signTransaction(transaction);

    const signedBytes = isVersioned
      ? (signedTx as VersionedTransaction).serialize()
      : (signedTx as Transaction).serialize();

    let signature = "";
    try {
      signature = await connection.sendRawTransaction(signedBytes, {
        skipPreflight: options.skipPreflight ?? true,
        preflightCommitment: options.preflightCommitment || "confirmed",
        maxRetries: options.maxRetries ?? 5,
      });
    } catch (sendErr: any) {
      const sendErrStr = (sendErr?.message || "").toLowerCase();
      if (
        sendErrStr.includes("already been processed") ||
        sendErrStr.includes("0x0") ||
        sendErrStr.includes("duplicate")
      ) {
        const tx = isVersioned ? null : Transaction.from(signedBytes);
        signature = tx ? bs58.encode(tx.signatures[0]?.signature || (tx as any).signature) : "";
      } else {
        throw sendErr;
      }
    }

    if (signature) {
      try {
        localStorage.setItem("street_sync_last_tx_signature", signature);
      } catch {}
    }

    return signature;
  }
}
