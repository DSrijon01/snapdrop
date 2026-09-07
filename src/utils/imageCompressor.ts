/**
 * Automatically compresses an image file to stay under the 100 KiB free threshold
 * for Irys/Arweave on Solana Devnet.
 * 
 * Files under 100 KiB are 100% free on Irys Devnet and completely bypass the
 * requirement for on-chain funding transactions, eliminating "400 Confirmed tx not found" errors.
 */
export async function compressImageForDevnet(
    file: File, 
    maxSizeBytes: number = 92 * 1024
): Promise<File> {
    // If the file is already small enough, no compression needed
    if (file.size <= maxSizeBytes) {
        return file;
    }

    if (typeof window === "undefined") {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 800;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return resolve(file);
                }

                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.85;
                const tryExport = (q: number) => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                return resolve(file);
                            }
                            if (blob.size <= maxSizeBytes || q <= 0.4) {
                                const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                                const compressedFile = new File([blob], newName, {
                                    type: "image/webp",
                                    lastModified: Date.now(),
                                });
                                console.log(
                                    `[NFT Studio] Compressed '${file.name}' (${(file.size / 1024).toFixed(1)} KB) -> '${newName}' (${(compressedFile.size / 1024).toFixed(1)} KB) to stay within Irys free tier.`
                                );
                                resolve(compressedFile);
                            } else {
                                tryExport(Math.max(0.35, q - 0.15));
                            }
                        },
                        "image/webp",
                        q
                    );
                };

                tryExport(quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
