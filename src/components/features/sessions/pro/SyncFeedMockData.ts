export interface SyncFeedPost {
  id: string;
  author: string;
  authorHandle: string;
  avatarSeed: string;
  isVerified?: boolean;
  timeAgo: string;
  isSubscribed?: boolean;
  socialProof?: string;
  title?: string;
  content: string;
  callout?: string;
  topic?: string;
  mediaType?: "images" | "code" | "chart" | "pdf";
  mediaUrl1?: string;
  mediaUrl2?: string;
  mediaTitle1?: string;
  likes: number;
  commentsCount: number;
  restacks: number;
  userLiked?: boolean;
  userRestacked?: boolean;
  commentsList?: { id: string; author: string; avatarSeed: string; text: string; time: string }[];
}

export interface SyncFeedSubscription {
  id: string;
  name: string;
  handle: string;
  avatarSeed: string;
  unreadCount?: number;
  hasUnread?: boolean;
  category: string;
}

export interface RecommendedCreator {
  id: string;
  name: string;
  subtitle: string;
  avatarSeed: string;
  isVerified?: boolean;
  isSubscribed?: boolean;
}

export const INITIAL_SYNC_FEED_SUBSCRIPTIONS: SyncFeedSubscription[] = [
  { id: "sub-1", name: "Cassandra", handle: "cassandra", avatarSeed: "Cassandra_Bot", hasUnread: true, category: "Macro" },
  { id: "sub-2", name: "Value Picks", handle: "valuepicks", avatarSeed: "ValuePicks_Bot", hasUnread: true, category: "Stocks" },
  { id: "sub-3", name: "AI In Financial", handle: "aifinance", avatarSeed: "AIFinance_Bot", hasUnread: true, category: "AI & Quant" },
  { id: "sub-4", name: "How They Build", handle: "howtheybuild", avatarSeed: "HowTheyBuild_Bot", hasUnread: true, category: "Engineering" },
  { id: "sub-5", name: "AI Market Alpha", handle: "aimarket", avatarSeed: "AIMarket_Bot", hasUnread: true, category: "Alpha" },
  { id: "sub-6", name: "Quality Stocks", handle: "qualitystocks", avatarSeed: "QualityStocks_Bot", hasUnread: true, category: "Investing" },
  { id: "sub-7", name: "Principled Inv.", handle: "principled", avatarSeed: "Principled_Bot", hasUnread: false, category: "Wealth" },
  { id: "sub-8", name: "Dividends Daily", handle: "dividends", avatarSeed: "Dividends_Bot", hasUnread: true, category: "Income" },
];

export const INITIAL_RECOMMENDED_CREATORS: RecommendedCreator[] = [
  { id: "rec-1", name: "Gut Health Digest", subtitle: "Gut Health Digest", avatarSeed: "GutHealth_Bot", isVerified: false, isSubscribed: false },
  { id: "rec-2", name: "Luke Cadell", subtitle: "Holistic Healing & Quant Mindset", avatarSeed: "LukeCadell_Bot", isVerified: true, isSubscribed: false },
  { id: "rec-3", name: "Jordan Schneider, MD", subtitle: "Jordan Schneider", avatarSeed: "JordanMD_Bot", isVerified: false, isSubscribed: false },
  { id: "rec-4", name: "Nutritional Wellness", subtitle: "Nutritional Wellness", avatarSeed: "Wellness_Bot", isVerified: false, isSubscribed: false },
  { id: "rec-5", name: "Daily Mindfulness", subtitle: "Daily Mindfulness & Trading State", avatarSeed: "Mindfulness_Bot", isVerified: true, isSubscribed: false },
];

export const INITIAL_SYNC_FEED_POSTS: SyncFeedPost[] = [
  {
    id: "sync-post-1",
    author: "Dhruv Sahu",
    authorHandle: "dhruvsahu",
    avatarSeed: "DhruvSahu_Bot",
    isVerified: true,
    timeAgo: "7d",
    isSubscribed: false,
    content: `Today, I'm starting a new series.\n\nEvery Sunday, I'll introduce you to one finance creator whose work I genuinely enjoy reading.\n\nIt's my small way of appreciating the people who make this community special. The ones who subscribe, read, comment, and share their thoughts.\n\nThere are so many brilliant people writing about finance, investing, business, and markets. I want to help more of them get discovered.❤️`,
    callout: "Update: This series will highlight creators whose work connects to finance, stocks, businesses, investing, economics, and markets.",
    topic: "Finance Creators",
    likes: 81,
    commentsCount: 4,
    restacks: 1,
    commentsList: [
      { id: "c1", author: "Alex Rivers", avatarSeed: "AlexRivers_Bot", text: "Looking forward to this series! Great initiative Dhruv.", time: "6d" },
      { id: "c2", author: "Elena Rostova", avatarSeed: "ElenaRostova_Bot", text: "Can you feature macro analysts as well?", time: "5d" }
    ]
  },
  {
    id: "sync-post-2",
    author: "Papers for Quant Traders",
    authorHandle: "quantpapers",
    avatarSeed: "QuantPapers_Bot",
    isVerified: true,
    timeAgo: "18h",
    isSubscribed: true,
    socialProof: "Systematic Traders liked",
    title: "Does trend following pay because markets trend, or because the return distribution is skewed?",
    content: "One paper this week derives it in closed form and shows the positive skew is structural, not a lucky sample:",
    mediaType: "images",
    mediaUrl1: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
    mediaUrl2: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&auto=format&fit=crop&q=80",
    mediaTitle1: "The Science and Practice of Trend-Following Systems (Academic Review)",
    topic: "Quantitative Trading",
    likes: 142,
    commentsCount: 19,
    restacks: 8,
    commentsList: [
      { id: "c3", author: "Dr. Satoshi", avatarSeed: "DrSatoshi_Bot", text: "Fascinating derivation of fat-tail returns in trend strategies.", time: "12h" }
    ]
  },
  {
    id: "sync-post-3",
    author: "AI In Financial Markets",
    authorHandle: "aifinance",
    avatarSeed: "AIFinance_Bot",
    isVerified: true,
    timeAgo: "3h",
    isSubscribed: true,
    title: "Solana Token-2022 Transfer Hooks: Architectural Deep Dive for Institutional Liquidity",
    content: "Transfer hooks allow programs to execute custom Rust logic on every token transfer. Here is how we implement zero-latency liquidity routing and automatic royalty enforcement on Solana mainnet.",
    mediaType: "chart",
    mediaUrl1: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800&auto=format&fit=crop&q=80",
    topic: "Solana Tech",
    likes: 230,
    commentsCount: 32,
    restacks: 14,
    commentsList: []
  }
];
