import { verifySolanaWalletAndCreateToken } from "./verifySolanaSignature";

/**
 * Standard Firebase Cloud Function handler (v2 https.onRequest or Express middleware).
 * Can be imported in `functions/index.js` or `functions/src/index.ts`:
 *
 * ```ts
 * import { onRequest } from "firebase-functions/v2/https";
 * import { solanaVerifyCloudFunction } from "./cloudFunctionHandler";
 * export const verifySolana = onRequest({ cors: true }, solanaVerifyCloudFunction);
 * ```
 */
export async function solanaVerifyCloudFunction(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
  }

  try {
    const { walletAddress, message, signature } = req.body || {};

    const result = await verifySolanaWalletAndCreateToken({
      walletAddress,
      message,
      signature,
    });

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[Cloud Function] solanaVerifyCloudFunction error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
}
