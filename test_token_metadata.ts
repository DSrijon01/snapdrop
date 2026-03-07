import { Keypair } from '@solana/web3.js';
import { pack } from '@solana/spl-token-metadata';

const mint = Keypair.generate().publicKey;
const wallet = Keypair.generate().publicKey;

const metaDataWithoutAuth = {
    mint: mint,
    name: "Test",
    symbol: "TST",
    uri: "http://example.com",
    additionalMetadata: []
};

const metaDataWithAuth = {
    updateAuthority: wallet,
    mint: mint,
    name: "Test",
    symbol: "TST",
    uri: "http://example.com",
    additionalMetadata: []
};

try {
    console.log("Without Auth Length:", pack(metaDataWithoutAuth as any).length);
} catch (e) {
    console.log("Without Auth failed:", e.message);
}

try {
    console.log("With Auth Length:", pack(metaDataWithAuth).length);
} catch (e) {
    console.log("With Auth failed:", e.message);
}
