import nacl from "tweetnacl";
import bs58 from "bs58";
import { Buffer } from "buffer";
import { isStandaloneApp } from "@/utils/isStandaloneApp";

const DAPP_KEYS_STORAGE_KEY = "street_sync_phantom_dapp_keys";
const SESSION_STORAGE_KEY = "street_sync_phantom_mobile_session";
const PENDING_SIGN_KEY = "street_sync_phantom_pending_sign";

export interface PhantomMobileSession {
  publicKey: string;
  session: string;
  sharedSecret: string; // Base58 encoded
  connectedAt: number;
  walletType?: "phantom" | "solflare";
  dappPublicKey?: string; // Base58 encoded dapp encryption public key
  dappSecretKey?: string; // Base58 encoded dapp encryption secret key
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

  // 1. Check existing session first to ensure key continuity
  try {
    const existingSession = getStoredPhantomSession();
    if (existingSession?.dappPublicKey && existingSession?.dappSecretKey) {
      return {
        publicKey: bs58.decode(existingSession.dappPublicKey),
        secretKey: bs58.decode(existingSession.dappSecretKey),
      };
    }
  } catch {}

  // 2. Check localStorage & sessionStorage
  try {
    const raw = localStorage.getItem(DAPP_KEYS_STORAGE_KEY) || sessionStorage.getItem(DAPP_KEYS_STORAGE_KEY);
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
  const serialized = JSON.stringify({
    publicKey: bs58.encode(keyPair.publicKey),
    secretKey: bs58.encode(keyPair.secretKey),
  });
  try {
    localStorage.setItem(DAPP_KEYS_STORAGE_KEY, serialized);
    sessionStorage.setItem(DAPP_KEYS_STORAGE_KEY, serialized);
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
 * Disconnects and removes stored Mobile Wallet session and associated stale keys.
 */
export function disconnectPhantomMobileSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(DAPP_KEYS_STORAGE_KEY);
    sessionStorage.removeItem(DAPP_KEYS_STORAGE_KEY);
    sessionStorage.removeItem("street_sync_temp_dapp_pubkey");
    sessionStorage.removeItem("street_sync_temp_dapp_seckey");
    sessionStorage.removeItem("mobile_wallet_type");
    localStorage.removeItem("street_sync_pending_subscription");
    localStorage.removeItem("street_sync_last_signed_tx");
    localStorage.removeItem("street_sync_last_tx_signature");
  } catch (e) {
    console.warn("[MobileDeeplink] Error clearing session storage:", e);
  }
  window.dispatchEvent(new CustomEvent("phantom_mobile_disconnected"));
}

/**
 * Calculates the appropriate redirect link.
 * Inside standalone Android app, uses custom scheme streetsync://callback so Phantom returns
 * into the Android native app instead of launching Google Chrome.
 */
export function getMobileRedirectLink(customRedirectUrl?: string): string {
  if (typeof window === "undefined") return "https://streetsync-ss.com/";
  const currentUrl = customRedirectUrl || window.location.href;
  if (isStandaloneApp()) {
    try {
      const urlObj = new URL(currentUrl);
      const cleanPath = urlObj.pathname.replace(/^\//, "");
      return cleanPath ? `streetsync://${cleanPath}` : "streetsync://callback";
    } catch {
      return "streetsync://callback";
    }
  }
  try {
    const urlObj = new URL(currentUrl);
    // If not production domain (e.g. localhost, 127.0.0.1, or local IP), use production domain
    // so Phantom accepts the universal link and matches app_url
    if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1" || !currentUrl.startsWith("https://")) {
      return `https://streetsync-ss.com${urlObj.pathname}`;
    }
    return currentUrl.split("#")[0].split("?")[0];
  } catch {
    return "https://streetsync-ss.com/";
  }
}

/**
 * Opens current dApp page directly in Phantom's in-app Web3 browser.
 * In Phantom's in-app browser, window.phantom.solana is injected natively,
 * completely eliminating redirect bounces, lost state, and timeout issues.
 */
export function openInPhantomBrowser(targetUrl?: string): void {
  if (typeof window === "undefined") return;
  const current = targetUrl || window.location.href;
  let resolvedUrl = current;
  try {
    const urlObj = new URL(current);
    if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
      resolvedUrl = `https://streetsync-ss.com${urlObj.pathname}${urlObj.search}`;
    }
  } catch {}

  const appOrigin = "https://streetsync-ss.com";
  const browseUrl = `https://phantom.com/ul/browse/${encodeURIComponent(resolvedUrl)}?ref=${encodeURIComponent(appOrigin)}`;
  window.location.href = browseUrl;
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
  const dappPubStr = bs58.encode(dappKeyPair.publicKey);
  const dappSecStr = bs58.encode(dappKeyPair.secretKey);

  try {
    sessionStorage.setItem("street_sync_temp_dapp_pubkey", dappPubStr);
    sessionStorage.setItem("street_sync_temp_dapp_seckey", dappSecStr);
    localStorage.setItem("street_sync_temp_dapp_pubkey", dappPubStr);
    localStorage.setItem("street_sync_temp_dapp_seckey", dappSecStr);
  } catch {}

  const currentUrl = customRedirectUrl || window.location.href;
  const baseRedirect = getMobileRedirectLink(currentUrl);

  // CRITICAL: Attach ephemeral handshake keys to redirect_link.
  // In-app browsers (e.g. Twitter, Instagram) launch Phantom, but on iOS/Android,
  // Phantom redirects back by opening the system default browser (e.g. Chrome or Safari).
  // Because Chrome's localStorage/sessionStorage is completely isolated from Twitter's in-app webview,
  // passing the ephemeral dapp keys via redirect_link guarantees that whichever browser receives the callback
  // can instantly and flawlessly derive the shared secret and decrypt the payload.
  let redirectLink = baseRedirect;
  try {
    const redirectUrlObj = new URL(baseRedirect);
    redirectUrlObj.searchParams.set("dapp_pub", dappPubStr);
    redirectUrlObj.searchParams.set("dapp_sec", dappSecStr);
    redirectUrlObj.searchParams.set("mw_type", walletType);
    redirectLink = redirectUrlObj.toString();
  } catch {
    const sep = baseRedirect.includes("?") ? "&" : "?";
    redirectLink = `${baseRedirect}${sep}dapp_pub=${encodeURIComponent(dappPubStr)}&dapp_sec=${encodeURIComponent(dappSecStr)}&mw_type=${encodeURIComponent(walletType)}`;
  }

  sessionStorage.setItem("phantom_mobile_return_url", currentUrl);
  try {
    localStorage.setItem("phantom_mobile_return_url", currentUrl);
  } catch {}
  sessionStorage.setItem("mobile_wallet_type", walletType);

  // Phantom strictly requires app_url to be HTTPS and its domain to match redirect_link
  const appUrl = (typeof window !== "undefined" && window.location.origin.startsWith("https://"))
    ? window.location.origin
    : "https://streetsync-ss.com";

  const params = new URLSearchParams({
    app_url: appUrl,
    dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
    redirect_link: redirectLink,
    cluster: "devnet",
  });

  // Immediately dismiss any open wallet selection modals to prevent lingering screens
  window.dispatchEvent(new CustomEvent("street_sync_close_all_modals"));

  const baseUrl =
    walletType === "solflare"
      ? "https://solflare.com/ul/v1/connect"
      : "https://phantom.com/ul/v1/connect";

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

  const dappPubKeyStr = session.dappPublicKey || bs58.encode(getOrCreateDappKeyPair().publicKey);
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
  try {
    sessionStorage.setItem("phantom_mobile_return_url", currentUrl);
    localStorage.setItem("phantom_mobile_return_url", currentUrl);
  } catch {}
  const redirectLink = getMobileRedirectLink(currentUrl);
  sessionStorage.setItem(PENDING_SIGN_KEY, bs58.encode(messageBytes));

  const params = new URLSearchParams({
    dapp_encryption_public_key: dappPubKeyStr,
    nonce: bs58.encode(nonce),
    redirect_link: redirectLink,
    payload: bs58.encode(encryptedPayload),
  });

  const walletType = session.walletType || "phantom";
  const baseUrl =
    walletType === "solflare"
      ? "https://solflare.com/ul/v1/signMessage"
      : "https://phantom.com/ul/v1/signMessage";

  window.location.href = `${baseUrl}?${params.toString()}`;
}

/**
 * Initiates a single transaction signing via Mobile deep link.
 * Directs user to Phantom/Solflare app to inspect, approve, and sign.
 */
export function initiatePhantomMobileSignTransaction(
  transactionBytes: Uint8Array,
  customRedirectUrl?: string
): void {
  if (typeof window === "undefined") return;

  const session = getStoredPhantomSession();
  if (!session) {
    throw new Error("Mobile wallet is not connected.");
  }

  const dappPubKeyStr = session.dappPublicKey || bs58.encode(getOrCreateDappKeyPair().publicKey);
  const sharedSecret = bs58.decode(session.sharedSecret);
  const nonce = nacl.randomBytes(24);

  const payload = {
    session: session.session,
    transaction: bs58.encode(transactionBytes),
  };

  const encryptedPayload = nacl.box.after(
    Buffer.from(JSON.stringify(payload)),
    nonce,
    sharedSecret
  );

  const currentUrl = customRedirectUrl || window.location.href;
  try {
    sessionStorage.setItem("phantom_mobile_return_url", currentUrl);
    localStorage.setItem("phantom_mobile_return_url", currentUrl);
  } catch {}
  const redirectLink = getMobileRedirectLink(currentUrl);

  const params = new URLSearchParams({
    dapp_encryption_public_key: dappPubKeyStr,
    nonce: bs58.encode(nonce),
    redirect_link: redirectLink,
    payload: bs58.encode(encryptedPayload),
  });

  const walletType = session.walletType || "phantom";
  const baseUrl =
    walletType === "solflare"
      ? "https://solflare.com/ul/v1/signTransaction"
      : "https://phantom.com/ul/v1/signTransaction";

  window.location.href = `${baseUrl}?${params.toString()}`;
}

/**
 * Initiates multiple transaction signing via Mobile deep link.
 */
export function initiatePhantomMobileSignAllTransactions(
  transactionsBytes: Uint8Array[],
  customRedirectUrl?: string
): void {
  if (typeof window === "undefined") return;

  const session = getStoredPhantomSession();
  if (!session) {
    throw new Error("Mobile wallet is not connected.");
  }

  const dappPubKeyStr = session.dappPublicKey || bs58.encode(getOrCreateDappKeyPair().publicKey);
  const sharedSecret = bs58.decode(session.sharedSecret);
  const nonce = nacl.randomBytes(24);

  const payload = {
    session: session.session,
    transactions: transactionsBytes.map((b) => bs58.encode(b)),
  };

  const encryptedPayload = nacl.box.after(
    Buffer.from(JSON.stringify(payload)),
    nonce,
    sharedSecret
  );

  const currentUrl = customRedirectUrl || window.location.href;
  try {
    sessionStorage.setItem("phantom_mobile_return_url", currentUrl);
    localStorage.setItem("phantom_mobile_return_url", currentUrl);
  } catch {}
  const redirectLink = getMobileRedirectLink(currentUrl);

  const params = new URLSearchParams({
    dapp_encryption_public_key: dappPubKeyStr,
    nonce: bs58.encode(nonce),
    redirect_link: redirectLink,
    payload: bs58.encode(encryptedPayload),
  });

  const walletType = session.walletType || "phantom";
  const baseUrl =
    walletType === "solflare"
      ? "https://solflare.com/ul/v1/signAllTransactions"
      : "https://phantom.com/ul/v1/signAllTransactions";

  window.location.href = `${baseUrl}?${params.toString()}`;
}

/**
 * Initiates signAndSendTransaction via Mobile deep link.
 */
export function initiatePhantomMobileSignAndSendTransaction(
  transactionBytes: Uint8Array,
  customRedirectUrl?: string,
  _sendOptions?: { skipPreflight?: boolean }
): void {
  // In Phantom v1 Universal Links, signAndSendTransaction is deprecated and throws "This method is not supported".
  // The official supported method is signTransaction.
  initiatePhantomMobileSignTransaction(transactionBytes, customRedirectUrl);
}

/**
 * Checks URL parameters on page load to see if Phantom/Solflare redirected back after an action.
 * Decrypts payload, sets session and walletName immediately so autoConnect works seamlessly,
 * dispatches appropriate events, and strips query parameters from URL.
 */
export interface MobileRedirectResult {
  handled: boolean;
  type?: "connect" | "signMessage" | "signTransaction" | "signAllTransactions" | "signature" | "error";
  publicKey?: string;
  signature?: string;
  transaction?: string;
  transactions?: string[];
  walletType?: "phantom" | "solflare";
  error?: string;
}

let lastProcessedResult: MobileRedirectResult | null = null;

export function getLastProcessedResult(): MobileRedirectResult | null {
  return lastProcessedResult;
}

export function clearLastProcessedResult() {
  lastProcessedResult = null;
}

export function processPhantomMobileRedirect(customUrlOrQuery?: string): MobileRedirectResult {
  if (typeof window === "undefined") return { handled: false };

  let urlParams: URLSearchParams;
  if (customUrlOrQuery) {
    try {
      if (customUrlOrQuery.includes("?")) {
        urlParams = new URLSearchParams(customUrlOrQuery.split("?")[1]);
      } else {
        urlParams = new URLSearchParams(customUrlOrQuery);
      }
    } catch {
      urlParams = new URLSearchParams(window.location.search);
    }
  } else {
    urlParams = new URLSearchParams(window.location.search);
  }

  const phantomPubKeyStr = urlParams.get("phantom_encryption_public_key");
  const nonceStr = urlParams.get("nonce");
  const dataStr = urlParams.get("data");
  const errorCode = urlParams.get("errorCode");
  const errorMessage = urlParams.get("errorMessage");

  if (!customUrlOrQuery && !phantomPubKeyStr && !nonceStr && !dataStr && !errorCode && !errorMessage) {
    if (lastProcessedResult) {
      const res = lastProcessedResult;
      lastProcessedResult = null;
      return res;
    }
  }

  // Clean URL parameters helper
  const cleanUrl = () => {
    if (customUrlOrQuery) return;
    try {
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete("phantom_encryption_public_key");
      cleanParams.delete("nonce");
      cleanParams.delete("data");
      cleanParams.delete("errorCode");
      cleanParams.delete("errorMessage");
      cleanParams.delete("dapp_pub");
      cleanParams.delete("dapp_sec");
      cleanParams.delete("mw_type");

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
    const errMsg = errorMessage || `Error ${errorCode}`;
    console.warn(`[MobileDeeplink] Mobile action rejected or failed (${errorCode}): ${errMsg}`);

    // If unauthorized (4100), decryption failure, or session expired/invalid (-32603),
    // the Phantom session is dead/stale. Purge it immediately so the user is never trapped in a bounce loop!
    const isSessionDead =
      String(errorCode) === "4100" ||
      String(errorCode) === "-32603" ||
      errMsg.toLowerCase().includes("unauthorized") ||
      errMsg.toLowerCase().includes("session") ||
      errMsg.toLowerCase().includes("decrypt");

    if (isSessionDead) {
      console.warn("[MobileDeeplink] Stale/unauthorized mobile session detected. Purging session.");
      disconnectPhantomMobileSession();
    }

    // Clear pending actions
    localStorage.removeItem("street_sync_pending_subscription");
    localStorage.removeItem("street_sync_pending_nft_buy");
    localStorage.removeItem("street_sync_last_signed_tx");

    window.dispatchEvent(
      new CustomEvent("phantom_mobile_error", {
        detail: { error: errMsg, code: errorCode, isSessionDead },
      })
    );

    return {
      handled: true,
      type: "error",
      error: errMsg,
    };
  }

  // Case 2: Connect or Sign response returned
  if (nonceStr && dataStr) {
    try {
      let dappKeyPair = getOrCreateDappKeyPair();
      let sharedSecret: Uint8Array;
      const returnedWalletType =
        (urlParams.get("mw_type") as "phantom" | "solflare") ||
        (sessionStorage.getItem("mobile_wallet_type") as "phantom" | "solflare") ||
        "phantom";

      if (phantomPubKeyStr) {
        // Connect response contains wallet's encryption public key
        // 1. First priority: Check if ephemeral dapp keys were passed via URL parameters
        // (CRITICAL for cross-browser returns, e.g. when Twitter in-app browser delegates to Phantom,
        // and Phantom redirects to the phone's default browser like Chrome or Safari).
        const urlDappPub = urlParams.get("dapp_pub");
        const urlDappSec = urlParams.get("dapp_sec");

        if (urlDappPub && urlDappSec) {
          try {
            dappKeyPair = {
              publicKey: bs58.decode(urlDappPub),
              secretKey: bs58.decode(urlDappSec),
            };
          } catch (e) {
            console.warn("[MobileDeeplink] Error decoding URL dapp keys:", e);
          }
        } else {
          // 2. Second priority: Recover exact temporary dapp keys from storage
          try {
            const tempPub =
              sessionStorage.getItem("street_sync_temp_dapp_pubkey") ||
              localStorage.getItem("street_sync_temp_dapp_pubkey");
            const tempSec =
              sessionStorage.getItem("street_sync_temp_dapp_seckey") ||
              localStorage.getItem("street_sync_temp_dapp_seckey");
            if (tempPub && tempSec) {
              dappKeyPair = {
                publicKey: bs58.decode(tempPub),
                secretKey: bs58.decode(tempSec),
              };
            }
          } catch {}
        }

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
        if (existingSession.dappPublicKey && existingSession.dappSecretKey) {
          dappKeyPair = {
            publicKey: bs58.decode(existingSession.dappPublicKey),
            secretKey: bs58.decode(existingSession.dappSecretKey),
          };
        }
      }

      const nonce = bs58.decode(nonceStr);
      const encryptedData = bs58.decode(dataStr);

      const decrypted = nacl.box.open.after(encryptedData, nonce, sharedSecret);
      if (!decrypted) {
        cleanUrl();
        console.warn("[MobileDeeplink] Failed to decrypt response payload. Purging stale session.");
        disconnectPhantomMobileSession();
        return { handled: true, type: "error", error: "Failed to decrypt response payload. Stale session cleared." };
      }

      const payload = JSON.parse(Buffer.from(decrypted).toString("utf8"));
      cleanUrl();

      // 1. Connect Response
      if (payload.public_key && payload.session) {
        const walletType =
          returnedWalletType ||
          (sessionStorage.getItem("mobile_wallet_type") as "phantom" | "solflare") ||
          "phantom";

        const sessionData: PhantomMobileSession = {
          publicKey: payload.public_key,
          session: payload.session,
          sharedSecret: bs58.encode(sharedSecret),
          connectedAt: Date.now(),
          walletType,
          dappPublicKey: bs58.encode(dappKeyPair.publicKey),
          dappSecretKey: bs58.encode(dappKeyPair.secretKey),
        };

        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        const walletName = walletType === "solflare" ? "Solflare" : "Phantom";
        localStorage.setItem("walletName", JSON.stringify(walletName));

        try {
          sessionStorage.removeItem("street_sync_temp_dapp_pubkey");
          sessionStorage.removeItem("street_sync_temp_dapp_seckey");
        } catch {}

        window.dispatchEvent(new CustomEvent("street_sync_close_all_modals"));
        window.dispatchEvent(
          new CustomEvent("phantom_mobile_connected", { detail: sessionData })
        );

        const result: MobileRedirectResult = {
          handled: true,
          type: "connect",
          publicKey: payload.public_key,
          walletType,
        };
        lastProcessedResult = result;
        return result;
      }

      // 2. Sign Transaction Response
      if (payload.transaction) {
        localStorage.setItem("street_sync_last_signed_tx", payload.transaction);
        localStorage.setItem("street_sync_last_signed_tx_time", String(Date.now()));

        window.dispatchEvent(
          new CustomEvent("phantom_mobile_tx_signed", {
            detail: { transaction: payload.transaction },
          })
        );

        const result: MobileRedirectResult = {
          handled: true,
          type: "signTransaction",
          transaction: payload.transaction,
        };
        lastProcessedResult = result;
        return result;
      }

      // 3. Sign All Transactions Response
      if (payload.transactions && Array.isArray(payload.transactions)) {
        localStorage.setItem(
          "street_sync_last_signed_transactions",
          JSON.stringify(payload.transactions)
        );

        window.dispatchEvent(
          new CustomEvent("phantom_mobile_all_tx_signed", {
            detail: { transactions: payload.transactions },
          })
        );

        const result: MobileRedirectResult = {
          handled: true,
          type: "signAllTransactions",
          transactions: payload.transactions,
        };
        lastProcessedResult = result;
        return result;
      }

      // 4. Sign Message or SignAndSend Signature Response
      if (payload.signature) {
        localStorage.setItem("street_sync_last_tx_signature", payload.signature);
        localStorage.setItem("street_sync_last_tx_signature_time", String(Date.now()));

        window.dispatchEvent(
          new CustomEvent("phantom_mobile_signed", { detail: payload.signature })
        );
        window.dispatchEvent(
          new CustomEvent("phantom_mobile_tx_sent", {
            detail: { signature: payload.signature },
          })
        );

        const result: MobileRedirectResult = {
          handled: true,
          type: "signature",
          signature: payload.signature,
        };
        lastProcessedResult = result;
        return result;
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
  (window as any).__handlePhantomDeepLink = (deepLinkUrl: string) => {
    return processPhantomMobileRedirect(deepLinkUrl);
  };
  (window as any).processPhantomMobileRedirect = processPhantomMobileRedirect;
  try {
    processPhantomMobileRedirect();
  } catch (e) {
    // Non-fatal
  }
}

