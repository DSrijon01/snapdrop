import { GenericFile, lamports, Umi, UmiPlugin, UploaderInterface } from "@metaplex-foundation/umi";

/**
 * Retrieves the Pinata JWT and Gateway, checking environment variables first,
 * then falling back to browser localStorage, and prompting if missing in an interactive session.
 */
export function getPinataConfig(): { jwt: string; gateway: string } {
  let jwt = process.env.NEXT_PUBLIC_PINATA_JWT || "";
  let gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "copper-given-dolphin-912.mypinata.cloud";

  if (typeof window !== "undefined") {
    const localJwt = localStorage.getItem("street_sync_pinata_jwt");
    if (localJwt && localJwt.trim()) {
      jwt = localJwt.trim();
    }
    const localGateway = localStorage.getItem("street_sync_pinata_gateway");
    if (localGateway && localGateway.trim()) {
      gateway = localGateway.trim();
    }
  }

  // Fallback: If not in env or localStorage and running in the browser, prompt the admin
  if (!jwt && typeof window !== "undefined") {
    const prompted = window.prompt(
      "Pinata IPFS JWT is required for permanent decentralized media storage.\n\nPlease paste your Pinata JWT (it will be saved to your browser session):"
    );
    if (prompted && prompted.trim()) {
      jwt = prompted.trim();
      localStorage.setItem("street_sync_pinata_jwt", jwt);
    }
  }

  return { jwt, gateway };
}

export function setPinataJwt(jwt: string, gateway?: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("street_sync_pinata_jwt", jwt.trim());
    if (gateway) {
      localStorage.setItem("street_sync_pinata_gateway", gateway.trim());
    }
  }
}

/**
 * Creates an UploaderInterface that uploads directly to Pinata IPFS.
 * 
 * Benefits:
 * - Compatible with Next.js static exports (output: 'export' for GitHub Pages).
 * - Files are permanently pinned to IPFS and never 404/purge.
 * - Direct drop-in replacement for irysUploader in TokenGenerator, Token2022Studio, and NFTStudio.
 */
export function createPinataUploader(): UploaderInterface {
  return {
    async upload(files: GenericFile[]): Promise<string[]> {
      const { jwt, gateway } = getPinataConfig();
      if (!jwt) {
        throw new Error("Missing Pinata JWT. Please configure NEXT_PUBLIC_PINATA_JWT in GitHub Secrets or browser settings.");
      }

      const uris: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        const blob = new Blob([file.buffer as any], { type: file.contentType || "image/png" });
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
      const { jwt, gateway } = getPinataConfig();
      if (!jwt) {
        throw new Error("Missing Pinata JWT. Please configure NEXT_PUBLIC_PINATA_JWT in GitHub Secrets or browser settings.");
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
