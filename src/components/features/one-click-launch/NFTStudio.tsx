import { FC, useState, useMemo, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { generateSigner, percentAmount, some, none, publicKey as umiPublicKey, sol, createGenericFile, transactionBuilder } from "@metaplex-foundation/umi";
import { createNft, mplTokenMetadata, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { create, mplCandyMachine, addConfigLines } from "@metaplex-foundation/mpl-candy-machine";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { CarouselItem } from '@/app/snbl/_components/StackedNFTGallery';

interface NFTAsset {
    id: string;
    file: File;
    preview: string;
    name: string;
}

export const NFTStudio: FC = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [activeTab, setActiveTab] = useState<'candymachine' | 'direct'>('candymachine');
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [cmCollectionName, setCmCollectionName] = useState("Street Sync Genesis");
    const [cmSymbol, setCmSymbol] = useState("SSG");
    const [cmPrice, setCmPrice] = useState("0.1");
    const [cmIsPublic, setCmIsPublic] = useState(true);

    const [directRoyalties, setDirectRoyalties] = useState("5");

    const [assets, setAssets] = useState<NFTAsset[]>([]);
    
    // Cover Image State for Candy Machine
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const umi = useMemo(() => {
        const u = createUmi(connection.rpcEndpoint)
            .use(mplTokenMetadata())
            .use(mplCandyMachine())
            .use(irysUploader({ address: 'https://devnet.irys.xyz' }));
            
        if (wallet.wallet?.adapter) {
            u.use(walletAdapterIdentity(wallet.wallet.adapter));
        }
        return u;
    }, [connection.rpcEndpoint, wallet.wallet, wallet.publicKey, wallet.connected]);

    const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    }, [assets]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        addFiles(files);
    };

    const addFiles = (files: File[]) => {
        const newAssets = files.filter(f => f.type.startsWith('image/')).map((file, i) => ({
            id: Math.random().toString(),
            file,
            preview: URL.createObjectURL(file),
            name: `Asset #${assets.length + i + 1}`
        }));
        setAssets(prev => [...prev, ...newAssets]);
    };

    const updateAssetName = (id: string, newName: string) => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, name: newName } : a));
    };

    const removeAsset = (id: string) => {
        setAssets(prev => prev.filter(a => a.id !== id));
    };

    const handleLaunchCandyMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.connected) return setStatus("Connect wallet first!");
        if (assets.length === 0) return setStatus("Please add at least one image asset for the box items.");
        if (!coverImage) return setStatus("Please provide a Collection Cover Image.");
        
        setIsLoading(true);
        setStatus("1/5: Uploading Cover and Assets to Arweave...");
        try {
            // Upload Cover and all inner assets
            const coverBuffer = await coverImage.arrayBuffer();
            const coverGeneric = createGenericFile(new Uint8Array(coverBuffer), coverImage.name, { contentType: coverImage.type });
            
            const genericFiles = await Promise.all(assets.map(async (a) => {
                const buffer = await a.file.arrayBuffer();
                return createGenericFile(new Uint8Array(buffer), a.file.name, { contentType: a.file.type });
            }));
            
            const allUris = await umi.uploader.upload([coverGeneric, ...genericFiles]);
            const coverUri = allUris[0];
            const imageUris = allUris.slice(1);

            setStatus("2/5: Uploading Metadata JSONs...");
            const collectionJsonUri = await umi.uploader.uploadJson({
                name: cmCollectionName,
                symbol: cmSymbol,
                image: coverUri
            });

            const jsonUris = await Promise.all(assets.map((a, i) => umi.uploader.uploadJson({
                name: a.name,
                symbol: cmSymbol,
                image: imageUris[i],
            })));

            setStatus("3/5: Initializing Base Collection NFT...");
            const collectionMint = generateSigner(umi);
            await createNft(umi, {
                mint: collectionMint,
                name: cmCollectionName,
                symbol: cmSymbol,
                uri: collectionJsonUri,
                sellerFeeBasisPoints: percentAmount(0),
                isCollection: true,
                collectionDetails: {
                    __kind: 'V1',
                    size: 0,
                },
                updateAuthority: umi.identity.publicKey,
                tokenOwner: umi.identity.publicKey,
            }).sendAndConfirm(umi, { confirm: { commitment: "finalized" } });

            // Introduce a short delay to allow the RPC nodes to index the newly created collection NFT metadata
            await new Promise(resolve => setTimeout(resolve, 3000));

            setStatus("4/5: Deploying Candy Machine V3 Account...");
            const candyMachine = generateSigner(umi);
            
            const createCmBuilder = await create(umi, {
                candyMachine,
                collectionMint: collectionMint.publicKey,
                collectionUpdateAuthority: umi.identity,
                tokenStandard: TokenStandard.NonFungible,
                sellerFeeBasisPoints: percentAmount(0),
                itemsAvailable: assets.length,
                creators: [{ address: umi.identity.publicKey, verified: true, percentageShare: 100 }],
                configLineSettings: some({
                    prefixName: "",
                    nameLength: 32,
                    prefixUri: "",
                    uriLength: 200,
                    isSequential: false,
                }),
                guards: {
                    solPayment: cmIsPublic ? some({
                        lamports: sol(parseFloat(cmPrice)),
                        destination: umi.identity.publicKey,
                    } as any) : none(),
                }
            });

            await transactionBuilder()
                .add(setComputeUnitLimit(umi, { units: 800_000 }))
                .add(createCmBuilder)
                .sendAndConfirm(umi, { confirm: { commitment: "finalized" } });

            setStatus("5/5: Adding Config Lines to Candy Machine...");
            await transactionBuilder()
                .add(setComputeUnitLimit(umi, { units: 800_000 }))
                .add(addConfigLines(umi, {
                    candyMachine: candyMachine.publicKey,
                    index: 0,
                    configLines: jsonUris.map((uri, i) => ({ name: assets[i].name, uri })),
                }))
                .sendAndConfirm(umi, { confirm: { commitment: "finalized" } });
            
            // Wire it to the Gallery using Arweave URI
            const newGalleryCard: CarouselItem = {
                id: candyMachine.publicKey.toString(),
                type: "candymachine",
                title: cmCollectionName,
                subtitle: "Blind Mint",
                images: [coverUri], // Uses the uploaded cover icon
                price: parseFloat(cmPrice),
                totalMinted: 0,
                maxSupply: assets.length,
                candyMachineId: candyMachine.publicKey.toString()
            };
            
            const existing = JSON.parse(localStorage.getItem("street_sync_nft_gallery") || "[]");
            localStorage.setItem("street_sync_nft_gallery", JSON.stringify([newGalleryCard, ...existing]));
            window.dispatchEvent(new Event("gallery_updated"));

            setStatus(`✅ Success! Candy Machine Created & Ready for Gallery.`);
            setAssets([]); // Clear
            setCoverImage(null);
            setCoverPreview(null);
        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDirectMint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.connected) return setStatus("Connect wallet first!");
        if (assets.length === 0) return setStatus("Please add at least one image asset.");
        
        setIsLoading(true);
        setStatus(`1/3: Uploading ${assets.length} Images to Arweave...`);
        try {
            const genericFiles = await Promise.all(assets.map(async (a) => {
                const buffer = await a.file.arrayBuffer();
                return createGenericFile(new Uint8Array(buffer), a.file.name, { contentType: a.file.type });
            }));
            const imageUris = await umi.uploader.upload(genericFiles);

            setStatus("2/3: Uploading Metadata JSONs...");
            const jsonUris = await Promise.all(assets.map((a, i) => umi.uploader.uploadJson({
                name: a.name,
                image: imageUris[i],
            })));

            setStatus("3/3: Minting Direct 1-of-1 NFTs to Treasury...");
            const mints: string[] = [];
            for (let i = 0; i < assets.length; i++) {
                const mint = generateSigner(umi);
                let builder = createNft(umi, {
                    mint,
                    name: assets[i].name,
                    uri: jsonUris[i],
                    sellerFeeBasisPoints: percentAmount(parseFloat(directRoyalties)),
                });
                builder = builder.prepend(setComputeUnitLimit(umi, { units: 800_000 }));
                await builder.sendAndConfirm(umi);
                mints.push(mint.publicKey.toString());
            }
            
            // Wire it to the Gallery using Arweave URIs!
            const newGalleryCard: CarouselItem = {
                id: `direct-${Date.now()}`,
                type: "direct",
                title: `${assets[0].name.split('#')[0].trim()} Series`,
                subtitle: "Direct Purchase",
                collection: "Treasury Vault",
                images: imageUris, // Use permanent Arweave URLs
                nfts: imageUris.map((uri, i) => ({
                    image: uri,
                    price: 1.0, // Base price mock
                    mintAddress: mints[i]
                }))
            };

            const existing = JSON.parse(localStorage.getItem("street_sync_nft_gallery") || "[]");
            localStorage.setItem("street_sync_nft_gallery", JSON.stringify([newGalleryCard, ...existing]));
            window.dispatchEvent(new Event("gallery_updated"));

            setStatus(`✅ Success! Minted ${assets.length} NFTs to Treasury. Available for Gallery.`);
            setAssets([]); // Clear
        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black font-display uppercase tracking-tight text-foreground">
                        NFT Studio <span className="text-primary text-sm tracking-widest align-top ml-2">Launcher</span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Drag, Drop & Launch directly to the Gallery.</p>
                </div>
                <div className="flex bg-background border border-border rounded-xl p-1">
                    <button 
                        onClick={() => { setActiveTab('candymachine'); setStatus(""); }}
                        className={`px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-all ${activeTab === 'candymachine' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                    >
                        Blind Mint (Candy Machine)
                    </button>
                    <button 
                        onClick={() => { setActiveTab('direct'); setStatus(""); }}
                        className={`px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-all ${activeTab === 'direct' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                    >
                        Visible Gallery (Direct Mint)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Drag & Drop Zone */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold font-display uppercase tracking-wider text-foreground">Assets</h3>
                        <span className="text-xs font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-full">{assets.length} Selected</span>
                    </div>

                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleImageDrop}
                        className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary/50 transition-colors relative bg-background/50 flex flex-col items-center justify-center min-h-[300px]"
                    >
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        </div>
                        <h4 className="text-lg font-bold text-foreground mb-1">Drag & Drop Images</h4>
                        <p className="text-sm text-muted-foreground mb-6">Support JPG, PNG, GIF up to 5MB</p>
                        
                        <label className="cursor-pointer bg-foreground hover:bg-foreground/90 text-background px-6 py-3 rounded-xl font-bold text-sm transition-colors uppercase tracking-widest shadow-xl">
                            Browse Files
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} />
                        </label>
                    </div>

                    {/* Asset List Preview */}
                    {assets.length > 0 && (
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {assets.map((asset) => (
                                <div key={asset.id} className="flex items-center gap-4 bg-background border border-border p-3 rounded-xl group">
                                    <img src={asset.preview} className="w-12 h-12 rounded-lg object-cover" />
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            value={asset.name}
                                            onChange={(e) => updateAssetName(asset.id, e.target.value)}
                                            className="w-full bg-transparent text-sm font-bold text-foreground focus:outline-none focus:border-b focus:border-primary border-b border-transparent pb-1"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => removeAsset(asset.id)}
                                        className="text-muted-foreground hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Side: Launch Configuration */}
                <div className="bg-background border border-border rounded-2xl p-6 h-fit sticky top-6">
                    <h3 className="text-lg font-bold font-display uppercase tracking-wider text-foreground mb-6 pb-4 border-b border-white/5">
                        {activeTab === 'candymachine' ? 'Candy Machine Config' : 'Direct Mint Config'}
                    </h3>

                    {activeTab === 'candymachine' ? (
                        <form onSubmit={handleLaunchCandyMachine} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">Collection Cover Image (Box Icon)</label>
                                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-card">
                                    {coverPreview ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <img src={coverPreview} className="w-20 h-20 rounded-xl object-cover shadow-lg" />
                                            <label className="cursor-pointer text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-full font-bold hover:bg-primary/30 transition-colors">
                                                Change Cover
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if(f) { setCoverImage(f); setCoverPreview(URL.createObjectURL(f)); }
                                                }} />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center py-2">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                            </div>
                                            <span className="text-sm font-bold mb-1 text-foreground">Upload Box Cover</span>
                                            <span className="text-[10px] text-muted-foreground">Will be displayed on the Main Gallery</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if(f) { setCoverImage(f); setCoverPreview(URL.createObjectURL(f)); }
                                            }} />
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">Collection Name</label>
                                <input required value={cmCollectionName} onChange={e => setCmCollectionName(e.target.value)} type="text" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">Symbol</label>
                                    <input required value={cmSymbol} onChange={e => setCmSymbol(e.target.value)} type="text" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">Mint Price (SOL)</label>
                                    <input required value={cmPrice} onChange={e => setCmPrice(e.target.value)} type="number" step="0.01" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none transition-colors" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2 pb-4 bg-card/50 p-4 rounded-xl border border-white/5">
                                <input type="checkbox" id="publicMint" checked={cmIsPublic} onChange={e => setCmIsPublic(e.target.checked)} className="w-4 h-4 text-primary bg-background border-border rounded accent-primary cursor-pointer" />
                                <div className="flex flex-col">
                                    <label htmlFor="publicMint" className="text-sm font-bold text-foreground cursor-pointer">Enable Public Mint</label>
                                    <span className="text-[10px] text-muted-foreground">Will apply Solana payment guards automatically.</span>
                                </div>
                            </div>
                            
                            {status && (
                                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm font-mono font-bold text-primary break-all">
                                    {status}
                                </div>
                            )}

                            <button disabled={isLoading || assets.length === 0} type="submit" className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed">
                                {isLoading ? "Deploying..." : "Deploy Collection"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleDirectMint} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">Royalties (%)</label>
                                <input required value={directRoyalties} onChange={e => setDirectRoyalties(e.target.value)} type="number" step="0.1" max="100" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none transition-colors" />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed bg-card/50 p-4 rounded-xl border border-white/5">
                                Your <span className="text-foreground font-bold">{assets.length}</span> selected assets will be minted directly as 1-of-1 NFTs to your connected treasury wallet. They will be immediately available to list on the Gallery.
                            </p>

                            {status && (
                                <div className="p-4 rounded-xl bg-foreground/10 border border-foreground/20 text-sm font-mono font-bold text-foreground break-all">
                                    {status}
                                </div>
                            )}

                            <button disabled={isLoading || assets.length === 0} type="submit" className="w-full py-4 bg-foreground hover:bg-foreground/90 text-background rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed">
                                {isLoading ? "Minting..." : "Mint Direct to Treasury"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
