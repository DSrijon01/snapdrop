"use client";

import React, { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { umi } from '../utils/umi';
import { createGenericFile, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { createAndMint, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

type TokenGeneratorProps = {
    onListNow: (tokenAccountInfo: any) => void;
};

export const TokenGenerator: React.FC<TokenGeneratorProps> = ({ onListNow }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [description, setDescription] = useState('');
    const [decimals, setDecimals] = useState<number>(6);
    const [totalSupply, setTotalSupply] = useState<string>('1000000000'); // Default 1B
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [createdToken, setCreatedToken] = useState<any | null>(null);

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

    const handleLaunch = async () => {
        if (!wallet.publicKey || !wallet.signTransaction) {
            alert('Please connect your wallet first.');
            return;
        }
        if (!name || !symbol || !imageFile || !totalSupply || !decimals) {
            alert('Please fill out all fields and upload an image.');
            return;
        }

        try {
            setLoading(true);
            setCreatedToken(null);
            
            // Setup Umi with current wallet and Irys for uploads
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
            const uri = await umi.uploader.uploadJson({
                name,
                symbol,
                description,
                image: imageUri,
            });

            // 3. Create Mint and Mint Tokens
            setStatus('Creating token and minting supply...');
            const mint = generateSigner(umi);
            const amount = BigInt(totalSupply) * BigInt(Math.pow(10, decimals));

            setStatus(`Minting ${totalSupply} tokens...`);
            const builder = createAndMint(umi, {
                mint,
                authority: umi.identity,
                name,
                symbol,
                uri,
                sellerFeeBasisPoints: percentAmount(0),
                decimals,
                amount,
                tokenOwner: umi.identity.publicKey,
                tokenStandard: TokenStandard.Fungible, // Fungible Token Standard
            });

            try {
                const { signature } = await builder.sendAndConfirm(umi, {
                    send: { skipPreflight: true },
                    confirm: { commitment: 'confirmed' }
                });
                console.log("Token Created Signature:", signature);
                setStatus('Token creation successful!');
                
                // Prepare mocked TokenAccountInfo specifically for list functionality
                const newTokenInfo = {
                    mint: new PublicKey(mint.publicKey.toString()),
                    amount: amount,
                    decimals: decimals,
                    programId: TOKEN_PROGRAM_ID
                };
                setCreatedToken(newTokenInfo);
            } catch (txError: any) {
                console.error("Transaction Error Details:", txError);
                throw new Error("Transaction failed during token minting: " + txError.message);
            }

        } catch (error: any) {
            console.error('Launch full error details:', error);
            setStatus(`Error: ${error.message}`);
            alert(`Failed to launch token: ${error.message}\nPlease check the browser console for details.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm max-w-2xl mx-auto space-y-6">
            <h3 className="text-2xl font-bold font-display uppercase italic">Create SPL Token</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase">Token Name</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. SnapCoin"
                        className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase">Symbol</label>
                    <input 
                        type="text" 
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        placeholder="e.g. SNAP"
                        className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase">Description</label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your project..."
                    className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors min-h-[100px]"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase">Decimals</label>
                    <input 
                        type="number" 
                        value={decimals}
                        onChange={(e) => setDecimals(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase">Total Supply</label>
                    <input 
                        type="number" 
                        value={totalSupply}
                        onChange={(e) => setTotalSupply(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase">Token Logo</label>
                <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleImageDrop}
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors relative"
                >
                    {imagePreview ? (
                        <div className="flex flex-col items-center gap-4">
                            <img src={imagePreview} alt="Preview" className="w-32 h-32 rounded-full object-cover shadow-lg" />
                            <label className="cursor-pointer text-sm text-primary hover:underline font-bold">
                                Change Image
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                            </label>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl mb-2">
                                📷
                            </div>
                            <span className="font-bold">Click or drag & drop</span>
                            <span className="text-sm text-muted-foreground">SVG, PNG, JPG or GIF (max. 5MB)</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                        </label>
                    )}
                </div>
            </div>

            <div className="pt-4 flex flex-col gap-4">
                <button 
                    onClick={handleLaunch}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider text-xl transition-all ${
                        loading ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-primary/25'
                    }`}
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            {status || 'Processing...'}
                        </div>
                    ) : (
                        'Launch Token to Devnet'
                    )}
                </button>

                {createdToken && (
                     <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center space-y-3">
                         <p className="text-green-500 font-bold">Successfully created {name} ({symbol})!</p>
                         <button 
                             onClick={() => onListNow(createdToken)}
                             className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors uppercase w-full max-w-xs mx-auto block"
                         >
                             List Now
                         </button>
                     </div>
                )}
            </div>
        </div>
    );
};
