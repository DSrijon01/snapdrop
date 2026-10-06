import { NextRequest, NextResponse } from "next/server";
import { 
  fetchTokensXyzAsset, 
  POPULAR_SECURITIES_LIST, 
  SecurityAsset 
} from "@/lib/tokensXyz";

export const revalidate = 300; // Cache for 5 minutes

// Static GET returns curated securities list
export async function GET() {
  try {
    const results = await Promise.allSettled(
      POPULAR_SECURITIES_LIST.map((item) => fetchTokensXyzAsset(item.symbol))
    );

    const assets: SecurityAsset[] = [];
    results.forEach((r, idx) => {
      if (r.status === "fulfilled" && r.value) {
        assets.push(r.value);
      } else {
        const fallback = POPULAR_SECURITIES_LIST[idx];
        assets.push({
          assetId: fallback.id,
          name: fallback.name,
          symbol: fallback.symbol,
          category: fallback.category,
          price: 150.0,
          priceChange24hPercent: 1.25,
          volume24hUSD: 5000000,
          marketCap: 100000000000,
          canonicalPrice: 150.0,
          primaryVariant: {
            symbol: `${fallback.symbol}x`,
            mint: "",
            label: "xStock",
            trustTier: "tier2",
            stockVariantTier: "cash_redeemable",
          },
        });
      }
    });

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error("Error in securities GET route:", error);
    return NextResponse.json({ assets: [] }, { status: 500 });
  }
}

// Dynamic POST returns any ticker lookup securely from server without CORS issues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ticker = body.ticker || body.symbol;

    if (!ticker) {
      return NextResponse.json({ error: "Ticker symbol is required" }, { status: 400 });
    }

    const asset = await fetchTokensXyzAsset(ticker);
    if (!asset) {
      return NextResponse.json({ error: `Security ${ticker} not found` }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error: any) {
    console.error("Error in securities POST route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
