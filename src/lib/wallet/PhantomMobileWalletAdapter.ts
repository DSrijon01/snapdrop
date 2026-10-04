import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletReadyState,
  WalletConnectionError,
} from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
  getStoredPhantomSession,
  initiatePhantomMobileConnect,
  initiatePhantomMobileSignMessage,
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

  constructor() {
    super();

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
    disconnectPhantomMobileSession();
    this._publicKey = null;
    this.emit("disconnect");
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected || !this._publicKey) {
      throw new Error("Wallet not connected");
    }

    return new Promise<Uint8Array>((resolve, reject) => {
      const handleSigned = (e: any) => {
        window.removeEventListener("phantom_mobile_signed", handleSigned);
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

      window.addEventListener("phantom_mobile_signed", handleSigned);
      try {
        initiatePhantomMobileSignMessage(message);
      } catch (err) {
        window.removeEventListener("phantom_mobile_signed", handleSigned);
        reject(err);
      }
    });
  }

  async signTransaction<T extends any>(transaction: T): Promise<T> {
    return transaction;
  }

  async signAllTransactions<T extends any>(transactions: T[]): Promise<T[]> {
    return transactions;
  }
}
