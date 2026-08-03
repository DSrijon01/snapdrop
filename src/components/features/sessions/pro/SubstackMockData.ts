export interface SubstackPost {
  id: string;
  author: string;
  authorHandle: string;
  authorAvatar: string;
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
  commentsList?: { id: string; author: string; avatar: string; text: string; time: string }[];
}

export interface SubstackSubscription {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  unreadCount?: number;
  hasUnread?: boolean;
  category: string;
}

export interface RecommendedCreator {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  isVerified?: boolean;
  isSubscribed?: boolean;
}

export const INITIAL_SUBSTACK_SUBSCRIPTIONS: SubstackSubscription[] = [
  { id: "sub-1", name: "Cassandra", handle: "cassandra", avatar: "🎨", hasUnread: true, category: "Macro" },
  { id: "sub-2", name: "Value Picks", handle: "valuepicks", avatar: "📈", hasUnread: true, category: "Stocks" },
  { id: "sub-3", name: "AI In Financial", handle: "aifinance", avatar: "🤖", hasUnread: true, category: "AI & Quant" },
  { id: "sub-4", name: "How They Build", handle: "howtheybuild", avatar: "🔀", hasUnread: true, category: "Engineering" },
  { id: "sub-5", name: "AI Market Alpha", handle: "aimarket", avatar: "📉", hasUnread: true, category: "Alpha" },
  { id: "sub-6", name: "Quality Stocks", handle: "qualitystocks", avatar: "🐷", hasUnread: true, category: "Investing" },
  { id: "sub-7", name: "Principled Inv.", handle: "principled", avatar: "👨‍💼", hasUnread: false, category: "Wealth" },
  { id: "sub-8", name: "Dividends Daily", handle: "dividends", avatar: "💵", hasUnread: true, category: "Income" },
];

export const INITIAL_RECOMMENDED_CREATORS: RecommendedCreator[] = [
  { id: "rec-1", name: "Gut Health Digest", subtitle: "Gut Health Digest", avatar: "🥗", isVerified: false, isSubscribed: false },
  { id: "rec-2", name: "Luke Cadell", subtitle: "Holistic Healing & Quant Mindset", avatar: "🧘‍♂️", isVerified: true, isSubscribed: false },
  { id: "rec-3", name: "Jordan Schneider, MD", subtitle: "Jordan Schneider", avatar: "👨‍⚕️", isVerified: false, isSubscribed: false },
  { id: "rec-4", name: "Nutritional Wellness", subtitle: "Nutritional Wellness", avatar: "🍃", isVerified: false, isSubscribed: false },
  { id: "rec-5", name: "Daily Mindfulness", subtitle: "Daily Mindfulness & Trading State", avatar: "🧘", isVerified: true, isSubscribed: false },
];

export const INITIAL_SUBSTACK_POSTS: SubstackPost[] = [
  {
    id: "sub-post-1",
    author: "Dhruv Sahu",
    authorHandle: "dhruvsahu",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
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
      { id: "c1", author: "Alex Rivers", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", text: "Looking forward to this series! Great initiative Dhruv.", time: "6d" },
      { id: "c2", author: "Elena Rostova", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", text: "Can you feature macro analysts as well?", time: "5d" }
    ]
  },
  {
    id: "sub-post-2",
    author: "Papers for Quant Traders",
    authorHandle: "quantpapers",
    authorAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
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
      { id: "c3", author: "Dr. Satoshi", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100", text: "Fascinating derivation of fat-tail returns in trend strategies.", time: "12h" }
    ]
  },
  {
    id: "sub-post-3",
    author: "AI In Financial Markets",
    authorHandle: "aifinance",
    authorAvatar: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&auto=format&fit=crop&q=80",
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
