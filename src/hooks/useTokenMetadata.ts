import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { umi } from '../utils/umi';
import { fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';

export type TokenMetadata = {
    name: string;
    symbol: string;
    uri: string;
    image?: string;
    description?: string;
    isToken2022?: boolean;
};

export const useTokenMetadata = (mint: PublicKey | null) => {
    const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!mint) return;

        const fetch = async () => {
             setLoading(true);
             try {
                 const mintPubkey = publicKey(mint.toBase58());
                 const metadataPda = findMetadataPda(umi, { mint: mintPubkey });
                 
                 const account = await fetchMetadata(umi, metadataPda);
                 
                 // Fetch JSON from URI
                 let jsonMetadata: any = {};
                 if (account.uri) {
                     try {
                        const res = await globalThis.fetch(account.uri);
                        jsonMetadata = await res.json();
                     } catch(e) { console.warn("Failed to fetch JSON uri", e); }
                 }

                 setMetadata({
                     name: account.name,
                     symbol: account.symbol,
                     uri: account.uri,
                     image: jsonMetadata.image,
                     description: jsonMetadata.description,
                     isToken2022: account.header.owner.toString() === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", 
                 });

             } catch (e) {
                 console.error("Failed to fetch metadata for mint:", mint.toBase58(), e);
                 setMetadata(null);
             } finally {
                 setLoading(false);
             }
        };

        fetch();
    }, [mint]);

    return { metadata, loading };
};
