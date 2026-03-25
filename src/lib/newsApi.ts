export type SentimentLabel = 'Positive' | 'Negative' | 'Neutral';

export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  source_name: string;
  source_icon?: string;
  pubDate: string;
  image_url: string;
  description: string;
  content: string;
  sentiment: SentimentLabel;
  sentiment_score: number;
  tags: string[];
}

export const mockHeadlines: NewsArticle[] = [
  {
    article_id: 'top-1',
    title: 'Federal Reserve Signals Potential Rate Cuts Later This Year',
    link: 'https://www.wsj.com/economy/central-banking/fed-rate-cuts-2024',
    source_name: 'WSJ',
    pubDate: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
    description: 'The Federal Reserve indicated that it might begin lowering interest rates later this year, causing a rally in global markets.',
    content: 'The Federal Reserve held interest rates steady at its latest policy meeting but opened the door to cutting them later this year if inflation continues to decline. During the press conference, Chairman Jerome Powell emphasized that the central bank remains data-dependent, requiring "greater confidence" that inflation is moving sustainably toward the 2% target.\n\nMarkets responded positively to the news, with major indices seeing immediate gains. The S&P 500 and Nasdaq Composite both rallied as technology and consumer discretionary sectors led the charge. Bond yields slightly dipped, reflecting the market\'s anticipation of looser monetary policy in the upcoming quarters.\n\nAnalysts predict the first rate cut could happen as early as September, though some remain cautious due to resilient labor market data. A premature cut could risk reigning inflation, while holding rates too long could stifle economic growth. The delicate balancing act remains the primary focus for global investors.',
    sentiment: 'Positive',
    sentiment_score: 0.75,
    tags: ['Federal Reserve', 'Interest Rates', 'Economy'],
  },
  {
    article_id: 'top-2',
    title: 'Tech Giants Face New Regulatory Scrutiny in the EU',
    link: 'https://www.bloomberg.com/news/articles/eu-tech-giants-regulation-scrutiny',
    source_name: 'Bloomberg',
    pubDate: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    description: 'European regulators have launched a fresh probe into several major tech companies over anti-competitive practices.',
    content: 'Several tech behemoths are under the microscope once again as the European Union tightens its grip on digital market practices. The newly announced probe focuses on alleged anti-competitive behaviors, specifically regarding app store fees and self-preferencing algorithms that favor native applications over third-party competitors.\n\nEuropean Commission officials stated that despite prior warnings, substantial changes have not been implemented to ensure fair competition. The investigation could lead to significant fines—potentially up to 10% of global annual turnover—and mandated structural changes in how these companies operate within the bloc.\n\nIndustry experts warn that this could set a global precedent, emboldening other regulatory bodies worldwide to take similar actions. Digital rights advocates have praised the move, arguing it is necessary to protect consumer choice and foster innovation among smaller startups.',
    sentiment: 'Negative',
    sentiment_score: -0.62,
    tags: ['Regulations', 'EU', 'Tech'],
  },
  {
    article_id: 'top-3',
    title: 'Global Supply Chain Normalizes After Two Years of Disruption',
    link: 'https://www.reuters.com/business/global-supply-chains-normalize-2024',
    source_name: 'Reuters',
    pubDate: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1586528116311-ad8ed7c50a30?auto=format&fit=crop&q=80&w=800',
    description: 'Shipping costs and delivery times have returned to pre-pandemic levels, easing inflationary pressures on goods.',
    content: 'In a significant milestone for the global economy, major shipping routes and manufacturing hubs report that supply-chain operations have finally normalized. Shipping container costs from Asia to the US West Coast have plummeted to pre-pandemic averages, and backlogs at major ports have been completely cleared.\n\nThis normalization is providing significant relief to retailers and manufacturers who spent the last two years grappling with shortages and exuberant logistical costs. The stabilization is a key factor in easing broader inflationary pressures, as companies are no longer forced to pass exorbitant shipping fees down to the end consumer.\n\nHowever, some executives caution that the system remains fragile. Geopolitical tensions and climate-related disruptions at critical choke points, such as the Panama and Suez canals, still pose persistent risks. Therefore, many corporations are continuing their strategy of "near-shoring" to build more resilient long-term supply networks.',
    sentiment: 'Neutral',
    sentiment_score: 0.15,
    tags: ['Supply Chain', 'Global Trade'],
  },
];

export const mockGlobalNews: NewsArticle[] = [
  ...mockHeadlines,
  {
    article_id: 'global-4',
    title: 'Emerging Markets See Accelerated Growth in Q1',
    link: 'https://www.ft.com/emerging-markets-q1-accelerated-growth',
    source_name: 'Financial Times',
    pubDate: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
    description: 'Several emerging economies reported higher than expected GDP growth for the first quarter.',
    content: 'Emerging markets are showing extraordinary resilience, with several key economies reporting robust GDP growth for the first quarter of the year. Countries across Southeast Asia and Latin America have outpaced expectations, driven by strong export figures and rising domestic consumption.\n\nForeign direct investment has surged in these regions as investors seek higher yields amid tightening monetary policies in developed nations. Infrastructure development and a rapid digital transition are also playing pivotal roles in sustaining this accelerated economic momentum.\n\nEconomists point out that if this growth trajectory continues, emerging markets could serve as the primary engine for global economic expansion over the coming decade. However, they also caution about potential vulnerabilities regarding dollar-denominated debt and sudden currency fluctuations.',
    sentiment: 'Positive',
    sentiment_score: 0.88,
    tags: ['Emerging Markets', 'GDP', 'Growth'],
  },
  {
    article_id: 'global-5',
    title: 'Oil Prices Dip Amid Global Demand Concerns',
    link: 'https://www.cnbc.com/oil-markets/crude-dips-demand-concerns',
    source_name: 'CNBC',
    pubDate: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=800',
    description: 'Crude oil prices fell slightly on Tuesday as investors worried about weakening demand from major consumers.',
    content: 'Crude oil prices experienced a slight dip on Tuesday due to mounting anxieties regarding weakening demand from major industrial consumers. Recent manufacturing data indicated an unexpected contraction, leading traders to recalibrate their energy consumption forecasts for the upcoming quarter.\n\nDespite ongoing production cuts from OPEC+ aimed at stabilizing the market, the overarching sentiment remains bearish. The transition towards renewable energy sources and the increasing adoption of electric vehicles are also beginning to make a structural dent in long-term fossil fuel demand projections.\n\nMarket analysts suggest that absent any severe geopolitical escalation that threatens immediate supply, oil prices are likely to remain range-bound in the near term. Investors are keeping a close watch on upcoming inventory reports to gauge the true extent of the demand softening.',
    sentiment: 'Negative',
    sentiment_score: -0.45,
    tags: ['Commodities', 'Oil', 'Energy'],
  }
];

export const mockCryptoNews: NewsArticle[] = [
  {
    article_id: 'crypto-1',
    title: 'Bitcoin Surpasses $70,000 Mark Following Institutional Inflows',
    link: 'https://www.coindesk.com/markets/bitcoin-surpasses-70k-institutional-inflows',
    source_name: 'CoinDesk',
    pubDate: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&q=80&w=800',
    description: 'BTC broke through key resistance levels today as spot ETFs continue to attract massive institutional capital.',
    content: 'Bitcoin has once again dominated headlines by successfully breaking the $70,000 psychological barrier. This impressive surge is largely attributed to sustained, daily inflows into newly approved spot exchange-traded funds (ETFs) in the US, acting as a massive vacuum for available supply.\n\nThe institutional appetite shows no signs of slowing down. Major wealth management firms have begun allocating significant portions of client portfolios to the digital asset, viewing it as both a hedge against monetary debasement and a high-growth technological commodity.\n\nCoupled with the upcoming Bitcoin halving event—which will slash the newly minted supply in half—the supply-demand dynamics are exceptionally tight. Traders are highly optimistic that this combination of fierce institutional demand and constricting supply will push the asset to unprecedented valuations over the next year.',
    sentiment: 'Positive',
    sentiment_score: 0.92,
    tags: ['Bitcoin', 'ETF', 'Markets'],
  },
  {
    article_id: 'crypto-2',
    title: 'Major Exchange Faces Regulatory Probe Over Staking Products',
    link: 'https://cryptoslate.com/major-exchange-faces-regulatory-probe-staking',
    source_name: 'CryptoSlate',
    pubDate: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&q=80&w=800',
    description: 'Regulators have issued a Wells notice to a top-tier crypto exchange regarding its yield-bearing staking services.',
    content: 'A prominent cryptocurrency exchange is confronting intense regulatory scrutiny after receiving a Wells notice concerning its yield-bearing staking products. Regulators allege that these "Staking-as-a-Service" programs act as unregistered securities offerings, demanding immediate compliance modifications or potential shutdowns.\n\nThe enforcement action has sent ripples across the broader crypto ecosystem. Many competing platforms are preemptively modifying or suspending their own yield products in fear of similar litigation. Legal teams argue that existing frameworks are completely inadequate for interpreting proof-of-stake blockchain mechanisms.\n\nIf the regulators succeed in classifying these staking protocols as securities, the implications for decentralized finance (DeFi) in the region would be severe. The exchange has indicated it intends to fiercely defend its operations in court, setting the stage for a landmark legal battle that could define digital asset regulation for years to come.',
    sentiment: 'Negative',
    sentiment_score: -0.78,
    tags: ['Regulation', 'Staking', 'Exchanges'],
  },
  {
    article_id: 'crypto-3',
    title: 'Ethereum Layer 2 Networks Hit Record High TVL',
    link: 'https://www.theblock.co/ethereum-layer-2-record-tvl',
    source_name: 'The Block',
    pubDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1622736686125-962635a967c7?auto=format&fit=crop&q=80&w=800',
    description: 'Total Value Locked across Ethereum scaling solutions reached a new all-time high of $42 billion.',
    content: 'Ethereum’s layer 2 (L2) ecosystems are experiencing an explosive boom, with Total Value Locked (TVL) across all leading scaling networks hitting a record-shattering $42 billion. The massive capital migration is driven primarily by users seeking cheap, lightning-fast transactions while retaining the security guarantees of the Ethereum mainnet.\n\nOptimistic rollups and Zero-Knowledge (ZK) proofs are currently dominating the space. Decentralized exchanges and lending protocols natively built on these layer 2 architectures are seeing exponential user growth. Airdrop farming dynamics have also heavily incentivized liquidity bridging and active network participation.\n\nAs Ethereum proceeds with roadmap upgrades specifically tailored to make L2 data availability drastically cheaper, analysts believe this boom is just the beginning. The successful offloading of transactional throughput to these scaling solutions strongly validates Ethereum’s modular, rollup-centric scaling vision.',
    sentiment: 'Positive',
    sentiment_score: 0.65,
    tags: ['Ethereum', 'DeFi', 'Layer2'],
  },
  {
    article_id: 'crypto-4',
    title: 'New Token Standard Proposed for Solana Network',
    link: 'https://decrypt.co/new-token-standard-proposed-for-solana',
    source_name: 'Decrypt',
    pubDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?auto=format&fit=crop&q=80&w=800',
    description: 'Developers are discussing a new primitive to handle complex metadata on-chain for the Solana ecosystem.',
    content: 'The Solana developer community is actively debating a highly anticipated new token standard designed to natively handle complex, deeply nested metadata entirely on-chain. Current token architectures rely heavily on off-chain JSON storage pointers, which can introduce centralization vectors and broken image links over time.\n\nThe proposed standard, dubbed Token-2022 Extensions, aims to embed programmable interactivity directly within the mint construct. This includes capabilities like mandatory transfer fees, confidential transfers via zero-knowledge proofs, and inherent soul-bound properties without requiring clunky wrapper programs.\n\nWhile largely seen as a massive leap forward for institutional adoption and robust on-chain gaming logic, some ecosystem participants worry about the resulting ecosystem fragmentation. A smooth migration path and unified wallet support will be essential before the standard can gain ubiquitous adoption across decentralized applications.',
    sentiment: 'Neutral',
    sentiment_score: 0.10,
    tags: ['Solana', 'Development', 'Tokens'],
  }
];

export async function fetchNews() {
  const API_KEY = process.env.NEXT_PUBLIC_NEWSDATA_API_KEY;

  if (!API_KEY) {
    console.warn("No NewsData API Key found. Using rich mock data fallback.");
    return {
      headlines: mockHeadlines,
      global: mockGlobalNews,
      crypto: mockCryptoNews
    };
  }

  try {
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&language=en&category=business,technology,cryptocurrency&timeframe=24`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`External API error: ${res.status}`);
    }

    const data = await res.json();
    const results = data.results || [];
    
    const mapped: NewsArticle[] = results.map((item: any) => ({
      article_id: item.article_id || Math.random().toString(),
      title: item.title,
      link: item.link || "#",
      source_name: item.source_id || "Global Feed",
      pubDate: item.pubDate || new Date().toISOString(),
      image_url: item.image_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
      description: item.description || item.title,
      content: item.content || item.description || "Content unavailable",
      sentiment: item.sentiment || (Math.random() > 0.5 ? 'Positive' : 'Negative'),
      sentiment_score: item.sentiment_stats?.positive ? (item.sentiment_stats.positive - item.sentiment_stats.negative) : (Math.random() * 2 - 1),
      tags: item.keywords || ['Market News']
    }));

    return {
      headlines: mapped.slice(0, 5),
      global: mapped.slice(5, 15),
      crypto: mapped.slice(15, 25)
    };
  } catch (error) {
    console.warn("Failed to fetch live news. Falling back to mock data.", error);
    return {
      headlines: mockHeadlines,
      global: mockGlobalNews,
      crypto: mockCryptoNews
    };
  }
}
