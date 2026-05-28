import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { umi } from '../utils/umi';
import { fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata, unpackMint, getExtensionTypes } from '@solana/spl-token';

export type TokenMetadata = {
    name: string;
    symbol: string;
    uri: string;
    image?: string;
    description?: string;
    isToken2022?: boolean;
    extensions?: number[];
};

// Global in-memory cache for token metadata to prevent redundant RPC and HTTP requests
export const metadataCache: Record<string, TokenMetadata> = {};
const loadingPromises: Record<string, Promise<TokenMetadata | null> | undefined> = {};

export const useTokenMetadata = (mint: PublicKey | null) => {
    const { connection } = useConnection();
    const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!mint) return;

        const mintStr = mint.toBase58();

        // 1. If it's already in the cache, return it immediately
        if (metadataCache[mintStr]) {
            setMetadata(metadataCache[mintStr]);
            return;
        }

        const fetch = async () => {
             setLoading(true);
             try {
                 // 2. If there is already a fetch in progress for this mint, wait for it
                 if (loadingPromises[mintStr]) {
                     const cachedData = await loadingPromises[mintStr];
                     if (cachedData) {
                         setMetadata(cachedData);
                     }
                     return;
                 }

                 // Create a promise for this fetch operation to share with other instances
                 const fetchPromise = (async () => {
                     try {
                         // First check if it's a Token-2022 mint
                         const mintAccountInfo = await connection.getAccountInfo(mint);
                         const isToken2022 = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID);
                         let extensions: number[] = [];

                         if (isToken2022 && mintAccountInfo) {
                             try {
                                 const unpacked = unpackMint(mint, mintAccountInfo, TOKEN_2022_PROGRAM_ID);
                                 extensions = getExtensionTypes(unpacked.tlvData).map(e => Number(e));
                             } catch (extErr) {
                                 console.warn("Failed parsing extensions locally:", extErr);
                             }
                         }

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
                                     const result = {
                                         name: metadataOnChain.name,
                                         symbol: metadataOnChain.symbol,
                                         uri: metadataOnChain.uri,
                                         image: jsonMetadata.image,
                                         description: jsonMetadata.description,
                                         isToken2022: true,
                                         extensions: extensions
                                     };
                                     metadataCache[mintStr] = result;
                                     return result;
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

                         const result = {
                             name: account.name,
                             symbol: account.symbol,
                             uri: account.uri,
                             image: jsonMetadata.image,
                             description: jsonMetadata.description,
                             isToken2022: isToken2022, 
                             extensions: extensions
                         };
                         metadataCache[mintStr] = result;
                         return result;
                     } catch (e) {
                         console.error("Failed to fetch metadata for mint:", mint.toBase58(), e);
                         return null;
                     }
                 })();

                 loadingPromises[mintStr] = fetchPromise;
                 const result = await fetchPromise;
                 if (result) {
                     setMetadata(result);
                 }
                 // Clean up the promise from active loading
                 delete loadingPromises[mintStr];
             } catch (e) {
                 console.error("Failed in hook fetch:", e);
             } finally {
                 setLoading(false);
             }
        };

        fetch();
    }, [mint, connection]);

    return { metadata, loading };
};
