import {
  collection,
  addDoc,
  doc,
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
    upvotes: 0,
    comments: [],
    createdAt: now,
    serverTimestamp: serverTimestamp(),
  });

  return newDoc.id;
}

/**
 * Subscribes to real-time posts from Firestore collection using `onSnapshot`.
 * Automatically orders posts by creation timestamp descending.
 */
export function subscribeToFirestorePosts(
  onPostsUpdate: (posts: Post[]) => void,
  maxPosts: number = 60
): Unsubscribe {
  const postsRef = collection(db, POSTS_COLLECTION);
  const q = query(postsRef, orderBy("createdAt", "desc"), limit(maxPosts));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onPostsUpdate([]);
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
      console.warn("[Firestore Posts] onSnapshot warning:", error);
    }
  );

  return unsubscribe;
}

/**
 * Upvotes or downvotes a post in Firestore atomically.
 */
export async function voteFirestorePost(postId: string, delta: number): Promise<void> {
  const postRef = doc(db, POSTS_COLLECTION, postId);
  await updateDoc(postRef, {
    upvotes: increment(delta),
  });
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
}
