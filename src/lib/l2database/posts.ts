import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  increment,
  arrayUnion,
  query,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { Post, BoardComment, Position } from "@/components/features/sessions/mockData";

export const POSTS_COLLECTION = "sessions_posts";

export interface CreatePostInput {
  title: string;
  content: string;
  author: string;
  avatarSeed: string;
  flair: "YOLO" | "DD" | "LOSS PORN" | "GAIN PORN" | "MEME" | "DISCUSSION";
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  ticker?: string;
  position?: Position;
  walletAddress?: string;
}

/**
 * Creates and writes a new post to the Firestore `sessions_posts` collection.
 */
export async function addPostToFirestore(input: CreatePostInput): Promise<string> {
  const postsRef = collection(db, POSTS_COLLECTION);
  const now = new Date().toISOString();

  try {
    const newDoc = await addDoc(postsRef, {
      title: input.title,
      content: input.content,
      author: input.author,
      avatarSeed: input.avatarSeed || input.author,
      flair: input.flair,
      sentiment: input.sentiment,
      ticker: input.ticker || null,
      position: input.position || null,
      walletAddress: input.walletAddress || null,
      upvotes: 1, // Start with self-upvote
      comments: [],
      createdAt: now,
      serverTimestamp: serverTimestamp(),
    });

    return newDoc.id;
  } catch (error) {
    console.warn("[Firestore Posts] addPostToFirestore fallback note:", error);
    return `post-local-${Date.now()}`;
  }
}

/**
 * Seeds the Firestore `sessions_posts` collection with initial mock posts if empty.
 * Guarantees that fresh Firestore instances or initial demos are immediately populated.
 */
export async function seedFirestorePostsIfEmpty(initialPosts: Post[]): Promise<boolean> {
  if (!initialPosts || initialPosts.length === 0) return false;

  const postsRef = collection(db, POSTS_COLLECTION);
  try {
    const existingSnap = await getDocs(query(postsRef, limit(1)));
    if (!existingSnap.empty) {
      return false; // Already populated
    }

    // Populate with initial posts preserving custom IDs
    const seedPromises = initialPosts.map((post) => {
      const docRef = doc(db, POSTS_COLLECTION, post.id);
      return setDoc(docRef, {
        title: post.title,
        content: post.content,
        author: post.author,
        avatarSeed: post.avatarSeed,
        flair: post.flair,
        sentiment: post.sentiment,
        ticker: post.ticker || null,
        position: post.position || null,
        upvotes: post.upvotes || 0,
        comments: post.comments || [],
        createdAt: post.createdAt,
        serverTimestamp: serverTimestamp(),
      });
    });

    await Promise.all(seedPromises);
    return true;
  } catch (err) {
    console.warn("[Firestore Posts] seedFirestorePostsIfEmpty fallback note:", err);
    return false;
  }
}

/**
 * Subscribes to real-time posts from Firestore collection using `onSnapshot`.
 * Automatically orders posts by creation timestamp descending.
 * Preserves initial fallback mock data when starting or if offline.
 */
export function subscribeToFirestorePosts(
  onPostsUpdate: (posts: Post[]) => void,
  maxPosts: number = 60,
  fallbackMockPosts: Post[] = []
): Unsubscribe {
  const postsRef = collection(db, POSTS_COLLECTION);
  const q = query(postsRef, orderBy("createdAt", "desc"), limit(maxPosts));

  // Immediately emit fallback mock posts so UI is never blank
  if (fallbackMockPosts.length > 0) {
    onPostsUpdate(fallbackMockPosts);
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        if (fallbackMockPosts.length > 0) {
          onPostsUpdate(fallbackMockPosts);
          // Auto-seed Firestore in background for demo persistence
          seedFirestorePostsIfEmpty(fallbackMockPosts).catch(() => {});
        } else {
          onPostsUpdate([]);
        }
        return;
      }

      const posts: Post[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "",
          content: data.content || "",
          author: data.author || "Anonymous",
          avatarSeed: data.avatarSeed || data.author || "user",
          createdAt: data.createdAt || new Date().toISOString(),
          flair: data.flair || "DISCUSSION",
          sentiment: data.sentiment || "NEUTRAL",
          ticker: data.ticker || undefined,
          upvotes: typeof data.upvotes === "number" ? data.upvotes : 0,
          position: data.position || undefined,
          comments: Array.isArray(data.comments) ? data.comments : [],
        };
      });

      onPostsUpdate(posts);
    },
    (error) => {
      console.warn("[Firestore Posts] onSnapshot note:", error);
      if (fallbackMockPosts.length > 0) {
        onPostsUpdate(fallbackMockPosts);
      }
    }
  );

  return unsubscribe;
}

/**
 * Upvotes or downvotes a post in Firestore atomically.
 */
export async function voteFirestorePost(postId: string, delta: number): Promise<void> {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(postRef, {
      upvotes: increment(delta),
    });
  } catch (error) {
    console.warn(`[Firestore Posts] voteFirestorePost note for post ${postId}:`, error);
  }
}

/**
 * Adds a comment to a post in Firestore.
 */
export async function addCommentToFirestorePost(
  postId: string,
  comment: {
    author: string;
    avatarSeed: string;
    content: string;
  }
): Promise<void> {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const newComment: BoardComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      author: comment.author,
      avatarSeed: comment.avatarSeed,
      content: comment.content,
      createdAt: new Date().toISOString(),
      upvotes: 0,
    };

    await updateDoc(postRef, {
      comments: arrayUnion(newComment),
    });
  } catch (error) {
    console.warn(`[Firestore Posts] addCommentToFirestorePost note for post ${postId}:`, error);
  }
}
