/**
 * Checks if the user is running inside the standalone Android app (Solana Mobile Web Shell)
 * vs a standard mobile browser (Chrome, Safari, etc.).
 */
export const isStandaloneApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    ua.includes("Solana Mobile Web Shell") ||
    ua.includes("StreetSyncApp") ||
    ua.includes("WebShell") ||
    Boolean((window as any).StreetSyncNative) ||
    Boolean((window as any).__SOLANA_MOBILE_APP__)
  );
};
