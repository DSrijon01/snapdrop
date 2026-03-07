"use client";

import React, { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, Keypair, Connection } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    ExtensionType, 
    getTypeLen,
    getMintLen,
    createInitializeMintInstruction,
    createInitializeTransferFeeConfigInstruction,
    createInitializeNonTransferableMintInstruction,
    createInitializePermanentDelegateInstruction,
    createInitializeMintCloseAuthorityInstruction,
    createInitializeDefaultAccountStateInstruction,
    createInitializeMetadataPointerInstruction,
    createInitializeInterestBearingMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    createInitializeImmutableOwnerInstruction,
    createInitializeTransferHookInstruction,
    createInitializeGroupPointerInstruction,
    createInitializeGroupInstruction,
    createInitializeGroupMemberPointerInstruction,
    createInitializeMemberInstruction,
    createInitializePausableConfigInstruction,
    getAssociatedTokenAddressSync,
    TYPE_SIZE,
    LENGTH_SIZE
} from '@solana/spl-token';
import { createInitializeInstruction as createInitTokenMetadataInstruction, pack } from '@solana/spl-token-metadata';
import { umi } from '../utils/umi';
import { createGenericFile } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';

// Define the global wallet address
const GLOBAL_WALLET = new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");

type Token2022StudioProps = {
    onListNow: (tokenAccountInfo: any) => void;
};

export const Token2022Studio: React.FC<Token2022StudioProps> = ({ onListNow }) => {
    const { connection } = useConnection();
    const wallet = useWallet();

    // Core Tokenomics
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [description, setDescription] = useState('');
    const [decimals, setDecimals] = useState<number>(6);
    const [totalSupply, setTotalSupply] = useState<string>('1000000000');

    // UI state for Image
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Extension Toggles & Configs
    
    // Financial Extensions
    const [enableTransferFee, setEnableTransferFee] = useState(false);
    const [transferFeeBasisPoints, setTransferFeeBasisPoints] = useState<number>(50); // 0.5% default
    const [transferFeeMaxAmount, setTransferFeeMaxAmount] = useState<string>('1000');

    const [enableInterestBearing, setEnableInterestBearing] = useState(false);
    const [interestRate, setInterestRate] = useState<number>(5); // 5% default

    const [enableNonTransferable, setEnableNonTransferable] = useState(false);

    // Authority & Compliance Extensions
    const [enablePermanentDelegate, setEnablePermanentDelegate] = useState(false); // Hardcoded to Global Wallet later
    const [enableMintCloseAuthority, setEnableMintCloseAuthority] = useState(false); // Hardcoded to Global Wallet later

    const [enableDefaultAccountState, setEnableDefaultAccountState] = useState(false);
    const [defaultAccountState, setDefaultAccountState] = useState<'initialized' | 'frozen'>('initialized');

    // Metadata & Utility
    const [enableTokenMetadata, setEnableTokenMetadata] = useState(true); // Default true in modern standard
    const [enableMetadataPointer, setEnableMetadataPointer] = useState(true); // Default true when metadata is true

    const [enableMemoOnTransfer, setEnableMemoOnTransfer] = useState(false);

    // Advanced & Missing Extensions
    const [enablePausable, setEnablePausable] = useState(false); // Mint Ext
    const [enableTransferHook, setEnableTransferHook] = useState(false); // Mint Ext
    const [transferHookProgramId, setTransferHookProgramId] = useState(''); 

    const [enableImmutableOwner, setEnableImmutableOwner] = useState(false); // Account Ext
    const [enableCpiGuard, setEnableCpiGuard] = useState(false); // Account Ext

    // Token Groups
    const [enableTokenGroup, setEnableTokenGroup] = useState(false); // Mint Ext (Parent)
    const [enableTokenGroupMember, setEnableTokenGroupMember] = useState(false); // Mint Ext (Child)
    const [parentGroupId, setParentGroupId] = useState('');

    // Action State
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [createdToken, setCreatedToken] = useState<any | null>(null);

    // File Handlers
    const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    }, []);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleToggleNonTransferable = (enabled: boolean) => {
        setEnableNonTransferable(enabled);
        if (enabled) {
            // Rule 1: Soulbound cannot have transfer fees
            setEnableTransferFee(false);
        }
    };

    const handleToggleTokenMetadata = (enabled: boolean) => {
        setEnableTokenMetadata(enabled);
        if (enabled) {
            // Rule 2: Metadata requires Pointer
            setEnableMetadataPointer(true);
        }
    };

    const handleToggleTokenGroup = (enabled: boolean) => {
        setEnableTokenGroup(enabled);
        if (enabled) {
            setEnableTokenGroupMember(false); // A token shouldn't typically be both a generic group and member in this UI
        }
    };

    const handleToggleTokenGroupMember = (enabled: boolean) => {
        setEnableTokenGroupMember(enabled);
        if (enabled) {
            setEnableTokenGroup(false);
        }
    };

    const handleGenerateToken = async () => {
        if (!wallet.publicKey || !wallet.signTransaction) {
            alert('Please connect your wallet first.');
            return;
        }
        if (!name || !symbol || !imageFile || !totalSupply || !decimals) {
            alert('Please fill out all core fields and upload an image.');
            return;
        }

        try {
            setLoading(true);
            setCreatedToken(null);
            
            // Note: Umi setup for IPFS/Arweave upload using standard methods
            umi.use(walletAdapterIdentity(wallet))
               .use(irysUploader({ address: 'https://devnet.irys.xyz' }));

            // 1. Upload Image
            setStatus('Uploading image to Arweave...');
            const imageBuffer = await imageFile.arrayBuffer();
            const genericFile = createGenericFile(new Uint8Array(imageBuffer), imageFile.name, {
                contentType: imageFile.type,
            });
            const [imageUri] = await umi.uploader.upload([genericFile]);

            // 2. Upload Metadata JSON
            setStatus('Uploading metadata...');
            let metadataUri = '';
            // Only upload metadata JSON if we actually intend to use Metadata extensions
            if (enableTokenMetadata) {
                metadataUri = await umi.uploader.uploadJson({
                    name,
                    symbol,
                    description,
                    image: imageUri,
                });
            }

            setStatus('Building Token-2022 Transaction...');
            
            const mintKeypair = Keypair.generate();
            const mint = mintKeypair.publicKey;

            // Define which extensions are active (Mint Extensions primarily for space calculation)
            const activeExtensions: ExtensionType[] = [];
            
            if (enableTransferFee) activeExtensions.push(ExtensionType.TransferFeeConfig);
            if (enableNonTransferable) activeExtensions.push(ExtensionType.NonTransferable);
            if (enableInterestBearing) activeExtensions.push(ExtensionType.InterestBearingConfig);
            if (enablePermanentDelegate) activeExtensions.push(ExtensionType.PermanentDelegate);
            if (enableMintCloseAuthority || enablePausable) activeExtensions.push(ExtensionType.MintCloseAuthority); // Pausable requires CloseAuth usually or similar space
            if (enableDefaultAccountState) activeExtensions.push(ExtensionType.DefaultAccountState);
            if (enableMetadataPointer) activeExtensions.push(ExtensionType.MetadataPointer);
            
            // New active extensions for getMintLen calculation
            if (enablePausable) activeExtensions.push(ExtensionType.PausableConfig);
            if (enableTransferHook) activeExtensions.push(ExtensionType.TransferHook);
            if (enableTokenGroup) {
                activeExtensions.push(ExtensionType.GroupPointer);
                activeExtensions.push(ExtensionType.TokenGroup);
            }
            if (enableTokenGroupMember) {
                activeExtensions.push(ExtensionType.GroupMemberPointer);
                activeExtensions.push(ExtensionType.TokenGroupMember);
            }

            // Note: ImmutableOwner, MemoTransfer, CpiGuard are ALL Account extensions. 
            // They do not increase the Mint account size. They increase the Token Account (ATA) size.
            // But standard user ATA creation might ignore these unless we use a custom initialization for the ATA itself.
            // For now, these are logged but standard ATA might fail if strictly required on the Mint level.
            // Actual ATA extensions:
            const accountExtensions: ExtensionType[] = [];
            if (enableImmutableOwner) accountExtensions.push(ExtensionType.ImmutableOwner);
            if (enableMemoOnTransfer) accountExtensions.push(ExtensionType.MemoTransfer);
            if (enableCpiGuard) accountExtensions.push(ExtensionType.CpiGuard);

            // Initialize exact initial space needed for Mint account + declared extensions
            const mintLen = getMintLen(activeExtensions);

            // TokenMetadata is NOT part of getMintLen(). 
            // We have to add its space exclusively for lamports, so realloc succeeds later.
            const metaData = {
                updateAuthority: wallet.publicKey,
                mint: mint,
                name: name,
                symbol: symbol,
                uri: metadataUri,
                additionalMetadata: [] // Can add custom fields here later
            };

            let finalAccountSize = mintLen;

            if (enableTokenMetadata) {
                // TokenMetadata Extension takes dynamic space based on data length
                const exactMetadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
                finalAccountSize += exactMetadataSpace + 4; // Add slight buffer for realloc safety
            }

            // Fund rent for the FINAL size, but strictly create account with INITIAL size
            const lamports = await connection.getMinimumBalanceForRentExemption(finalAccountSize);

            const transaction = new Transaction();

            // 1. Allocate Space
            transaction.add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mint,
                    space: mintLen, // MUST be exact initial size for InitializeMint
                    lamports, // MUST be final size for TokenMetadata realloc
                    programId: TOKEN_2022_PROGRAM_ID,
                })
            );

            // 2. Initialize Extensions in Strict Order BEFORE InitializeMint
            // Strict order usually demanded: generally all configs must be present before mint init.

            // Metadata Pointer
            if (enableMetadataPointer) {
                // Point metadata to this exact mint address
                transaction.add(
                    createInitializeMetadataPointerInstruction(
                        mint,
                        wallet.publicKey, // update authority
                        mint, // metadata address (itself)
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Transfer Fees
            if (enableTransferFee && !enableNonTransferable) {
                transaction.add(
                    createInitializeTransferFeeConfigInstruction(
                        mint,
                        wallet.publicKey, // transfer fee config authority
                        GLOBAL_WALLET, // withdraw withheld authority (Can remain Global Wallet as it doesn't need to sign here)
                        transferFeeBasisPoints,
                        BigInt(transferFeeMaxAmount) * BigInt(Math.pow(10, decimals)),
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Permanent Delegate
            if (enablePermanentDelegate) {
                transaction.add(
                    createInitializePermanentDelegateInstruction(
                        mint,
                        wallet.publicKey, // Permanent delegate authority
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Mint Close Authority
            if (enableMintCloseAuthority) {
                transaction.add(
                    createInitializeMintCloseAuthorityInstruction(
                        mint,
                        wallet.publicKey, // Close authority
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Default Account State
            if (enableDefaultAccountState) {
                const stateEnum = defaultAccountState === 'frozen' ? 2 : 1; // Uninitialized=0, Init=1, Frozen=2
                transaction.add(
                    createInitializeDefaultAccountStateInstruction(
                        mint,
                        stateEnum,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Interest Bearing
            if (enableInterestBearing) {
                transaction.add(
                    createInitializeInterestBearingMintInstruction(
                        mint,
                        wallet.publicKey, // rate authority
                        interestRate,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Non Transferable (Soulbound)
            if (enableNonTransferable) {
                transaction.add(
                    createInitializeNonTransferableMintInstruction(
                        mint,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Pausable
            if (enablePausable) {
                transaction.add(
                    createInitializePausableConfigInstruction(
                        mint,
                        wallet.publicKey, // pausable config authority
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Transfer Hook
            if (enableTransferHook && transferHookProgramId) {
                try {
                    const hookProgram = new PublicKey(transferHookProgramId);
                    transaction.add(
                        createInitializeTransferHookInstruction(
                            mint,
                            wallet.publicKey, // Hook authority
                            hookProgram,
                            TOKEN_2022_PROGRAM_ID
                        )
                    );
                } catch (e) {
                    console.warn("Invalid Transfer Hook Program ID provided.");
                }
            }

            // Token Group
            if (enableTokenGroup) {
                transaction.add(
                    createInitializeGroupPointerInstruction(
                        mint,
                        wallet.publicKey, // Update authority
                        mint, // Group data lives on this mint
                        TOKEN_2022_PROGRAM_ID
                    )
                );
                // The actual group initialization, max_size etc normally defaults
                transaction.add(
                    createInitializeGroupInstruction({
                        programId: TOKEN_2022_PROGRAM_ID,
                        mint: mint,
                        group: mint,
                        mintAuthority: wallet.publicKey, // Authority that can mint into this group
                        updateAuthority: wallet.publicKey,
                        maxSize: BigInt(0), // 0 = undefined/uncapped max size in standard usage
                    })
                );
            }

            // Token Group Member
            if (enableTokenGroupMember && parentGroupId) {
                try {
                    const parentGroup = new PublicKey(parentGroupId);
                    transaction.add(
                        createInitializeGroupMemberPointerInstruction(
                            mint,
                            wallet.publicKey, // update authority
                            mint,
                            TOKEN_2022_PROGRAM_ID
                        )
                    );
                    transaction.add(
                        createInitializeMemberInstruction({
                            programId: TOKEN_2022_PROGRAM_ID,
                            member: mint,
                            memberMint: mint,
                            group: parentGroup,
                            groupUpdateAuthority: wallet.publicKey, // Requires parent group update authority to sign (must match actual logic of group)
                            memberMintAuthority: wallet.publicKey,
                        })
                    );
                } catch (e) {
                    console.warn("Invalid Parent Group ID provided.");
                }
            }

            // 3. Initialize Mint Account
            transaction.add(
                createInitializeMintInstruction(
                    mint,
                    decimals,
                    wallet.publicKey, // mint authority
                    enableMintCloseAuthority ? wallet.publicKey : null, // freeze authority (can be same if needed)
                    TOKEN_2022_PROGRAM_ID
                )
            );

            // 4. Post-Mint Data: Token Metadata Extension 
            if (enableTokenMetadata) {
                transaction.add(
                    createInitTokenMetadataInstruction(
                        {
                            programId: TOKEN_2022_PROGRAM_ID,
                            metadata: mint,
                            updateAuthority: wallet.publicKey,
                            mint: mint,
                            mintAuthority: wallet.publicKey,
                            name: name,
                            symbol: symbol,
                            uri: metadataUri,
                        }
                    )
                );
            }

            // 5. Create ATA for Global Wallet and Mint Initial Supply
            const globalWalletAta = getAssociatedTokenAddressSync(
                mint,
                GLOBAL_WALLET,
                true, // allowOwnerOffCurve
                TOKEN_2022_PROGRAM_ID
            );

            transaction.add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey, // payer
                    globalWalletAta,  // ata
                    GLOBAL_WALLET,    // owner
                    mint,             // mint
                    TOKEN_2022_PROGRAM_ID
                )
            );

            transaction.add(
                createMintToInstruction(
                    mint,
                    globalWalletAta,
                    wallet.publicKey, // mint authority providing the execution
                    BigInt(totalSupply) * BigInt(Math.pow(10, decimals)),
                    [], // multisig
                    TOKEN_2022_PROGRAM_ID
                )
            );

            // 6. Init Account-level Extensions on the ATA
            // Strictly speaking, these must be initialized BEFORE the ATA is fully set or via native createAccount+InitAccount.
            // When using `createAssociatedTokenAccountInstruction`, it usually forces a standard initialized state
            // that bypasses custom account extension injections unless initialized manually.
            // However, `createInitializeImmutableOwnerInstruction` is historically built into ATA logic inherently
            // for standard SPL tokens, but explicitly enforcing it for Token-2022 can require native account building.
            // For MemoTransfer and CpiGuard, we use explicit instructions against the created ATA.
            
            // Note: Currently @solana/spl-token dictates we use enableRequiredMemoTransfersInstruction etc 
            // AFTER the account is created.
            // To simplify in the builder for now, we will note them as required post-creation configuration steps
            // which would invoke toggle-like instructions: `createEnableRequiredMemoTransfersInstruction`, `createEnableCpiGuardInstruction`.
            
            setStatus('Simulating transaction...');
            
            // Set fee payer and recent blockhash for simulation
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.feePayer = wallet.publicKey;
            
            // Partial sign with mint keypair for accurate simulation
            transaction.partialSign(mintKeypair);

            try {
                const simulation = await connection.simulateTransaction(transaction);
                if (simulation.value.err) {
                    console.error("Simulation failed:", simulation.value.err);
                    console.error("Simulation logs:", simulation.value.logs);
                    throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}. See console for exact program logs.`);
                }
            } catch (simError: any) {
                console.warn("Simulation check error (might be network):", simError);
                // Proceed to send nonetheless, or throw based on preference
                if (simError.message.includes('Simulation failed:')) {
                    throw simError; 
                }
            }

            setStatus('Sending Token-2022 Creation Transaction...');
            
            const signature = await wallet.sendTransaction(transaction, connection, {
                signers: [mintKeypair]
            });
            
            // Wait for confirmation
            await connection.confirmTransaction({
                signature,
                ...(await connection.getLatestBlockhash()),
            });

            console.log("Token-2022 Created via Admin Dashboard:", signature);
            console.log("Mint address:", mint.toBase58());
            
            setStatus('Token creation successful!');
            setCreatedToken({
                mint: mint,
                amount: BigInt(totalSupply) * BigInt(Math.pow(10, decimals)),
                decimals: decimals,
                programId: TOKEN_2022_PROGRAM_ID
            });
            
        } catch (error: any) {
            console.error('Launch full error details:', error);
            setStatus(`Error: ${error.message}`);
            alert(`Failed to launch token: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm text-foreground">
            {/* Header Section */}
            <div className="p-6 border-b border-border">
                <h3 className="text-2xl font-bold font-display uppercase italic text-primary">Token-2022 Generator Studio</h3>
                <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
                    Create advanced Token-2022 assets with powerful on-chain extensions. Enable specific rules, limits, and behavior natively embedded in your SPL token.
                </p>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Form Sections */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Section 1: Core Tokenomics */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <h4 className="text-lg font-bold uppercase border-b-2 border-primary pb-1 inline-block">1. Core Tokenomics</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Token Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Protocol Token"
                                    className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Symbol</label>
                                <input 
                                    type="text" 
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                    placeholder="e.g. PRTCL"
                                    className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your project..."
                                className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors min-h-[80px] text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Decimals</label>
                                <input 
                                    type="number" 
                                    value={decimals}
                                    onChange={(e) => setDecimals(Number(e.target.value))}
                                    className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Total Supply</label>
                                <input 
                                    type="number" 
                                    value={totalSupply}
                                    onChange={(e) => setTotalSupply(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors text-sm"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Token Logo</label>
                            <div 
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleImageDrop}
                                className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-muted/20"
                            >
                                {imagePreview ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover shadow-md border border-border" />
                                        <label className="cursor-pointer text-xs text-primary hover:underline font-bold">
                                            Change Image
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                        </label>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center justify-center h-20 gap-2">
                                        <span className="text-xl">📷</span>
                                        <span className="text-xs font-bold">Click or drag & drop</span>
                                        <span className="text-[10px] text-muted-foreground">SVG, PNG, JPG (max. 5MB)</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Financial Extensions */}
                    <div className="space-y-4 bg-muted/10 p-5 border border-border rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <h4 className="text-lg font-bold uppercase text-blue-500">2. Financial Extensions</h4>
                        </div>
                        
                        {/* Transfer Fees */}
                        <div className="border border-border rounded-lg p-4 bg-background">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h5 className="font-bold text-sm">Transfer Fees</h5>
                                    <p className="text-xs text-muted-foreground">Collect a dynamic fee on every transfer.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={enableTransferFee} onChange={(e) => setEnableTransferFee(e.target.value === 'on' || e.target.checked)} disabled={enableNonTransferable} />
                                    <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableTransferFee ? 'bg-primary' : ''} ${enableNonTransferable ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                </label>
                            </div>
                            
                            {enableTransferFee && (
                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border mt-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Fee Basis Points (e.g. 50 = 0.5%)</label>
                                        <input type="number" value={transferFeeBasisPoints} onChange={e => setTransferFeeBasisPoints(Number(e.target.value))} className="w-full bg-muted border-none rounded p-2 text-xs" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Max Fee Amount</label>
                                        <input type="text" value={transferFeeMaxAmount} onChange={e => setTransferFeeMaxAmount(e.target.value)} className="w-full bg-muted border-none rounded p-2 text-xs" />
                                    </div>
                                </div>
                            )}
                            {enableNonTransferable && (
                                <p className="text-xs text-orange-500 mt-2 italic flex items-center gap-1">
                                    <span className="text-sm">⚠️</span> Disabled because Non-Transferable is active.
                                </p>
                            )}
                        </div>

                        {/* Interest-Bearing */}
                        <div className="border border-border rounded-lg p-4 bg-background">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h5 className="font-bold text-sm">Interest-Bearing</h5>
                                    <p className="text-xs text-muted-foreground">Token amount accrues interest continuously on-chain.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={enableInterestBearing} onChange={(e) => setEnableInterestBearing(e.target.checked)} />
                                    <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableInterestBearing ? 'bg-primary' : ''}`}></div>
                                </label>
                            </div>
                            {enableInterestBearing && (
                                <div className="mt-4 space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Interest Rate (%)</label>
                                    <input type="number" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} className="w-full bg-muted border-none rounded p-2 text-xs" />
                                </div>
                            )}
                        </div>

                        {/* Non-Transferable */}
                        <div className="border border-border rounded-lg p-4 bg-background">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h5 className="font-bold text-sm">Non-Transferable <span className="text-xs font-normal px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded ml-2">Soulbound</span></h5>
                                    <p className="text-xs text-muted-foreground">Tokens cannot be transferred after minting.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={enableNonTransferable} onChange={(e) => handleToggleNonTransferable(e.target.checked)} />
                                    <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableNonTransferable ? 'bg-orange-500' : ''}`}></div>
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* Section 3: Authority & Compliance */}
                    <div className="space-y-4 bg-muted/10 p-5 border border-border rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <h4 className="text-lg font-bold uppercase text-purple-500">3. Authority & Compliance</h4>
                        </div>
                        
                        {/* Permanent Delegate */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h5 className="font-bold text-sm">Permanent Delegate</h5>
                                <p className="text-xs text-muted-foreground">Global Wallet gets absolute transfer/burn authority.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={enablePermanentDelegate} onChange={(e) => setEnablePermanentDelegate(e.target.checked)} />
                                <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enablePermanentDelegate ? 'bg-primary' : ''}`}></div>
                            </label>
                        </div>

                        {/* Mint Close Authority */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h5 className="font-bold text-sm">Mint Close Authority</h5>
                                <p className="text-xs text-muted-foreground">Allow Global Wallet to close this mint permanently.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={enableMintCloseAuthority} onChange={(e) => setEnableMintCloseAuthority(e.target.checked)} />
                                <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableMintCloseAuthority ? 'bg-primary' : ''}`}></div>
                            </label>
                        </div>

                        {/* Pausable */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h5 className="font-bold text-sm">Pausable</h5>
                                <p className="text-xs text-muted-foreground">Allow Global Wallet to pause and resume all token transfers.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={enablePausable} onChange={(e) => setEnablePausable(e.target.checked)} />
                                <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enablePausable ? 'bg-primary' : ''}`}></div>
                            </label>
                        </div>

                        {/* Default Account State */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h5 className="font-bold text-sm">Default Account State</h5>
                                    <p className="text-xs text-muted-foreground">Set new token accounts to frozen by default (requires unfreeze).</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={enableDefaultAccountState} onChange={(e) => setEnableDefaultAccountState(e.target.checked)} />
                                    <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableDefaultAccountState ? 'bg-primary' : ''}`}></div>
                                </label>
                            </div>
                            {enableDefaultAccountState && (
                                <select 
                                    value={defaultAccountState} 
                                    onChange={(e) => setDefaultAccountState(e.target.value as any)}
                                    className="w-full bg-background border border-border rounded p-2 text-xs outline-none"
                                >
                                    <option value="initialized">Initialized (Normal)</option>
                                    <option value="frozen">Frozen (Requires unlock)</option>
                                </select>
                            )}
                        </div>

                    </div>

                    {/* Section 4: Advanced Composability & Hook Rules */}
                    <div className="space-y-4 bg-muted/10 p-5 border border-border rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <h4 className="text-lg font-bold uppercase text-orange-500">4. Advanced Interoperability</h4>
                        </div>

                        {/* Token Groups (Parent) */}
                        <div className="border border-border rounded-lg p-4 bg-background">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h5 className="font-bold text-sm">Token Group (Parent)</h5>
                                    <p className="text-xs text-muted-foreground">Make this token a parent collection for other associated tokens/NFTs.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={enableTokenGroup} onChange={(e) => handleToggleTokenGroup(e.target.checked)} />
                                    <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableTokenGroup ? 'bg-orange-500' : ''}`}></div>
                                </label>
                            </div>
                        </div>

                        {/* Token Group Member (Child) */}
                        <div className="border border-border rounded-lg p-4 bg-background">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h5 className="font-bold text-sm">Token Group Member (Child)</h5>
                                    <p className="text-xs text-muted-foreground">Assign this token to an existing Token Group program.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={enableTokenGroupMember} onChange={(e) => handleToggleTokenGroupMember(e.target.checked)} />
                                    <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableTokenGroupMember ? 'bg-orange-500' : ''}`}></div>
                                </label>
                            </div>
                            {enableTokenGroupMember && (
                                <div className="mt-4 space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Parent Group Address</label>
                                    <input type="text" value={parentGroupId} onChange={e => setParentGroupId(e.target.value)} placeholder="Enter Parent Token Group Mint Address" className="w-full bg-muted border-none rounded p-2 text-xs outline-primary" />
                                </div>
                            )}
                        </div>

                        {/* Transfer Hook */}
                        <div className="border border-border rounded-lg p-4 bg-background">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h5 className="font-bold text-sm">Transfer Hook</h5>
                                    <p className="text-xs text-muted-foreground">Enforce external program execution (e.g., royalties) on every transfer.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={enableTransferHook} onChange={(e) => setEnableTransferHook(e.target.checked)} />
                                    <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableTransferHook ? 'bg-orange-500' : ''}`}></div>
                                </label>
                            </div>
                            {enableTransferHook && (
                                <div className="mt-4 space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Transfer Hook Program ID</label>
                                    <input type="text" value={transferHookProgramId} onChange={e => setTransferHookProgramId(e.target.value)} placeholder="Enter Hook Program Address" className="w-full bg-muted border-none rounded p-2 text-xs outline-primary" />
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Section 5: Metadata & Utility */}
                    <div className="space-y-4 bg-muted/10 p-5 border border-border rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <h4 className="text-lg font-bold uppercase text-green-500">5. Metadata & Utility</h4>
                        </div>

                        {/* Token Metadata */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h5 className="font-bold text-sm">Token Metadata <span className="text-[10px] ml-2 px-2 py-0.5 bg-green-500/10 text-green-500 rounded uppercase">Recommended</span></h5>
                                <p className="text-xs text-muted-foreground">Store token metadata directly in the mint account (Token-2022 Native).</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={enableTokenMetadata} onChange={(e) => handleToggleTokenMetadata(e.target.checked)} />
                                <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableTokenMetadata ? 'bg-primary' : ''}`}></div>
                            </label>
                        </div>
                        
                        {/* Metadata Pointer */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h5 className="font-bold text-sm">Metadata Pointer</h5>
                                <p className="text-xs text-muted-foreground">Points token clients to where metadata lives (Required if Metadata Enabled).</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={enableMetadataPointer} onChange={(e) => setEnableMetadataPointer(e.target.checked)} disabled={enableTokenMetadata} />
                                <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableMetadataPointer ? 'bg-primary' : ''} ${enableTokenMetadata ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                            </label>
                            {enableTokenMetadata && (
                                <span className="absolute right-16 text-[10px] text-green-500 px-2 py-1 bg-green-500/10 rounded">Auto-Enabled</span>
                            )}
                        </div>

                        {/* Immutable Owner */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h5 className="font-bold text-sm">Immutable Owner (ATA)</h5>
                                <p className="text-xs text-muted-foreground">Prevents associated token accounts from reassigning ownership.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={enableImmutableOwner} onChange={(e) => setEnableImmutableOwner(e.target.checked)} />
                                <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableImmutableOwner ? 'bg-primary' : ''}`}></div>
                            </label>
                        </div>

                        {/* CPI Guard */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h5 className="font-bold text-sm">CPI Guard (ATA)</h5>
                                <p className="text-xs text-muted-foreground">Locks token account from unauthorized Cross-Program Invocations.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={enableCpiGuard} onChange={(e) => setEnableCpiGuard(e.target.checked)} />
                                <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableCpiGuard ? 'bg-primary' : ''}`}></div>
                            </label>
                        </div>

                        {/* Memo Required */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h5 className="font-bold text-sm">Memo Required (ATA)</h5>
                                <p className="text-xs text-muted-foreground">Every incoming transfer must include a memo instruction.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={enableMemoOnTransfer} onChange={(e) => setEnableMemoOnTransfer(e.target.checked)} />
                                <div className={`w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${enableMemoOnTransfer ? 'bg-primary' : ''}`}></div>
                            </label>
                        </div>

                    </div>
                </div>

                {/* Right Column: Summary & Build Action */}
                <div className="lg:col-span-4 self-start sticky top-6">
                    <div className="bg-background border border-border rounded-xl p-5 space-y-5">
                        <h4 className="text-xl font-bold uppercase border-b border-border pb-2">Launch Overview</h4>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Program ID:</span>
                                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">Token-2022</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Name/Symbol:</span>
                                <span className="font-bold">{name || '---'} ({symbol || '---'})</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Supply:</span>
                                <span>{totalSupply ? Number(totalSupply).toLocaleString() : '---'}</span>
                            </div>
                            
                            <div className="pt-3 border-t border-border">
                                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Active Extensions:</p>
                                <div className="flex flex-wrap gap-2">
                                    {enableTransferFee && <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20">Transfer Fee</span>}
                                    {enableInterestBearing && <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20">Interest Bearing</span>}
                                    {enableNonTransferable && <span className="text-[10px] px-2 py-1 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20">Non-Transferable</span>}
                                    {enablePermanentDelegate && <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-500 rounded border border-purple-500/20">Perm Delegate</span>}
                                    {enableMintCloseAuthority && <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-500 rounded border border-purple-500/20">Close Auth</span>}
                                    {enablePausable && <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-500 rounded border border-purple-500/20">Pausable</span>}
                                    {enableDefaultAccountState && <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-500 rounded border border-purple-500/20">Default State</span>}
                                    
                                    {enableTokenGroup && <span className="text-[10px] px-2 py-1 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20">Token Group Parent</span>}
                                    {enableTokenGroupMember && <span className="text-[10px] px-2 py-1 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20">Token Group Child</span>}
                                    {enableTransferHook && <span className="text-[10px] px-2 py-1 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20">Transfer Hook</span>}

                                    {enableTokenMetadata && <span className="text-[10px] px-2 py-1 bg-green-500/10 text-green-500 rounded border border-green-500/20">Metadata</span>}
                                    {enableMetadataPointer && <span className="text-[10px] px-2 py-1 bg-green-500/10 text-green-500 rounded border border-green-500/20">Meta Pointer</span>}
                                    
                                    {enableImmutableOwner && <span className="text-[10px] px-2 py-1 bg-green-500/10 text-green-500 rounded border border-green-500/20">Immutable Owner</span>}
                                    {enableCpiGuard && <span className="text-[10px] px-2 py-1 bg-green-500/10 text-green-500 rounded border border-green-500/20">CPI Guard</span>}
                                    {enableMemoOnTransfer && <span className="text-[10px] px-2 py-1 bg-green-500/10 text-green-500 rounded border border-green-500/20">Memo Required</span>}
                                    
                                    {!enableTransferFee && !enableInterestBearing && !enableNonTransferable && !enablePermanentDelegate && !enableMintCloseAuthority && !enableDefaultAccountState && !enableTokenMetadata && !enableMetadataPointer && !enableMemoOnTransfer && !enablePausable && !enableTokenGroup && !enableTokenGroupMember && !enableTransferHook && !enableImmutableOwner && !enableCpiGuard && (
                                        <span className="text-xs text-muted-foreground italic">None selected. Standard behavior.</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerateToken}
                            disabled={loading || enableTokenMetadata === false} // Optional safety guard if needed, adjust as logic requires
                            className={`w-full py-4 mt-6 rounded-xl font-bold uppercase tracking-wider text-[15px] transition-all group relative overflow-hidden ${
                                loading ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5'
                            }`}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                            <span className="relative z-10 flexItemsCenter justifyCenter gap-2">
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        {status || 'Building...'}
                                    </>
                                ) : (
                                    'Generate Token-2022'
                                )}
                            </span>
                        </button>

                         {createdToken && (
                             <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center space-y-3 mt-4 animate-in fade-in slide-in-from-bottom-2">
                                 <p className="text-green-500 text-sm font-bold">Successfully created {name}!!</p>
                                 <button 
                                     onClick={() => onListNow(createdToken)}
                                     className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors uppercase w-full text-sm shadow-md shadow-green-500/30"
                                 >
                                     List Now
                                 </button>
                             </div>
                        )}
                        {!loading && status && !createdToken && (
                            <div className="text-xs text-center text-muted-foreground mt-2 pb-2 break-words">
                                Status: {status}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
