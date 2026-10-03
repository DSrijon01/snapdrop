import { NextResponse } from 'next/server';
import { mockHeadlines, mockGlobalNews, mockCryptoNews, NewsArticle } from '@/lib/newsApi';
import { enrichArticlesWithSentiment } from '@/lib/sentimentAnalyzer';

export const revalidate = 3600; // Cache the route for 1 hour

// In-memory cache fallback to strictly protect the 200 daily request quota
let cachedNewsData: { data: any; timestamp: number } | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const API_KEY = process.env.NEWSDATA_API_KEY || process.env.NEXT_PUBLIC_NEWSDATA_API_KEY || "pub_67f62ba79a9445f4896e83970c7b1eb1";

  // Check in-memory cache first to guarantee quota preservation
  const now = Date.now();
  if (cachedNewsData && (now - cachedNewsData.timestamp < CACHE_DURATION_MS)) {
    return NextResponse.json(cachedNewsData.data);
  }

  if (!API_KEY) {
    return NextResponse.json({
      headlines: mockHeadlines,
      global: mockGlobalNews,
      crypto: mockCryptoNews
    });
  }

  try {
    // newsdata.io /api/1/latest endpoint (clean parameters without illegal 'cb')
    const urlGeneral = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&language=en&category=business,technology`;
    const urlCrypto = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&language=en&q=crypto`;

    const [resGeneral, resCrypto] = await Promise.all([
      fetch(urlGeneral, { next: { revalidate: 3600 } }),
      fetch(urlCrypto, { next: { revalidate: 3600 } })
    ]);

    if (!resGeneral.ok || !resCrypto.ok) {
      throw new Error(`API error: General(${resGeneral.status}), Crypto(${resCrypto.status})`);
    }

    const dataGeneral = await resGeneral.json();
    const dataCrypto = await resCrypto.json();

    const rawGeneral = dataGeneral.results || [];
    const rawCrypto = dataCrypto.results || [];

    const mapItems = (items: any[]) => items.map((item: any) => ({
      article_id: item.article_id || Math.random().toString(),
      title: item.title,
      link: item.link || "#",
      source_name: item.source_name || item.source_id || "Global Feed",
      source_icon: item.source_icon,
      pubDate: item.pubDate || new Date().toISOString(),
      image_url: item.image_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
      description: item.description || item.title,
      content: item.content || item.description || "Content unavailable",
      tags: item.keywords || ['Market News']
    }));

    // Enrich live articles with real financial NLP & Groq AI Sentiment Analysis
    const [enrichedGeneral, enrichedCrypto] = await Promise.all([
      enrichArticlesWithSentiment(mapItems(rawGeneral)),
      enrichArticlesWithSentiment(mapItems(rawCrypto))
    ]);

    const finalHeadlines = enrichedGeneral.slice(0, 5);
    const finalGlobal = enrichedGeneral.slice(5, 15);
    const finalCrypto = enrichedCrypto.slice(0, 10);

    const payload = {
      headlines: finalHeadlines.length > 0 ? finalHeadlines : mockHeadlines,
      global: finalGlobal.length > 0 ? finalGlobal : mockGlobalNews,
      crypto: finalCrypto.length > 0 ? finalCrypto : mockCryptoNews
    };

    // Store in memory cache
    cachedNewsData = { data: payload, timestamp: now };

    return NextResponse.json(payload);

  } catch (err: any) {
    console.error("News API Route Error:", err);
    if (cachedNewsData) {
      return NextResponse.json(cachedNewsData.data);
    }
    // Graceful fallback to rich mock data
    return NextResponse.json({ 
      headlines: mockHeadlines, 
      global: mockGlobalNews, 
      crypto: mockCryptoNews 
    });
  }
}
