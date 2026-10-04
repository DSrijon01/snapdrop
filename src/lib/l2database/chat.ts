import {
  ref,
  push,
  set,
  query,
  limitToLast,
  onValue,
  Unsubscribe,
  serverTimestamp,
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

  await set(newMessageRef, payload);
  return newMessageRef.key || `chat-${Date.now()}`;
}

/**
 * Subscribes to real-time chat messages for a specific room.
 * Invokes the callback with an updated array of messages whenever new messages arrive.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToRoomMessages(
  roomId: string,
  onMessagesUpdate: (messages: FirebaseChatMessage[]) => void,
  maxLimit: number = 60
): Unsubscribe {
  const safeRoomId = roomId ? roomId.replace(/[^a-zA-Z0-9_-]/g, "_") : "global";
  const chatRef = ref(database, `chats/${safeRoomId}`);
  const chatQuery = query(chatRef, limitToLast(maxLimit));

  const unsubscribe = onValue(
    chatQuery,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onMessagesUpdate([]);
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
      console.warn(`[RTDB Chat] Realtime Database error on room ${safeRoomId}:`, error);
    }
  );

  return unsubscribe;
}
