import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { umi } from '../utils/umi';
import { fetchMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata, unpackMint, getExtensionTypes } from '@solana/spl-token';

import { 
    resolveNftImageUrl, 
    fetchJsonWithGatewayFailover, 
    getFallbackImage, 
    sanitizeSolanaString 
} from '@/utils/nftImageResolver';

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

export async function getTokenMetadataWithCache(
    mint: PublicKey,
    connection: any,
    umi: any
): Promise<TokenMetadata> {
    const mintStr = mint.toBase58();

    // 1. If cached, return
    if (metadataCache[mintStr]) {
        return metadataCache[mintStr];
    }

    // 2. If already loading, wait for it
    if (loadingPromises[mintStr]) {
        const cachedResult = await loadingPromises[mintStr];
        if (cachedResult) return cachedResult;
    }

    // 3. Perform fetch
    const fetchPromise = (async () => {
        try {
            // First check if it's a Token-2022 mint
            const mintAccountInfo = await connection.getAccountInfo(mint);
            if (!mintAccountInfo) return null;
            
            const isToken2022 = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
            let extensions: number[] = [];

            if (isToken2022) {
                try {
                    const unpacked = unpackMint(mint, mintAccountInfo, TOKEN_2022_PROGRAM_ID);
                    extensions = getExtensionTypes(unpacked.tlvData).map(e => Number(e));
                } catch (extErr) {
                    console.warn("Failed parsing extensions locally:", extErr);
                }
            }

            if (isToken2022) {
                try {
                    const metadataOnChain = await getTokenMetadata(connection, mint);
                    if (metadataOnChain) {
                        const name = sanitizeSolanaString(metadataOnChain.name) || "Token-2022";
                        const symbol = sanitizeSolanaString(metadataOnChain.symbol) || "T22";
                        let jsonMetadata: any = {};
                        if (metadataOnChain.uri) {
                            jsonMetadata = (await fetchJsonWithGatewayFailover(metadataOnChain.uri)) || {};
                        }
                        const image = resolveNftImageUrl(jsonMetadata.image, name);
                        const result: TokenMetadata = {
                            name,
                            symbol,
                            uri: metadataOnChain.uri || "",
                            image,
                            description: jsonMetadata.description || "",
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
            const name = sanitizeSolanaString(account.name) || "Solana Collectible";
            const symbol = sanitizeSolanaString(account.symbol) || "NFT";
            
            // Fetch JSON from URI with multi-gateway failover
            let jsonMetadata: any = {};
            if (account.uri) {
                jsonMetadata = (await fetchJsonWithGatewayFailover(account.uri)) || {};
            }

            const image = resolveNftImageUrl(jsonMetadata.image, name);

            const result: TokenMetadata = {
                name,
                symbol,
                uri: account.uri || "",
                image,
                description: jsonMetadata.description || "",
                isToken2022: !!isToken2022, 
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
    delete loadingPromises[mintStr];

    if (result) {
        return result;
    }

    // Cache a procedural fallback token metadata object to prevent broken images
    const fallbackResult: TokenMetadata = {
        name: "Solana Collectible",
        symbol: "NFT",
        uri: "",
        image: getFallbackImage("Solana Collectible", mintStr),
        description: "On-Chain NFT metadata.",
        isToken2022: false,
        extensions: []
    };
    metadataCache[mintStr] = fallbackResult;
    return fallbackResult;
}

export const useTokenMetadata = (mint: PublicKey | null) => {
    const { connection } = useConnection();
    const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!mint) return;

        const mintStr = mint.toBase58();

        if (metadataCache[mintStr]) {
            setMetadata(metadataCache[mintStr]);
            return;
        }

        const fetch = async () => {
             setLoading(true);
             try {
                 const res = await getTokenMetadataWithCache(mint, connection, umi);
                 setMetadata(res);
             } catch (e) {
                 console.error("Failed to resolve metadata in hook:", e);
             } finally {
                 setLoading(false);
             }
        };

        fetch();
    }, [mint, connection]);

    return { metadata, loading };
};

