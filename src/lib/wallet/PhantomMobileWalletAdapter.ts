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
  initiatePhantomMobileConnect,
  initiatePhantomMobileSignMessage,
  initiatePhantomMobileSignTransaction,
  initiatePhantomMobileSignAllTransactions,
  disconnectPhantomMobileSession,
} from "./phantomDeeplink";

export const PhantomMobileWalletName = "Phantom" as WalletName<"Phantom">;

export class PhantomMobileWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = PhantomMobileWalletName;
  url = "https://phantom.app";
  icon =
    "data:image/svg+xml;utf8,<svg viewBox='0 0 128 128' fill='none' xmlns='http://www.w3.org/2000/svg'><circle cx='64' cy='64' r='64' fill='%23AB9FF2'/><path d='M110.5 64C110.5 89.6812 89.6812 110.5 64 110.5C38.3188 110.5 17.5 89.6812 17.5 64C17.5 38.3188 38.3188 17.5 64 17.5C89.6812 17.5 110.5 38.3188 110.5 64Z' fill='%23534BB1'/><path d='M73.5 48.5C73.5 51.5376 71.0376 54 68 54C64.9624 54 62.5 51.5376 62.5 48.5C62.5 45.4624 64.9624 43 68 43C71.0376 43 73.5 45.4624 73.5 48.5Z' fill='white'/><path d='M93.5 48.5C93.5 51.5376 91.0376 54 88 54C84.9624 54 82.5 51.5376 82.5 48.5C82.5 45.4624 84.9624 43 88 43C91.0376 43 93.5 45.4624 93.5 48.5Z' fill='white'/></svg>";
  supportedTransactionVersions = new Set(["legacy" as const, 0 as const]);

  private _publicKey: PublicKey | null = null;
  private _connecting = false;
  private _readyState: WalletReadyState = WalletReadyState.NotDetected;
  private _mwaDelegate?: BaseMessageSignerWalletAdapter;

  constructor(options?: { mwaDelegate?: BaseMessageSignerWalletAdapter }) {
    super();

    if (options?.mwaDelegate) {
      this._mwaDelegate = options.mwaDelegate;
      this._readyState = options.mwaDelegate.readyState;
      this._mwaDelegate.on("connect", (publicKey: PublicKey) => {
        this._publicKey = publicKey;
        this.emit("connect", publicKey);
      });
      this._mwaDelegate.on("disconnect", () => {
        this._publicKey = null;
        this.emit("disconnect");
      });
      this._mwaDelegate.on("error", (error: any) => {
        this.emit("error", error);
      });
      return;
    }

    if (typeof window !== "undefined") {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const hasInjected = Boolean(
        (window as any).phantom?.solana || (window as any).solana
      );

      // On mobile without injected extension, Phantom is ready via native app deep links
      if (isMobile && !hasInjected) {
        this._readyState = WalletReadyState.Installed;
      }

      // Check if session was already established
      const stored = getStoredPhantomSession();
      if (stored && stored.publicKey) {
        try {
          this._publicKey = new PublicKey(stored.publicKey);
          // Emit connect after microtask so WalletProvider listeners are registered
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
      window.addEventListener("phantom_mobile_connected", (e: any) => {
        const detail = e.detail;
        if (detail && detail.publicKey) {
          try {
            this._publicKey = new PublicKey(detail.publicKey);
            this.emit("connect", this._publicKey);
          } catch (err) {
            console.error("[PhantomMobileAdapter] Invalid pubkey on connect:", err);
          }
        }
      });

      window.addEventListener("phantom_mobile_disconnected", () => {
        this._publicKey = null;
        this.emit("disconnect");
      });
    }
  }

  get publicKey(): PublicKey | null {
    return this._mwaDelegate ? this._mwaDelegate.publicKey : this._publicKey;
  }

  get connecting(): boolean {
    return this._mwaDelegate ? this._mwaDelegate.connecting : this._connecting;
  }

  get readyState(): WalletReadyState {
    return this._mwaDelegate ? this._mwaDelegate.readyState : this._readyState;
  }

  async connect(): Promise<void> {
    if (this._mwaDelegate) {
      return this._mwaDelegate.connect();
    }

    try {
      const stored = getStoredPhantomSession();
      if (stored && stored.publicKey) {
        this._publicKey = new PublicKey(stored.publicKey);
        this.emit("connect", this._publicKey);
        return;
      }

      if (this.connecting) return;

      this._connecting = true;
      initiatePhantomMobileConnect();
    } catch (error: any) {
      this.emit("error", new WalletConnectionError(error?.message));
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this._mwaDelegate) {
      return this._mwaDelegate.disconnect();
    }

    disconnectPhantomMobileSession();
    this._publicKey = null;
    this.emit("disconnect");
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (this._mwaDelegate) {
      return this._mwaDelegate.signMessage(message);
    }

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
          reject(new Error("No signature received from Phantom Mobile."));
        }
      };

      const handleError = (e: any) => {
        cleanup();
        reject(new Error(e.detail?.error || "Message signing rejected by user."));
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener("phantom_mobile_signed", handleSigned);
        window.removeEventListener("phantom_mobile_error", handleError);
      };

      window.addEventListener("phantom_mobile_signed", handleSigned);
      window.addEventListener("phantom_mobile_error", handleError);

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Message signing timed out."));
      }, 5 * 60 * 1000);

      try {
        initiatePhantomMobileSignMessage(message);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (this._mwaDelegate) {
      return this._mwaDelegate.signTransaction(transaction);
    }

    if (!this.connected || !this._publicKey) {
      throw new Error("Wallet not connected");
    }

    const session = getStoredPhantomSession();
    if (!session) {
      throw new Error("Phantom Mobile session not found. Please reconnect your wallet.");
    }

    const isVersioned = "version" in (transaction as any);

    // Ensure feePayer is set for standard transaction if missing
    if (!isVersioned) {
      const tx = transaction as Transaction;
      if (!tx.feePayer) {
        tx.feePayer = this._publicKey;
      }
    }

    // Serialize transaction for deep link transport
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
      console.error("[PhantomMobileAdapter] Transaction serialization error:", err);
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
          reject(new Error("No signed transaction received from Phantom Mobile."));
        }
      };

      const handleError = (e: any) => {
        cleanup();
        reject(new Error(e.detail?.error || "Transaction rejected by user in Phantom."));
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener("phantom_mobile_tx_signed", handleSigned);
        window.removeEventListener("phantom_mobile_error", handleError);
      };

      window.addEventListener("phantom_mobile_tx_signed", handleSigned);
      window.addEventListener("phantom_mobile_error", handleError);

      // 5-minute timeout window for mobile app-switch & approval
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Transaction signing timed out."));
      }, 5 * 60 * 1000);

      try {
        initiatePhantomMobileSignTransaction(serializedBytes);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    if (this._mwaDelegate) {
      return this._mwaDelegate.signAllTransactions(transactions);
    }

    if (!this.connected || !this._publicKey) {
      throw new Error("Wallet not connected");
    }

    const session = getStoredPhantomSession();
    if (!session) {
      throw new Error("Phantom Mobile session not found. Please reconnect your wallet.");
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
          reject(new Error("No transactions received from Phantom Mobile."));
        }
      };

      const handleError = (e: any) => {
        cleanup();
        reject(new Error(e.detail?.error || "Transactions rejected by user in Phantom."));
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener("phantom_mobile_all_tx_signed", handleSigned);
        window.removeEventListener("phantom_mobile_error", handleError);
      };

      window.addEventListener("phantom_mobile_all_tx_signed", handleSigned);
      window.addEventListener("phantom_mobile_error", handleError);

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Batch transaction signing timed out."));
      }, 5 * 60 * 1000);

      try {
        initiatePhantomMobileSignAllTransactions(serializedList);
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
    if (this._mwaDelegate) {
      return this._mwaDelegate.sendTransaction(transaction, connection, options);
    }

    if (!this.connected || !this._publicKey) {
      throw new Error("Wallet not connected");
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
    const rawTx = signedTx.serialize();

    const signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: options.skipPreflight ?? true,
      preflightCommitment: options.preflightCommitment ?? "confirmed",
      maxRetries: options.maxRetries ?? 5,
    });

    return signature;
  }
}

