import { NextResponse } from 'next/server';
import { mockHeadlines, mockGlobalNews, mockCryptoNews, NewsArticle } from '@/lib/newsApi';

export const revalidate = 3600; // Cache the entire route for 1 hour

export async function GET() {
  const API_KEY = process.env.NEXT_PUBLIC_NEWSDATA_API_KEY || process.env.NEWSDATA_API_KEY;
  
  if (!API_KEY) {
    // If no key, fallback to local mocks
    return NextResponse.json({
      headlines: mockHeadlines,
      global: mockGlobalNews,
      crypto: mockCryptoNews
    });
  }

  try {
    // timeframe=24 strictly enforces a 24-hour retention window for fresh news
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&language=en&category=business,technology,cryptocurrency&timeframe=24`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    const results = data.results || [];
    
    // Map NewsData.io standard to our UI interface
    const mapped: NewsArticle[] = results.map((item: any) => ({
      article_id: item.article_id || Math.random().toString(),
      title: item.title,
      link: item.link || "#",
      source_name: item.source_id || "Global Feed",
      pubDate: item.pubDate || new Date().toISOString(),
      image_url: item.image_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
      description: item.description || item.title,
      content: item.content || item.description || "Content unavailable",
      sentiment: item.sentiment || (Math.random() > 0.5 ? 'Positive' : 'Negative'), // Fallback sentiment if free tier
      sentiment_score: item.sentiment_stats?.positive ? (item.sentiment_stats.positive - item.sentiment_stats.negative) : (Math.random() * 2 - 1),
      tags: item.keywords || ['Market News']
    }));

    return NextResponse.json({
      headlines: mapped.slice(0, 5),
      global: mapped.slice(5, 15),
      crypto: mapped.slice(15, 25)
    });

  } catch (err: any) {
    console.error("News API Route Error:", err);
    // Graceful degradation
    return NextResponse.json({ 
      headlines: mockHeadlines, 
      global: mockGlobalNews, 
      crypto: mockCryptoNews 
    });
  }
}
