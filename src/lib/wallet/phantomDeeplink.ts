import nacl from "tweetnacl";
import bs58 from "bs58";

const DAPP_KEYS_STORAGE_KEY = "street_sync_phantom_dapp_keys";
const SESSION_STORAGE_KEY = "street_sync_phantom_mobile_session";
const PENDING_SIGN_KEY = "street_sync_phantom_pending_sign";

export interface PhantomMobileSession {
  publicKey: string;
  session: string;
  sharedSecret: string; // Base58 encoded
  connectedAt: number;
  walletType?: "phantom" | "solflare";
}

export interface DappKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Retrieves existing or generates a new X25519 keypair for end-to-end encrypted
 * Diffie-Hellman communication with Phantom and Solflare mobile wallets.
 */
export function getOrCreateDappKeyPair(): DappKeyPair {
  if (typeof window === "undefined") {
    return nacl.box.keyPair();
  }

  try {
    const raw = localStorage.getItem(DAPP_KEYS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.publicKey && parsed.secretKey) {
        return {
          publicKey: bs58.decode(parsed.publicKey),
          secretKey: bs58.decode(parsed.secretKey),
        };
      }
    }
  } catch (err) {
    console.warn("[MobileDeeplink] Error loading stored dapp keypair, generating fresh:", err);
  }

  const keyPair = nacl.box.keyPair();
  try {
    localStorage.setItem(
      DAPP_KEYS_STORAGE_KEY,
      JSON.stringify({
        publicKey: bs58.encode(keyPair.publicKey),
        secretKey: bs58.encode(keyPair.secretKey),
      })
    );
  } catch (saveErr) {
    console.warn("[MobileDeeplink] Could not persist dapp keypair:", saveErr);
  }
  return keyPair;
}

/**
 * Gets currently active Mobile Wallet session if established.
 */
export function getStoredPhantomSession(): PhantomMobileSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PhantomMobileSession;
  } catch (err) {
    return null;
  }
}

/**
 * Disconnects and removes stored Mobile Wallet session.
 */
export function disconnectPhantomMobileSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("phantom_mobile_disconnected"));
}

/**
 * Universal Mobile Wallet Connect initiation for Phantom or Solflare.
 * Saves walletName in localStorage BEFORE redirecting so the wallet adapter
 * connects immediately upon returning.
 */
export function initiateMobileWalletConnect(
  walletType: "phantom" | "solflare" = "phantom",
  customRedirectUrl?: string
): void {
  if (typeof window === "undefined") return;

  const walletName = walletType === "solflare" ? "Solflare" : "Phantom";
  try {
    localStorage.setItem("walletName", JSON.stringify(walletName));
  } catch (e) {
    console.warn("[MobileDeeplink] Could not set walletName pre-redirect:", e);
  }

  const dappKeyPair = getOrCreateDappKeyPair();
  const currentUrl = customRedirectUrl || window.location.href;
  const redirectLink = currentUrl.split("#")[0].split("?")[0];

  sessionStorage.setItem("phantom_mobile_return_url", currentUrl);
  sessionStorage.setItem("mobile_wallet_type", walletType);

  const appUrl = window.location.origin.startsWith("http")
    ? window.location.origin
    : "https://streetsync-ss.com";

  const params = new URLSearchParams({
    app_url: appUrl,
    dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
    redirect_link: redirectLink,
    cluster: "devnet",
  });

  const baseUrl =
    walletType === "solflare"
      ? "https://solflare.com/ul/v1/connect"
      : "https://phantom.app/ul/v1/connect";

  window.location.href = `${baseUrl}?${params.toString()}`;
}

export function initiatePhantomMobileConnect(customRedirectUrl?: string): void {
  initiateMobileWalletConnect("phantom", customRedirectUrl);
}

export function initiateSolflareMobileConnect(customRedirectUrl?: string): void {
  initiateMobileWalletConnect("solflare", customRedirectUrl);
}

/**
 * Initiates cryptographic message signing via Mobile deep link.
 */
export function initiatePhantomMobileSignMessage(
  messageBytes: Uint8Array,
  customRedirectUrl?: string
): void {
  if (typeof window === "undefined") return;

  const session = getStoredPhantomSession();
  if (!session) {
    throw new Error("Mobile wallet is not connected.");
  }

  const dappKeyPair = getOrCreateDappKeyPair();
  const sharedSecret = bs58.decode(session.sharedSecret);
  const nonce = nacl.randomBytes(24);

  const payload = {
    session: session.session,
    message: bs58.encode(messageBytes),
  };

  const encryptedPayload = nacl.box.after(
    Buffer.from(JSON.stringify(payload)),
    nonce,
    sharedSecret
  );

  const currentUrl = customRedirectUrl || window.location.href;
  const redirectLink = currentUrl.split("#")[0].split("?")[0];
  sessionStorage.setItem(PENDING_SIGN_KEY, bs58.encode(messageBytes));

  const params = new URLSearchParams({
    dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
    nonce: bs58.encode(nonce),
    redirect_link: redirectLink,
    payload: bs58.encode(encryptedPayload),
  });

  const walletType = session.walletType || "phantom";
  const baseUrl =
    walletType === "solflare"
      ? "https://solflare.com/ul/v1/signMessage"
      : "https://phantom.app/ul/v1/signMessage";

  window.location.href = `${baseUrl}?${params.toString()}`;
}

/**
 * Checks URL parameters on page load to see if Phantom/Solflare redirected back after an action.
 * Decrypts payload, sets session and walletName immediately so autoConnect works seamlessly,
 * and strips query parameters from URL.
 */
export function processPhantomMobileRedirect(): {
  handled: boolean;
  type?: "connect" | "signMessage" | "error";
  publicKey?: string;
  signature?: string;
  error?: string;
} {
  if (typeof window === "undefined") return { handled: false };

  const urlParams = new URLSearchParams(window.location.search);
  const phantomPubKeyStr = urlParams.get("phantom_encryption_public_key");
  const nonceStr = urlParams.get("nonce");
  const dataStr = urlParams.get("data");
  const errorCode = urlParams.get("errorCode");
  const errorMessage = urlParams.get("errorMessage");

  // Clean URL parameters helper
  const cleanUrl = () => {
    try {
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete("phantom_encryption_public_key");
      cleanParams.delete("nonce");
      cleanParams.delete("data");
      cleanParams.delete("errorCode");
      cleanParams.delete("errorMessage");

      const newSearch = cleanParams.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    } catch (e) {
      console.warn("[MobileDeeplink] Could not clean URL params:", e);
    }
  };

  // Case 1: User rejected or error
  if (errorCode || errorMessage) {
    cleanUrl();
    console.warn(`[MobileDeeplink] Mobile action rejected or failed (${errorCode}): ${errorMessage}`);
    return {
      handled: true,
      type: "error",
      error: errorMessage || `Error ${errorCode}`,
    };
  }

  // Case 2: Connect or Sign response returned
  if (nonceStr && dataStr) {
    try {
      const dappKeyPair = getOrCreateDappKeyPair();
      let sharedSecret: Uint8Array;

      if (phantomPubKeyStr) {
        // Connect response contains wallet's encryption public key
        const phantomPubKey = bs58.decode(phantomPubKeyStr);
        sharedSecret = nacl.box.before(phantomPubKey, dappKeyPair.secretKey);
      } else {
        // Sign response uses previously derived shared secret
        const existingSession = getStoredPhantomSession();
        if (!existingSession) {
          cleanUrl();
          return { handled: false, error: "Missing existing session for decryption." };
        }
        sharedSecret = bs58.decode(existingSession.sharedSecret);
      }

      const nonce = bs58.decode(nonceStr);
      const encryptedData = bs58.decode(dataStr);

      const decrypted = nacl.box.open.after(encryptedData, nonce, sharedSecret);
      if (!decrypted) {
        cleanUrl();
        return { handled: true, type: "error", error: "Failed to decrypt response payload." };
      }

      const payload = JSON.parse(Buffer.from(decrypted).toString("utf8"));
      cleanUrl();

      // Connect Response
      if (payload.public_key && payload.session) {
        const walletType =
          (sessionStorage.getItem("mobile_wallet_type") as "phantom" | "solflare") || "phantom";

        const sessionData: PhantomMobileSession = {
          publicKey: payload.public_key,
          session: payload.session,
          sharedSecret: bs58.encode(sharedSecret),
          connectedAt: Date.now(),
          walletType,
        };

        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        const walletName = walletType === "solflare" ? "Solflare" : "Phantom";
        localStorage.setItem("walletName", JSON.stringify(walletName));

        window.dispatchEvent(
          new CustomEvent("phantom_mobile_connected", { detail: sessionData })
        );

        return {
          handled: true,
          type: "connect",
          publicKey: payload.public_key,
        };
      }

      // Sign Message Response
      if (payload.signature) {
        window.dispatchEvent(
          new CustomEvent("phantom_mobile_signed", { detail: payload.signature })
        );
        return {
          handled: true,
          type: "signMessage",
          signature: payload.signature,
        };
      }
    } catch (parseErr: any) {
      cleanUrl();
      console.error("[MobileDeeplink] Error processing redirect:", parseErr);
      return {
        handled: true,
        type: "error",
        error: parseErr?.message || "Failed to process mobile wallet return.",
      };
    }
  }

  return { handled: false };
}

// Automatically process redirect parameters immediately upon script load if in browser
if (typeof window !== "undefined") {
  try {
    processPhantomMobileRedirect();
  } catch (e) {
    // Non-fatal
  }
}
