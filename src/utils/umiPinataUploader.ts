import { GenericFile, lamports, Umi, UmiPlugin, UploaderInterface } from "@metaplex-foundation/umi";

/**
 * Creates an UploaderInterface that uploads directly to Pinata IPFS.
 * 
 * Benefits:
 * - Compatible with Next.js static exports (output: 'export' for GitHub Pages).
 * - Files are permanently pinned to IPFS and never 404/purge.
 * - Direct drop-in replacement for irysUploader in TokenGenerator, Token2022Studio, and NFTStudio.
 */
export function createPinataUploader(): UploaderInterface {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "copper-given-dolphin-912.mypinata.cloud";

  return {
    async upload(files: GenericFile[]): Promise<string[]> {
      if (!jwt) {
        throw new Error("Missing NEXT_PUBLIC_PINATA_JWT environment variable");
      }

      const uris: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.contentType || "image/png" });
        formData.append("file", blob, file.uniqueName);
        formData.append(
          "pinataMetadata",
          JSON.stringify({ name: file.uniqueName || "nft-asset" })
        );
        formData.append(
          "pinataOptions",
          JSON.stringify({ cidVersion: 1 })
        );

        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Pinata file upload failed (${res.status}): ${errText}`);
        }

        const data = await res.json();
        if (!data.IpfsHash) {
          throw new Error("No IpfsHash returned from Pinata upload");
        }
        uris.push(`https://${gateway}/ipfs/${data.IpfsHash}`);
      }

      return uris;
    },

    async uploadJson<T>(json: T): Promise<string> {
      if (!jwt) {
        throw new Error("Missing NEXT_PUBLIC_PINATA_JWT environment variable");
      }

      const metadataName = (json as any)?.name ? `${(json as any).name}-metadata.json` : "metadata.json";

      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          pinataContent: json,
          pinataMetadata: {
            name: metadataName,
          },
          pinataOptions: {
            cidVersion: 1,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Pinata JSON upload failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      if (!data.IpfsHash) {
        throw new Error("No IpfsHash returned from Pinata JSON upload");
      }
      return `https://${gateway}/ipfs/${data.IpfsHash}`;
    },

    async getUploadPrice(): Promise<any> {
      // Storage is prepaid via Pinata subscription; no on-chain lamports required for uploading.
      return lamports(0);
    },
  };
}

/**
 * Metaplex Umi Plugin for Pinata IPFS.
 * Usage:
 *   umi.use(pinataUploader())
 */
export function pinataUploader(): UmiPlugin {
  return {
    install(umi: Umi) {
      umi.uploader = createPinataUploader();
    },
  };
}
