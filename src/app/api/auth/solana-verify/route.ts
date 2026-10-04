import { NextRequest, NextResponse } from "next/server";
import { verifySolanaWalletAndCreateToken } from "@/lib/l2database/server/verifySolanaSignature";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const { walletAddress, message, signature } = body;

    const result = await verifySolanaWalletAndCreateToken({
      walletAddress,
      message,
      signature,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/auth/solana-verify] Unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error verifying Solana signature",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
