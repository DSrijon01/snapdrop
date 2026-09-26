/**
 * Street Sync - Solana NFT Image & Gateway Resolver
 * 
 * Solves recurring broken image issues in Solana ecosystems:
 * 1. Resolves raw ipfs:// and ar:// protocols to reliable HTTP gateways.
 * 2. Provides multi-gateway failover for Arweave and Irys (arweave.net, ar-io.net, gateway.irys.xyz).
 * 3. Strips null bytes (\0) from on-chain Metaplex string buffers.
 * 4. Provides a procedural Cyberpunk SVG data-URI fallback when devnet storage nodes
 *    purge test assets (404), completely eliminating broken image icons and cheap placeholders.
 */

const IPFS_GATEWAYS = [
  "https://copper-given-dolphin-912.mypinata.cloud/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cf-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
];

const ARWEAVE_GATEWAYS = [
  "https://gateway.irys.xyz/",
  "https://devnet.irys.xyz/",
  "https://arweave.net/",
  "https://ar-io.net/",
  "https://permaweb.eu/",
];

/**
 * Clean Metaplex on-chain strings that may have trailing null bytes (\0) or whitespace
 */
export function sanitizeSolanaString(str?: string | null): string {
  if (!str) return "";
  return str.replace(/\0/g, "").trim();
}

/**
 * Generates a self-contained, high-fidelity Cyberpunk SVG Data URI.
 * Renders instantly without any network request, ensuring cards NEVER display
 * a native broken image icon or generic pink placeholder.
 */
export function getFallbackImage(title: string = "Digital Collectible", seed: string = ""): string {
  const safeTitle = sanitizeSolanaString(title) || "Solana Collectible";
  const strSeed = seed || safeTitle;

  // Generate deterministic gradient hues from the title/seed
  let hash = 0;
  for (let i = 0; i < strSeed.length; i++) {
    hash = strSeed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 45) % 360;

  // SVG dimensions: 400x400
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a14"/>
      <stop offset="50%" stop-color="#121324"/>
      <stop offset="100%" stop-color="#07080d"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue1}, 90%, 55%)"/>
      <stop offset="100%" stop-color="hsl(${hue2}, 95%, 45%)"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue1}, 80%, 50%)" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
    <pattern id="cyberGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="400" height="400" fill="url(#bgGrad)"/>
  <rect width="400" height="400" fill="url(#cyberGrid)"/>
  <circle cx="200" cy="180" r="130" fill="url(#glowGrad)"/>

  <!-- Geometric Hologram Icon -->
  <g transform="translate(200, 170)">
    <!-- Outer Octagon -->
    <polygon points="0,-65 46,-46 65,0 46,46 0,65 -46,46 -65,0 -46,-46" 
      fill="none" stroke="url(#accentGrad)" stroke-width="2.5" opacity="0.8"/>
    <!-- Inner Diamond -->
    <polygon points="0,-42 42,0 0,42 -42,0" 
      fill="none" stroke="url(#accentGrad)" stroke-width="1.5" opacity="0.5"/>
    <!-- Core Gem -->
    <polygon points="0,-22 22,0 0,22 -22,0" 
      fill="url(#accentGrad)" opacity="0.9"/>
  </g>

  <!-- Top Badge -->
  <rect x="135" y="40" width="130" height="22" rx="11" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <text x="200" y="55" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="900" letter-spacing="2" fill="#38bdf8" text-anchor="middle">STREET SYNC</text>

  <!-- Title Text -->
  <text x="200" y="280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" letter-spacing="0.5" fill="#ffffff" text-anchor="middle">${escapeXml(safeTitle)}</text>

  <!-- Subtitle Tag -->
  <text x="200" y="304" font-family="'Courier New', monospace" font-size="10" font-weight="600" letter-spacing="1.5" fill="rgba(255,255,255,0.45)" text-anchor="middle">ON-CHAIN METADATA</text>

  <!-- Bottom Accent Bar -->
  <rect x="60" y="345" width="280" height="2" rx="1" fill="url(#accentGrad)" opacity="0.6"/>
</svg>
`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Normalizes any IPFS, Arweave, or HTTP URI into a working, browser-accessible URL.
 */
export function resolveNftImageUrl(rawUri?: string | null, fallbackTitle: string = "NFT"): string {
  const uri = sanitizeSolanaString(rawUri);

  if (!uri || uri === "" || uri === "undefined" || uri === "null") {
    return getFallbackImage(fallbackTitle);
  }

  // 1. IPFS Protocol (ipfs://...)
  if (uri.startsWith("ipfs://")) {
    const hash = uri.replace("ipfs://", "").replace(/^ipfs\//, "");
    return `${IPFS_GATEWAYS[0]}${hash}`;
  }

  // 2. Arweave Protocol (ar://...)
  if (uri.startsWith("ar://")) {
    const txId = uri.replace("ar://", "");
    return `${ARWEAVE_GATEWAYS[0]}${txId}`;
  }

  // 3. Arweave / Irys HTTP Gateway URLs
  if (uri.includes("arweave.net/") || uri.includes("irys.xyz/")) {
    // Both gateways are valid; return cleaned uri
    return uri;
  }

  // 4. IPFS Gateway URLs with custom gateways that may be dead
  if (uri.includes("/ipfs/")) {
    const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+.*)/);
    if (match && match[1]) {
      // Re-route to fast Cloudflare/DWeb gateway
      return `${IPFS_GATEWAYS[0]}${match[1]}`;
    }
  }

  return uri;
}

/**
 * Fetches JSON metadata with automatic multi-gateway failover.
 * If gateway.irys.xyz is 404, tries devnet.irys.xyz, arweave.net, etc.
 */
export async function fetchJsonWithGatewayFailover(rawUri: string, timeoutMs: number = 4000): Promise<any> {
  const cleanedUri = sanitizeSolanaString(rawUri);
  if (!cleanedUri) return null;

  // Extract ID if it's Arweave / Irys
  const arweaveMatch = cleanedUri.match(/(?:arweave\.net|irys\.xyz)\/([a-zA-Z0-9_-]{40,})/);
  const txId = arweaveMatch ? arweaveMatch[1] : null;

  // Extract IPFS hash if applicable
  const ipfsMatch = cleanedUri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  const ipfsHash = ipfsMatch ? ipfsMatch[1] : null;

  const candidateUrls: string[] = [cleanedUri];

  if (txId) {
    for (const gw of ARWEAVE_GATEWAYS) {
      const candidate = `${gw}${txId}`;
      if (!candidateUrls.includes(candidate)) candidateUrls.push(candidate);
    }
  } else if (ipfsHash) {
    for (const gw of IPFS_GATEWAYS) {
      const candidate = `${gw}${ipfsHash}`;
      if (!candidateUrls.includes(candidate)) candidateUrls.push(candidate);
    }
  }

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(id);

      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          // not valid JSON, try next
        }
      }
    } catch {
      // Gateway failed or timed out, proceed to next candidate
    }
  }

  return null;
}

/**
 * Handles image tag errors gracefully, replacing broken URLs with procedural badges
 * and preventing infinite error loops.
 */
export function handleImageFallback(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackTitle: string = "Collectible"
) {
  const imgElement = event.currentTarget;
  // Detach onError to prevent infinite loop
  imgElement.onerror = null;
  imgElement.src = getFallbackImage(fallbackTitle);
}
