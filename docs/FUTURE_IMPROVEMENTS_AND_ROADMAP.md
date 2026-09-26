# Street Sync — Future Improvements & Technical Roadmap

This document outlines upcoming product stage pushes, planned architectural improvements, and pending technical issues to be resolved across the Street Sync ecosystem.

---

## 1. Pending Technical Issues & Immediate Optimizations

### 1.1 Exclusive Drops ("StackedNFTGallery") Empty State & Auto-Loading
* **Location**: [`src/app/snbl/_components/StackedNFTGallery.tsx`](../src/app/snbl/_components/StackedNFTGallery.tsx)
* **Symptom**: On live production (`streetsync-ss.com`), the "Exclusive Drops" carousel displays:
  > *"No active exclusive drops or collections found at the moment. Deployed candy machines or listed treasury NFTs will appear here."*
* **Root Cause**:
  - The gallery currently loads collections solely from browser `localStorage` (`street_sync_nft_gallery`) and on-chain Anchor gallery listings (`program.account.galleryListing.all()`).
  - When a visitor opens the app from a fresh browser or different computer, `localStorage` is empty. The component does not fall back to checking the active deployed Candy Machine ID set in environment variables (`NEXT_PUBLIC_CANDY_MACHINE_ID`).
* **Planned Solution**:
  1. If `localStorage` has no stored cards, automatically read `process.env.NEXT_PUBLIC_CANDY_MACHINE_ID`.
  2. Query the Candy Machine account and collection metadata on-chain via Metaplex Umi.
  3. Resolve the collection cover and item images through the dedicated Pinata IPFS gateway (`copper-given-dolphin-912.mypinata.cloud`).
  4. Render the active Candy Machine directly in the Exclusive Drops carousel with live minting capabilities.

---

### 1.2 NFT Gallery & Stream Loading Latency ("Lag Reduction")
* **Location**: [`src/components/features/nft-marketplace/NFTGallery.tsx`](../src/components/features/nft-marketplace/NFTGallery.tsx), [`src/utils/nftImageResolver.ts`](../src/utils/nftImageResolver.ts)
* **Symptom**: When navigating to **Buy and List NFTs**, the page experiences noticeable visual lag and delays before items display.
* **Root Cause**:
  1. **Dual RPC Concurrency**: `StackedNFTGallery` (Anchor RPC) and `NFTGallery` (Metaplex `fetchAllDigitalAssetByOwner`) execute simultaneously on mount, saturating browser HTTP connection limits (max 6 sockets per host).
  2. **Sequential Gateway Polling for Dead Assets**: Wallet NFTs minted weeks ago on the legacy Irys Devnet (`devnet.irys.xyz`) have been pruned. `fetchJsonWithGatewayFailover` tries 5 candidate gateways sequentially with a 4,000ms timeout per request, delaying completion by 8–15 seconds per dead asset.
* **Planned Solution**:
  1. **Gateway Fast-Fail & Parallel Racing**:
     - Reduce gateway timeout from `4000ms` down to `1200ms` for legacy devnet domains.
     - Use `Promise.any` or concurrent racing across candidate gateways rather than sequential `for...of` loops.
  2. **Negative Caching (`sessionStorage`)**:
     - Once a dead URI fails to resolve, cache its failure flag. On subsequent tab switches or re-renders, immediately return the procedural Cyberpunk SVG in **0ms** without making any network requests.
  3. **Pinata Direct Route**:
     - Any URI containing IPFS or Pinata hashes bypasses Arweave/Irys resolvers completely, loading directly from `https://copper-given-dolphin-912.mypinata.cloud/ipfs/` via high-speed global CDN edge caching (~150ms).
  4. **Deferred Rendering**:
     - Lazy-load or stagger the lower `NFTGallery` component so the upper `StackedNFTGallery` renders instantly without competing for network resources.

---

## 2. Stage Push: Avatar Identity System

### 2.1 Overview & Objectives
Transition from static/procedural bot avatars to an integrated **Web3 Avatar Identity System** across Street Sync (Sessions, Live Chat, Profiles, and Community Walls).

### 2.2 Key Features
1. **NFT PFP Verification**:
   - Allow users to select any verified NFT from "Your Stream" / Connected Wallet and set it as their active Street Sync Avatar.
   - Cryptographically verify NFT ownership on Solana Devnet/Mainnet before assigning the badge.
2. **Pinata Custom Avatar Minting**:
   - Enable users to upload custom profile images directly in the UI.
   - Images are automatically optimized and pinned to Pinata IPFS.
   - Users can choose to mint their profile avatar as a Soulbound (non-transferable) or standard SPL Token-2022 asset.
3. **Decentralized Reputation Badges**:
   - Display tier indicators around the avatar based on platform activity (e.g. SNBL staking tier, marketplace transaction volume, or community upvotes).
4. **Gradual Migration from DiceBear**:
   - Current ephemeral DiceBear bot avatars (`https://api.dicebear.com/7.x/bottts/svg`) will serve as the default zero-config fallback until the user links or mints an on-chain avatar.

---

## 3. Stage Push: Street Sync Arcade

### 3.1 Overview & Objectives
A gamified social and on-chain entertainment module where users interact, play mini-games, compete on leaderboards, and utilize Street Sync ecosystem tokens and NFTs.

### 3.2 Core Modules
1. **Arcade Game Hub**:
   - Integration of lightweight, responsive web arcade games (e.g., retro cyberpunk runners, prediction games, claw machines, reflex tests).
   - Clean, high-FPS canvas/WebGL rendering adhering to Street Sync dark-mode neon aesthetics.
2. **Tokenized Entry & Prize Pools**:
   - Support entry fees using Street Sync SPL tokens or devnet/mainnet SOL.
   - Smart-contract escrow pools to distribute winnings automatically to top daily/weekly leaderboard scores.
3. **NFT Utility & Perks**:
   - Holding exclusive drops (e.g., Street Sync Genesis, HKNGT, Samurai Jackson) grants in-game perks, bonus multipliers, or daily free arcade tokens.
4. **Real-Time State Synchronization**:
   - Optimistic local gameplay state with server/contract signature verification to prevent game state tampering.
   - Low-latency WebSockets or Helius transaction listeners for live multiplayer leaderboards and jackpot feeds.

---

## 4. Mainnet Readiness & Infrastructure Upgrades

| Area | Current State (Devnet) | Target State (Mainnet) |
| :--- | :--- | :--- |
| **Asset Indexing** | Client-side `fetchAllDigitalAssetByOwner` + on-chain PDA parsing | Helius DAS API (`getAssetsByOwner`) for instant sub-second wallet indexing |
| **Media Hosting** | Pinata IPFS (Dedicated Gateway) | Pinata IPFS + Cloudflare Edge CDN caching & WebP conversion |
| **RPC Resilience** | Helius Devnet with priority fees & retry wrapper | Dual-RPC failover (Helius Primary + QuickNode/Triton Fallback) |
| **Contract Audits** | Anchor devnet program (`launchpad`, `galleryListing`, `escrow`) | Production security review, account re-entrancy checks, and PDA closing audits |

---

*Document created: September 2026*  
*Status: Active Backlog & Technical Specification*
