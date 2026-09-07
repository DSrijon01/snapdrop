import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { HELIUS_DEVNET_RPC } from './solanaRpc';

export const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || HELIUS_DEVNET_RPC)
    .use(mplTokenMetadata());

