import { Keypair, PublicKey } from '@solana/web3.js';
import { ExtensionType, getMintLen, TYPE_SIZE, LENGTH_SIZE } from '@solana/spl-token';
import { pack } from '@solana/spl-token-metadata';

const mint = Keypair.generate().publicKey;
const wallet = Keypair.generate().publicKey;

const activeExtensions = [ExtensionType.MetadataPointer];
const mintLen = getMintLen(activeExtensions);

const metaData = {
    updateAuthority: wallet,
    mint: mint,
    name: "Test",
    symbol: "TST",
    uri: "http://example.com",
    additionalMetadata: []
};

const metadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length; 
const totalAccountSize = mintLen + metadataSpace;

console.log("MintLen:", mintLen);
console.log("MetadataSpace:", metadataSpace);
console.log("Total:", totalAccountSize);
