import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';

// Use a public RPC or the one from connection context if possible, but for singleton utility, hardcoded devnet is fine for now.
// Or better, creating a hook useUmi that uses the connection.
export const umi = createUmi('https://api.devnet.solana.com')
    .use(mplTokenMetadata());
