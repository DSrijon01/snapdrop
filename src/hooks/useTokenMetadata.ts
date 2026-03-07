import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { umi } from '../utils/umi';
import { fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata } from '@solana/spl-token';

export type TokenMetadata = {
    name: string;
    symbol: string;
    uri: string;
    image?: string;
    description?: string;
    isToken2022?: boolean;
};

export const useTokenMetadata = (mint: PublicKey | null) => {
    const { connection } = useConnection();
    const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!mint) return;

        const fetch = async () => {
             setLoading(true);
             try {
                 // First check if it's a Token-2022 mint
                 const mintAccountInfo = await connection.getAccountInfo(mint);
                 const isToken2022 = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID);

                 if (isToken2022) {
                     // Try to fetch Token-2022 native metadata
                     try {
                         const metadataOnChain = await getTokenMetadata(connection, mint);
                         if (metadataOnChain) {
                             let jsonMetadata: any = {};
                             if (metadataOnChain.uri) {
                                 try {
                                    const res = await globalThis.fetch(metadataOnChain.uri);
                                    jsonMetadata = await res.json();
                                 } catch(e) { console.warn("Failed to fetch JSON uri", e); }
                             }
                             setMetadata({
                                 name: metadataOnChain.name,
                                 symbol: metadataOnChain.symbol,
                                 uri: metadataOnChain.uri,
                                 image: jsonMetadata.image,
                                 description: jsonMetadata.description,
                                 isToken2022: true
                             });
                             return; // Exit early if successful
                         }
                     } catch (e) {
                         console.warn("Failed fetching Token-2022 metadata natively:", e);
                     }
                 }

                 // Fallback to standard Metaplex PDA
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
    }, [mint, connection]);

    return { metadata, loading };
};
