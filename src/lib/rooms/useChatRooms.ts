"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { ChatMessage } from "@/components/features/sessions/mockData";
import { ChatRoom, RoomTimeRemaining } from "./types";
import { PRIMARY_TREASURY_WALLET } from "@/lib/treasuryParser";

const EXTENSION_COST_SOL = 0.0001; // Bare minimum 0.0001 SOL per 1-hour extension
const INITIAL_ROOM_DURATION_MINUTES = 10; // 10 minutes free virtual room

interface UseChatRoomsOptions {
  scope?: "sessions" | "prediction-market";
  contextId?: string;
  globalMessages?: ChatMessage[];
  onSendGlobalMessage?: (content: string) => void;
}

export function useChatRooms({
  scope = "sessions",
  contextId,
  globalMessages = [],
  onSendGlobalMessage,
}: UseChatRoomsOptions = {}) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const storageKey = `streetsync_chat_rooms_${scope}`;
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("global");
  const [now, setNow] = useState<number>(Date.now());
  const [isExtending, setIsExtending] = useState<boolean>(false);

  // Update clock every second for precise live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize rooms from storage or defaults
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: ChatRoom[] = JSON.parse(stored);
        setRooms(parsed);
      } else {
        setRooms([]);
      }
    } catch (e) {
      console.warn("Failed to load chat rooms from localStorage:", e);
      setRooms([]);
    }
  }, [storageKey]);

  // Save rooms to localStorage helper
  const saveRooms = useCallback(
    (newRooms: ChatRoom[]) => {
      setRooms(newRooms);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newRooms));
      } catch (e) {
        console.error("Failed to persist chat rooms:", e);
      }
    },
    [storageKey]
  );

  // Check URL query param for shared room (e.g. /sessions?room=room_xyz)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sharedRoomId = params.get("room");
    if (sharedRoomId && sharedRoomId !== "global") {
      setActiveRoomId(sharedRoomId);
    }
  }, []);

  // Compute Active Room object
  const activeRoom = useMemo<ChatRoom>(() => {
    if (activeRoomId === "global") {
      return {
        id: "global",
        name: "Global Wall",
        topic: "Main community stream",
        creator: "StreetSync",
        creatorShort: "System",
        createdAt: 0,
        durationMinutes: Infinity,
        expiresAt: Infinity,
        isGlobal: true,
        totalExtensions: 0,
        extensionCostSol: 0,
        messages: globalMessages,
        participantsCount: 142,
        scope,
      };
    }

    const found = rooms.find((r) => r.id === activeRoomId);
    if (found) return found;

    // Fallback if joined from URL before saved
    return {
      id: activeRoomId,
      name: `Room #${activeRoomId.substring(activeRoomId.length - 4).toUpperCase()}`,
      creator: "Friend",
      creatorShort: "Friend",
      createdAt: Date.now(),
      durationMinutes: INITIAL_ROOM_DURATION_MINUTES,
      expiresAt: Date.now() + INITIAL_ROOM_DURATION_MINUTES * 60 * 1000,
      totalExtensions: 0,
      extensionCostSol: EXTENSION_COST_SOL,
      messages: [
        {
          id: `welcome-${activeRoomId}`,
          author: "StreetSync_Bot",
          avatarSeed: "StreetSync_Bot",
          content: "Welcome to this shared virtual room! 10-Minute Free Session is active.",
          createdAt: new Date().toISOString(),
        },
      ],
      participantsCount: 2,
      scope,
    };
  }, [activeRoomId, rooms, globalMessages, scope]);

  // Calculate live time remaining for any room
  const getTimeRemaining = useCallback(
    (room: ChatRoom): RoomTimeRemaining => {
      if (room.isGlobal || !isFinite(room.expiresAt)) {
        return {
          totalSeconds: Infinity,
          minutes: Infinity,
          seconds: Infinity,
          formatted: "Unlimited",
          isExpired: false,
          isExpiringSoon: false,
          percentRemaining: 100,
        };
      }

      const diffMs = room.expiresAt - now;
      if (diffMs <= 0) {
        return {
          totalSeconds: 0,
          minutes: 0,
          seconds: 0,
          formatted: "00:00",
          isExpired: true,
          isExpiringSoon: false,
          percentRemaining: 0,
        };
      }

      const totalSec = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      // Total session duration in seconds for progress bar
      const totalSessionSeconds = (room.durationMinutes + room.totalExtensions * 60) * 60;
      const percent = Math.min(100, Math.max(0, (totalSec / (totalSessionSeconds || 600)) * 100));

      return {
        totalSeconds: totalSec,
        minutes: mins,
        seconds: secs,
        formatted,
        isExpired: false,
        isExpiringSoon: totalSec <= 120, // less than 2 minutes
        percentRemaining: percent,
      };
    },
    [now]
  );

  // Time remaining for active room
  const activeRoomTime = useMemo(() => {
    return getTimeRemaining(activeRoom);
  }, [getTimeRemaining, activeRoom]);

  // Create a new 10-minute virtual room
  const createRoom = useCallback(
    (name: string, topic?: string): ChatRoom => {
      const cleanName = name.trim() || `Alpha Room #${Math.floor(1000 + Math.random() * 9000)}`;
      const newId = `room-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const creatorAddr = publicKey ? publicKey.toString() : "Anonymous";
      const creatorShort = publicKey
        ? `${publicKey.toString().slice(0, 4)}..${publicKey.toString().slice(-4)}`
        : "You";

      const newRoom: ChatRoom = {
        id: newId,
        name: cleanName,
        topic: topic?.trim() || "Private Virtual Trading Room (10 min free)",
        creator: creatorAddr,
        creatorShort,
        createdAt: Date.now(),
        durationMinutes: INITIAL_ROOM_DURATION_MINUTES,
        expiresAt: Date.now() + INITIAL_ROOM_DURATION_MINUTES * 60 * 1000,
        totalExtensions: 0,
        extensionCostSol: EXTENSION_COST_SOL,
        participantsCount: 1,
        scope,
        contextId,
        messages: [
          {
            id: `sys-welcome-${newId}`,
            author: "StreetSync_Bot",
            avatarSeed: "StreetSync_Bot",
            content: `🎉 Room "${cleanName}" created! Share the QR code or link to invite your friends. This virtual room has 10 minutes of free live chat!`,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const updated = [newRoom, ...rooms];
      saveRooms(updated);
      setActiveRoomId(newId);
      toast.success(`Virtual Room "${cleanName}" created! (10 min free)`);
      return newRoom;
    },
    [publicKey, rooms, saveRooms, scope, contextId]
  );

  // Send message to current room
  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      if (activeRoomId === "global") {
        onSendGlobalMessage?.(trimmed);
        return;
      }

      // Check if room is expired
      if (activeRoomTime.isExpired) {
        toast.error("This virtual room has expired. Extend by 1 hour for 0.0001 SOL to continue chatting!");
        return;
      }

      const authorName = publicKey
        ? `User_${publicKey.toString().substring(0, 4).toUpperCase()}`
        : "You";

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        author: authorName,
        avatarSeed: authorName,
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      const updatedRooms = rooms.map((r) => {
        if (r.id === activeRoomId) {
          return {
            ...r,
            messages: [...r.messages, newMsg].slice(-100),
          };
        }
        return r;
      });

      saveRooms(updatedRooms);
    },
    [activeRoomId, activeRoomTime.isExpired, onSendGlobalMessage, publicKey, rooms, saveRooms]
  );

  // Extend room for +1 Hour (paying 0.0001 SOL on Solana)
  const extendRoom = useCallback(
    async (roomId: string, hours = 1): Promise<boolean> => {
      const targetRoom = rooms.find((r) => r.id === roomId);
      if (!targetRoom || targetRoom.isGlobal) return false;

      setIsExtending(true);
      const extensionMs = hours * 3600 * 1000; // 1 hour = 3600s
      let txSignature = "";

      try {
        if (publicKey && connection && sendTransaction) {
          const loadingToast = toast.loading(`Sending 0.0001 SOL extension fee on-chain...`);
          try {
            const lamports = Math.round(EXTENSION_COST_SOL * LAMPORTS_PER_SOL); // 100,000 lamports
            const transaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(PRIMARY_TREASURY_WALLET),
                lamports,
              })
            );

            const { blockhash } = await connection.getLatestBlockhash("confirmed");
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            txSignature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(txSignature, "confirmed");
            toast.dismiss(loadingToast);
            toast.success(`Payment confirmed! Room extended by ${hours} Hour(s).`);
          } catch (txErr: any) {
            toast.dismiss(loadingToast);
            console.warn("Wallet transaction declined or failed, applying sandbox extension:", txErr);
            toast.success(`⚡ Sandbox Mode: Room extended by ${hours} Hour!`);
          }
        } else {
          // Guest / Sandbox fallback
          toast.success(`⚡ Demo Mode: Room extended by ${hours} Hour! (Connect wallet for on-chain receipt)`);
        }

        // Calculate new expiry
        const baseTime = targetRoom.expiresAt > Date.now() ? targetRoom.expiresAt : Date.now();
        const newExpiry = baseTime + extensionMs;

        const systemAnnounce: ChatMessage = {
          id: `sys-ext-${Date.now()}`,
          author: "StreetSync_Bot",
          avatarSeed: "StreetSync_Bot",
          content: `⚡ Room extended by +${hours} Hour(s)! ${txSignature ? `(Tx: ${txSignature.substring(0, 8)}...)` : ""}`,
          createdAt: new Date().toISOString(),
        };

        const updated = rooms.map((r) => {
          if (r.id === roomId) {
            return {
              ...r,
              expiresAt: newExpiry,
              totalExtensions: r.totalExtensions + hours,
              messages: [...r.messages, systemAnnounce],
            };
          }
          return r;
        });

        saveRooms(updated);
        return true;
      } catch (err: any) {
        console.error("Room extension error:", err);
        toast.error(err?.message || "Failed to extend room");
        return false;
      } finally {
        setIsExtending(false);
      }
    },
    [connection, publicKey, rooms, saveRooms, sendTransaction]
  );

  // Generate shareable URL for a room
  const getShareUrl = useCallback((roomId: string): string => {
    if (typeof window === "undefined") return `https://streetsync-ss.com/sessions?room=${roomId}`;
    return `${window.location.origin}/sessions?room=${roomId}`;
  }, []);

  // Generate QR Code Data URL
  const getShareQrDataUrl = useCallback(
    async (roomId: string): Promise<string> => {
      const url = getShareUrl(roomId);
      try {
        const qr = await QRCode.toDataURL(url, {
          width: 280,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        });
        return qr;
      } catch (e) {
        console.error("QRCode generation error:", e);
        // Fallback to high-reliability QR API
        return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;
      }
    },
    [getShareUrl]
  );

  return {
    rooms,
    activeRoomId,
    activeRoom,
    activeRoomTime,
    isExtending,
    createRoom,
    extendRoom,
    switchRoom: setActiveRoomId,
    sendMessage,
    getTimeRemaining,
    getShareUrl,
    getShareQrDataUrl,
    EXTENSION_COST_SOL,
  };
}
