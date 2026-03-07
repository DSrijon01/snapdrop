import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    ExtensionType, 
    getMintLen, 
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
    TYPE_SIZE,
    LENGTH_SIZE
} from '@solana/spl-token';
import { createInitializeInstruction as createInitTokenMetadataInstruction, pack } from '@solana/spl-token-metadata';

// Let's create a TX, no need to send it, just look at the order of instructions from standard examples online.
// Actually, let's just use connection.simulateTransaction with `skipPreflight: true` or something, but we need SOL.
// Instead, I will write a simple test for solana web3.js locally without sending.
