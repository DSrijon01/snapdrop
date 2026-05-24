export interface Position {
  ticker: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage?: number;
}

export interface BoardComment {
  id: string;
  author: string;
  avatarSeed: string;
  content: string;
  createdAt: string;
  upvotes: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  avatarSeed: string;
  createdAt: string;
  flair: 'YOLO' | 'DD' | 'LOSS PORN' | 'GAIN PORN' | 'MEME' | 'DISCUSSION';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  ticker?: string;
  upvotes: number;
  userVote?: 'up' | 'down';
  position?: Position;
  comments: BoardComment[];
}

export interface ChatMessage {
  id: string;
  author: string;
  avatarSeed: string;
  content: string;
  createdAt: string;
}

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    title: 'YOLO\'d my life savings ($30,000) on GME calls expiring next week',
    content: 'Either I buy a brand new Tesla by next Friday or I am eating ramen in a cardboard box under the bridge. There is no in-between. To the moon boys, don\'t let me down! 🚀💎🙌',
    author: 'DegenSol_4A7f',
    avatarSeed: 'DegenSol_4A7f',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    flair: 'YOLO',
    sentiment: 'BULLISH',
    ticker: 'GME',
    upvotes: 420,
    position: {
      ticker: 'GME',
      type: 'BUY',
      entryPrice: 18.5,
      currentPrice: 22.4,
      size: 1621,
      leverage: 5,
    },
    comments: [
      {
        id: 'c1',
        author: 'DiamondHands_99',
        avatarSeed: 'DiamondHands_99',
        content: 'This is the absolute peak degen behavior I came here for. Godspeed brother.',
        createdAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
        upvotes: 38
      },
      {
        id: 'c2',
        author: 'SirWendyManager',
        avatarSeed: 'SirWendyManager',
        content: 'Sir, this is a Wendy\'s drive-thru.',
        createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        upvotes: 89
      }
    ]
  },
  {
    id: 'post-2',
    title: 'DD: Why Solana is primed to hit $500 this cycle (A short analysis)',
    content: 'Let\'s look at the metrics. Transaction fees are sub-penny, active wallet addresses are hitting all-time highs, and the developer activity is outpacing every other layer 1 combined. Additionally, NFT marketplace volumes and memecoin launches are locking up massive amounts of SOL. When the retail wave hits, the supply shock will send SOL to $500 easily. NFA.',
    author: 'AlphaBrain_88',
    avatarSeed: 'AlphaBrain_88',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    flair: 'DD',
    sentiment: 'BULLISH',
    ticker: 'SOL',
    upvotes: 285,
    comments: [
      {
        id: 'c3',
        author: 'SolMaximum',
        avatarSeed: 'SolMaximum',
        content: 'Solid write-up. Also, the firehose of new launchpads is keeping demand super high.',
        createdAt: new Date(Date.now() - 3600000 * 4.5).toISOString(),
        upvotes: 19
      },
      {
        id: 'c4',
        author: 'BearGrizzly',
        avatarSeed: 'BearGrizzly',
        content: 'Too much bullishness. What about network congestion risks?',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        upvotes: -4
      }
    ]
  },
  {
    id: 'post-3',
    title: 'LOSS PORN: Leveraged BONK to the gills right before the dip. RIP my wallet.',
    content: 'Decided to play 20x leverage on BONK at the local top. Woke up to a notification that I got liquidated. Lost $12,500 in less than 3 hours. Please give me some upvotes so I can feel something again.',
    author: 'Liquidated_0x',
    avatarSeed: 'Liquidated_0x',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), // 8 hours ago
    flair: 'LOSS PORN',
    sentiment: 'BEARISH',
    ticker: 'BONK',
    upvotes: 680,
    position: {
      ticker: 'BONK',
      type: 'BUY',
      entryPrice: 0.000035,
      currentPrice: 0.000028,
      size: 357000000,
      leverage: 20
    },
    comments: [
      {
        id: 'c5',
        author: 'LossEnjoyer',
        avatarSeed: 'LossEnjoyer',
        content: 'Beautiful. The red color calms my soul. Thank you for your service.',
        createdAt: new Date(Date.now() - 3600000 * 7.5).toISOString(),
        upvotes: 112
      },
      {
        id: 'c6',
        author: 'DegenSol_4A7f',
        avatarSeed: 'DegenSol_4A7f',
        content: 'F. But also, leverage is a hell of a drug.',
        createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
        upvotes: 24
      }
    ]
  },
  {
    id: 'post-4',
    title: 'GAIN PORN: Hit a 15x on JUP long position! Up $18,400!',
    content: 'Saw the consolidation breakout at $1.10 and went full bull. Rode the wave to $1.35 and locked in profits. Easiest cash of my life. Spending it all on more Solana NFTs tonight.',
    author: 'JupKing_NFT',
    avatarSeed: 'JupKing_NFT',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
    flair: 'GAIN PORN',
    sentiment: 'BULLISH',
    ticker: 'JUP',
    upvotes: 352,
    position: {
      ticker: 'JUP',
      type: 'BUY',
      entryPrice: 1.10,
      currentPrice: 1.35,
      size: 15000,
      leverage: 5
    },
    comments: [
      {
        id: 'c7',
        author: 'PaperHandPussy',
        avatarSeed: 'PaperHandPussy',
        content: 'Nice exit! I sold mine at $1.15 like a coward.',
        createdAt: new Date(Date.now() - 3600000 * 11).toISOString(),
        upvotes: 14
      }
    ]
  }
];

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'chat-1',
    author: 'WhaleSol_9',
    avatarSeed: 'WhaleSol_9',
    content: 'GME printing today boys, hold the line!',
    createdAt: new Date(Date.now() - 300000).toISOString() // 5m ago
  },
  {
    id: 'chat-2',
    author: 'SolanaMax_00',
    avatarSeed: 'SolanaMax_00',
    content: 'Just bought another 10 SOL, let\'s goooo 🚀',
    createdAt: new Date(Date.now() - 240000).toISOString() // 4m ago
  },
  {
    id: 'chat-3',
    author: 'ShortSqueezeGuy',
    avatarSeed: 'ShortSqueezeGuy',
    content: 'Anyone watching $AMC? Volume is starting to spike!',
    createdAt: new Date(Date.now() - 180000).toISOString() // 3m ago
  },
  {
    id: 'chat-4',
    author: 'SolNoob',
    avatarSeed: 'SolNoob',
    content: 'Should I buy BONK now or is it too late?',
    createdAt: new Date(Date.now() - 120000).toISOString() // 2m ago
  },
  {
    id: 'chat-5',
    author: 'WendyEmployee_3',
    avatarSeed: 'WendyEmployee_3',
    content: 'Please stop shouting tickers in the drive-thru, you\'re holding up the line.',
    createdAt: new Date(Date.now() - 60000).toISOString() // 1m ago
  }
];

export const SIMULATED_CHAT_POOL = [
  'GME to $100 this week or I sell my kidney!',
  'Leverage is just a speedrun to bankruptcy 📉',
  'We like the stock! 💎🙌',
  'SOL gas fees are literally non-existent, love this network',
  'Who is holding BONK with diamond hands? 🐕',
  'My wife\'s boyfriend allowed me to buy 5 more shares of GME',
  'Is it time to short JUP? Looks overextended',
  'I am officially down 90% on my portfolio, AMA!',
  'Loss porn feed is looking absolutely delicious today',
  'AMC short squeeze incoming, load up!',
  'Buy high, sell low. This is the way.',
  'Just bridged another 5 ETH to Solana, gas is too cheap here',
  'To the moon! 🚀🚀🚀🚀🚀',
  'Can someone explain what DD stands for? Double Degen?',
  'Sir, this is a Wendy\'s, please pull forward.'
];

export const SIMULATED_POST_POOL = [
  {
    title: 'YOLO\'d my rent money on POPCAT 10x leverage',
    content: 'Landlord wants rent by Monday. I put the entire $1,800 on POPCAT long. If it goes up 10%, I pay my rent and buy a premium steak. If it goes down, I\'m sleeping on my friend\'s couch. Wish me luck!',
    author: 'CatLover_69',
    flair: 'YOLO',
    sentiment: 'BULLISH',
    ticker: 'POPCAT',
    position: {
      ticker: 'POPCAT',
      type: 'BUY',
      entryPrice: 1.45,
      currentPrice: 1.45,
      size: 1241,
      leverage: 10
    }
  },
  {
    title: 'DD: Why JUP is the most undervalued aggregator in DeFi',
    content: 'Jupiter is doing more volume than Uniswap on most days, yet its market cap is a fraction of UNI. With the active JUP DAO voting, constant launchpads, and the upcoming mobile app, JUP is an absolute steal at current prices. My target is $5 by end of year.',
    author: 'DeFi_Decker',
    flair: 'DD',
    sentiment: 'BULLISH',
    ticker: 'JUP'
  },
  {
    title: 'LOSS PORN: My $20k long position on BTC got wiped out in 2 minutes',
    content: 'Thought the support line at $92k would hold. Set up a 50x long. BTC dipped to $91,950 for a split second and liquidated my entire stack. I am literally crying in my car right now.',
    author: 'CryingInCar',
    flair: 'LOSS PORN',
    sentiment: 'BEARISH',
    ticker: 'BTC',
    position: {
      ticker: 'BTC',
      type: 'BUY',
      entryPrice: 92000,
      currentPrice: 91950,
      size: 0.217,
      leverage: 50
    }
  },
  {
    title: 'GAIN PORN: Turned $500 into $12,000 on a random dog coin',
    content: 'Woke up at 3 AM, saw a dog with a hat trending, and threw $500 at it. Sold the top 4 hours later. Meme season is officially back and we are printing money out of thin air!',
    author: 'MemeMillionaire',
    flair: 'GAIN PORN',
    sentiment: 'BULLISH',
    ticker: 'BONK',
    position: {
      ticker: 'BONK',
      type: 'BUY',
      entryPrice: 0.000022,
      currentPrice: 0.000528,
      size: 22700000,
    }
  },
  {
    title: 'Let\'s be honest: are we all just gambling here?',
    content: 'No charting, no technical analysis, no fundamentals. We just look at rockets and buy whatever ticker has the most emojis in the chat. Tell me I\'m wrong.',
    author: 'SelfAware_Degen',
    flair: 'DISCUSSION',
    sentiment: 'NEUTRAL'
  }
];

export const MOCK_BOT_AUTHORS = [
  'LossEnjoyer',
  'DiamondHands_99',
  'SolanaMax_00',
  'BearGrizzly',
  'DegenSol_4A7f',
  'JupKing_NFT',
  'CatLover_69',
  'DeFi_Decker',
  'MemeMillionaire',
  'StockSurfer',
  'CryptoCzar',
  'BullRun_2026',
  'WendyEmployee_3',
  'WhaleSol_9'
];
