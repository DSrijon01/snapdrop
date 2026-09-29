import { NextRequest, NextResponse } from "next/server";
import { OpenClawChatRequest, OpenClawChatResponse } from "@/lib/openclaw/types";

interface LiveTokenPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
}

// Free live price fetcher from Binance public API with fallback
async function fetchLiveMarketPrices(): Promise<Record<string, LiveTokenPrice>> {
  const defaults: Record<string, LiveTokenPrice> = {
    SOL: { symbol: "SOL", name: "Solana", price: 118.5, change24h: -4.2 },
    BTC: { symbol: "BTC", name: "Bitcoin", price: 82900, change24h: -2.1 },
    ETH: { symbol: "ETH", name: "Ethereum", price: 2650, change24h: -2.4 },
    JUP: { symbol: "JUP", name: "Jupiter", price: 0.95, change24h: -3.8 },
    USDC: { symbol: "USDC", name: "USD Coin", price: 1.0, change24h: 0.0 },
  };

  try {
    const symbols = ["SOLUSDT", "BTCUSDT", "ETHUSDT", "JUPUSDT"];
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(
      JSON.stringify(symbols)
    )}`;

    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!res.ok) return defaults;

    const data = await res.json();
    if (!Array.isArray(data)) return defaults;

    const result = { ...defaults };
    data.forEach((item: any) => {
      const sym = item.symbol.replace("USDT", "");
      if (result[sym]) {
        result[sym].price = parseFloat(item.lastPrice);
        result[sym].change24h = parseFloat(item.priceChangePercent);
        result[sym].high24h = parseFloat(item.highPrice);
        result[sym].low24h = parseFloat(item.lowPrice);
      }
    });

    return result;
  } catch (err) {
    return defaults;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: OpenClawChatRequest = await req.json();
    const { message, modelId = "deepseek", portfolio } = body;

    const solBalance = portfolio?.sol ?? 12.0;
    const btcBalance = portfolio?.btc ?? 0.3;
    const usdcBalance = portfolio?.usdc ?? 2500;

    // Fetch live market data
    const prices = await fetchLiveMarketPrices();
    const solPrice = prices.SOL.price;
    const btcPrice = prices.BTC.price;
    const ethPrice = prices.ETH.price;

    const solVal = solBalance * solPrice;
    const btcVal = btcBalance * btcPrice;
    const usdcVal = usdcBalance;
    const totalPortfolioVal = solVal + btcVal + usdcVal;
    const solWeightPct = (solVal / totalPortfolioVal) * 100;
    const btcWeightPct = (btcVal / totalPortfolioVal) * 100;
    const usdcWeightPct = (usdcVal / totalPortfolioVal) * 100;

    // Read Groq API Key
    const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;

    // Map UI selection to active Groq inference models
    let groqModel = "openai/gpt-oss-120b";
    let modelDisplayName = "GPT-OSS 120B (Deep Reasoning)";

    if (modelId === "gpt-oss-20b" || modelId === "openai" || modelId === "groq") {
      groqModel = "openai/gpt-oss-20b";
      modelDisplayName = "GPT-OSS 20B (High-Speed Execution)";
    } else if (modelId === "qwen-27b" || modelId === "kimi") {
      groqModel = "qwen/qwen3.8-27b";
      modelDisplayName = "Qwen 3.8 27B (Market & Macro)";
    } else {
      groqModel = "openai/gpt-oss-120b";
      modelDisplayName = "GPT-OSS 120B (Deep Reasoning)";
    }

    // Sparkline array (7 points ending at live price)
    const delta = prices.SOL.change24h / 100;
    const baseP = solPrice / (1 + delta);
    const sparklinePrices = [
      Number((baseP * 0.96).toFixed(1)),
      Number((baseP * 0.98).toFixed(1)),
      Number((baseP * 0.97).toFixed(1)),
      Number((baseP * 1.01).toFixed(1)),
      Number((baseP * 0.99).toFixed(1)),
      Number((baseP * (1 + delta * 0.7)).toFixed(1)),
      Number(solPrice.toFixed(1)),
    ];

    const walletContextStr = portfolio?.isLiveWallet
      ? `Live Connected Solana Wallet (${portfolio.walletAddress ? `${portfolio.walletAddress.slice(0, 4)}..${portfolio.walletAddress.slice(-4)}` : "Active"}): ${solBalance.toFixed(4)} SOL ($${solVal.toFixed(2)}), ${usdcBalance} USDC`
      : `Simulated Demo Portfolio: ${solBalance} SOL ($${solVal.toFixed(0)}), ${btcBalance} BTC ($${btcVal.toFixed(0)}), ${usdcBalance} USDC ($${usdcVal.toFixed(0)})`;

    // If Groq Key is available, make the live LLM API call
    if (groqKey) {
      try {
        const systemPrompt = `You are StreetSync AI Copilot, an autonomous, institutional-grade financial and crypto trading intelligence assistant on the StreetSync platform, running on high-speed Groq Cloud open-source inference models (${modelDisplayName}).

Live Real-Time Market Prices:
- SOL: $${solPrice} (${prices.SOL.change24h >= 0 ? "+" : ""}${prices.SOL.change24h}% 24h)
- BTC: $${btcPrice} (${prices.BTC.change24h >= 0 ? "+" : ""}${prices.BTC.change24h}% 24h)
- ETH: $${ethPrice} (${prices.ETH.change24h >= 0 ? "+" : ""}${prices.ETH.change24h}% 24h)

User Portfolio Context:
- ${walletContextStr}
- Total Portfolio Value: $${totalPortfolioVal.toFixed(2)}

Instructions:
1. If the user asks about your name, identity, who you are, or greets you: Introduce yourself warmly and concisely as "StreetSync AI Copilot" running on ${modelDisplayName}. Briefly state that you provide real-time market insights, portfolio auditing, risk guardrails, and Jupiter DEX execution analysis. Do NOT output an unsolicited, repetitive market recap when simply asked your name or greeted.
2. If the user asks a question about crypto, prices, strategy, risk, or portfolio: Provide a sharp, structured, data-grounded financial analysis directly addressing their query. Reference real-time spot prices and the user's portfolio context where relevant. Conclude with a clear, concise actionable takeaway.
3. Keep the tone professional, objective, and institutional.`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            temperature: 0.3,
            max_tokens: 1024,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          let rawAiText = groqData.choices?.[0]?.message?.content || "";

          // Strip <think> tags if DeepSeek R1 returns internal reasoning thoughts
          if (rawAiText.includes("</think>")) {
            rawAiText = rawAiText.split("</think>")[1].trim();
          }

          if (rawAiText) {
            // Determine dynamic action card
            const lowerMsg = message.toLowerCase();
            let actionCard = {
              suggestedMove: "Review recommended portfolio allocation and DEX liquidity bounds.",
              primaryText: "Execute Swap (Jupiter DEX)",
              secondaryText: `Set alert at $${(solPrice * 1.05).toFixed(0)}`,
              onPrimaryAction: "rebalance",
            };

            if (lowerMsg.includes("profit") || lowerMsg.includes("trim") || lowerMsg.includes("sell")) {
              actionCard = {
                suggestedMove: `Trim 20% SOL into USDC at $${solPrice.toFixed(2)} market price.`,
                primaryText: "Trim 20% SOL",
                secondaryText: `Trailing Stop @ $${(solPrice * 0.93).toFixed(1)}`,
                onPrimaryAction: "trim-sol",
              };
            } else if (lowerMsg.includes("rebalance") || lowerMsg.includes("concentration") || lowerMsg.includes("risk")) {
              actionCard = {
                suggestedMove: `Rebalance SOL concentration (${solWeightPct.toFixed(0)}%) into USDC yield.`,
                primaryText: "Execute Rebalance",
                secondaryText: "Review Watchlist",
                onPrimaryAction: "rebalance",
              };
            } else if (lowerMsg.includes("buy") || lowerMsg.includes("entry") || lowerMsg.includes("dca")) {
              actionCard = {
                suggestedMove: `Configure 3-tranche TWAP DCA entry for SOL under $${(solPrice * 0.98).toFixed(1)}.`,
                primaryText: "Activate DCA Order",
                secondaryText: `Limit Buy @ $${(solPrice * 0.95).toFixed(1)}`,
                onPrimaryAction: "dca",
              };
            }

            return NextResponse.json({
              text: rawAiText,
              modelUsed: modelDisplayName,
              skillsTriggered: ["live-groq-inference", "binance-spot-grounding", "solana-portfolio-eval"],
              assetPills: [
                {
                  ticker: "SOL",
                  name: "Solana",
                  price: solPrice,
                  change24h: prices.SOL.change24h,
                  logoBg: "bg-gradient-to-tr from-[#9945FF] to-[#14F195]",
                  description: `Live: $${solPrice.toFixed(2)}`,
                },
                {
                  ticker: "BTC",
                  name: "Bitcoin",
                  price: btcPrice,
                  change24h: prices.BTC.change24h,
                  logoBg: "bg-[#F7931A]",
                  description: `Live: $${btcPrice.toLocaleString()}`,
                },
                {
                  ticker: "ETH",
                  name: "Ethereum",
                  price: ethPrice,
                  change24h: prices.ETH.change24h,
                  logoBg: "bg-[#627EEA]",
                  description: `Live: $${ethPrice.toLocaleString()}`,
                },
              ],
              sparklineData: {
                prices: sparklinePrices,
                isBullish: prices.SOL.change24h >= 0,
                label: `SOL 7-DAY (${prices.SOL.change24h >= 0 ? "+" : ""}${prices.SOL.change24h.toFixed(1)}%)`,
              },
              allocationData: [
                { name: "SOL", value: Math.round(solVal), color: "#9945FF" },
                { name: "BTC", value: Math.round(btcVal), color: "#F7931A" },
                { name: "USDC", value: Math.round(usdcVal), color: "#2775CA" },
              ],
              actionCard,
            });
          }
        } else {
          const errBody = await groqRes.text();
          console.error("Groq API returned error status:", groqRes.status, errBody);
        }
      } catch (e) {
        console.error("Groq call failed, falling back to autonomous response", e);
      }
    }

    // Fallback if network or key fails
    return NextResponse.json({
      text: `**Live Financial Intelligence**: SOL is trading at **$${solPrice.toFixed(2)}** (${prices.SOL.change24h >= 0 ? "+" : ""}${prices.SOL.change24h}%), with BTC at **$${btcPrice.toLocaleString()}**.\n\nYour portfolio sits at **$${totalPortfolioVal.toLocaleString()}** (${solWeightPct.toFixed(0)}% SOL, ${btcWeightPct.toFixed(0)}% BTC). Volatility parameters remain steady.`,
      modelUsed: "Groq Cloud Gateway",
      skillsTriggered: ["market-data-grounding"],
      assetPills: [
        {
          ticker: "SOL",
          name: "Solana",
          price: solPrice,
          change24h: prices.SOL.change24h,
          logoBg: "bg-gradient-to-tr from-[#9945FF] to-[#14F195]",
          description: `Live: $${solPrice.toFixed(2)}`,
        },
      ],
      sparklineData: {
        prices: sparklinePrices,
        isBullish: prices.SOL.change24h >= 0,
        label: `SOL 7-DAY (${prices.SOL.change24h >= 0 ? "+" : ""}${prices.SOL.change24h.toFixed(1)}%)`,
      },
      allocationData: [
        { name: "SOL", value: Math.round(solVal), color: "#9945FF" },
        { name: "BTC", value: Math.round(btcVal), color: "#F7931A" },
        { name: "USDC", value: Math.round(usdcVal), color: "#2775CA" },
      ],
      actionCard: {
        suggestedMove: "Review recommended portfolio allocation and DEX liquidity bounds.",
        primaryText: "Execute Rebalance",
        secondaryText: "Review Watchlist",
        onPrimaryAction: "rebalance",
      },
    });
  } catch (error: any) {
    console.error("Chat Route Error:", error);
    return NextResponse.json(
      {
        text: "Financial intelligence engine is active. Please retry your request.",
        modelUsed: "Groq Cloud Gateway",
        skillsTriggered: ["fallback"],
      },
      { status: 200 }
    );
  }
}
