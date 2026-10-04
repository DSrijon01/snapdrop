import {
  ref,
  push,
  set,
  get,
  update,
  query,
  limitToLast,
  onValue,
  Unsubscribe,
} from "firebase/database";
import { database } from "./config";

export interface FirebaseChatMessage {
  id: string;
  author: string;
  avatarSeed: string;
  content: string;
  createdAt: string; // ISO string for UI compatibility
  timestamp?: number;
  walletAddress?: string;
  roomId: string;
}

/**
 * Pushes a new chat message to Firebase Realtime Database at `/chats/{roomId}`.
 * Works seamlessly with "# Global Wall" (roomId = 'global') and Virtual Rooms (roomId = 'room-xxx').
 */
export async function pushChatMessage(
  roomId: string,
  message: {
    author: string;
    avatarSeed: string;
    content: string;
    walletAddress?: string;
  }
): Promise<string> {
  const safeRoomId = roomId ? roomId.replace(/[^a-zA-Z0-9_-]/g, "_") : "global";
  const chatRef = ref(database, `chats/${safeRoomId}`);
  const newMessageRef = push(chatRef);

  const payload = {
    author: message.author,
    avatarSeed: message.avatarSeed,
    content: message.content,
    walletAddress: message.walletAddress || null,
    roomId: safeRoomId,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
  };

  try {
    await set(newMessageRef, payload);
    return newMessageRef.key || `chat-${Date.now()}`;
  } catch (error) {
    console.warn(`[RTDB Chat] pushChatMessage note for room ${safeRoomId}:`, error);
    return `local-${Date.now()}`;
  }
}

/**
 * Seeds a chat room with initial mock data if it does not have any messages yet in Firebase.
 * Ensures that whenever a new demo instance or fresh room starts, it is populated with lively messages.
 */
export async function seedRoomWithInitialData(
  roomId: string,
  initialMessages: { author: string; avatarSeed: string; content: string; createdAt?: string }[]
): Promise<boolean> {
  const safeRoomId = roomId ? roomId.replace(/[^a-zA-Z0-9_-]/g, "_") : "global";
  const chatRef = ref(database, `chats/${safeRoomId}`);

  try {
    const snapshot = await get(chatRef);
    if (snapshot.exists()) {
      return false; // Already populated
    }

    const updates: Record<string, any> = {};
    const now = Date.now();
    initialMessages.forEach((msg, idx) => {
      const msgKey = `init_${idx}_${now}`;
      const msgTimestamp = now - (initialMessages.length - idx) * 60000;
      updates[msgKey] = {
        author: msg.author,
        avatarSeed: msg.avatarSeed || msg.author,
        content: msg.content,
        walletAddress: null,
        roomId: safeRoomId,
        timestamp: msgTimestamp,
        createdAt: msg.createdAt || new Date(msgTimestamp).toISOString(),
      };
    });

    await update(chatRef, updates);
    return true;
  } catch (err) {
    console.warn(`[RTDB Chat] seedRoomWithInitialData fallback on room ${safeRoomId}:`, err);
    return false;
  }
}

/**
 * Subscribes to real-time chat messages for a specific room.
 * Invokes the callback with an updated array of messages whenever new messages arrive.
 * If the database is initially empty or offline, seamlessly preserves fallback mock messages.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToRoomMessages(
  roomId: string,
  onMessagesUpdate: (messages: FirebaseChatMessage[]) => void,
  maxLimit: number = 60,
  fallbackMockMessages: FirebaseChatMessage[] = []
): Unsubscribe {
  const safeRoomId = roomId ? roomId.replace(/[^a-zA-Z0-9_-]/g, "_") : "global";
  const chatRef = ref(database, `chats/${safeRoomId}`);
  const chatQuery = query(chatRef, limitToLast(maxLimit));

  // If initial fallback messages exist, emit them immediately so the UI is never blank
  if (fallbackMockMessages.length > 0) {
    onMessagesUpdate(fallbackMockMessages);
  }

  const unsubscribe = onValue(
    chatQuery,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        // If room is empty in database, keep or seed fallback mock data
        if (fallbackMockMessages.length > 0) {
          onMessagesUpdate(fallbackMockMessages);
          // Auto-seed in background for demo persistence
          seedRoomWithInitialData(safeRoomId, fallbackMockMessages).catch(() => {});
        } else {
          onMessagesUpdate([]);
        }
        return;
      }

      // Convert keyed object map to sorted array
      const messagesArray: FirebaseChatMessage[] = Object.entries(data).map(
        ([key, val]: [string, any]) => ({
          id: key,
          author: val.author || "Anonymous",
          avatarSeed: val.avatarSeed || val.author || "user",
          content: val.content || "",
          createdAt: val.createdAt || new Date(val.timestamp || Date.now()).toISOString(),
          timestamp: val.timestamp || Date.now(),
          walletAddress: val.walletAddress || undefined,
          roomId: val.roomId || safeRoomId,
        })
      );

      // Sort chronologically ascending
      messagesArray.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      });

      onMessagesUpdate(messagesArray);
    },
    (error) => {
      console.warn(`[RTDB Chat] Realtime Database onValue note on room ${safeRoomId}:`, error);
      if (fallbackMockMessages.length > 0) {
        onMessagesUpdate(fallbackMockMessages);
      }
    }
  );

  return unsubscribe;
}
