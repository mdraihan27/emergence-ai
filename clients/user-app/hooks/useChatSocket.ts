"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessage } from "@shared-ui";
import { BACKEND_WS_BASE } from "@/lib/api";

type TriagePayload = {
  type: string;
  severity: number;
  response_bn: string;
  should_escalate: boolean;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useChatSocket(sessionId: string | null, category: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);

  const wsUrl = useMemo(() => {
    if (!sessionId) {
      return null;
    }
    return `${BACKEND_WS_BASE}/ws/chat/${sessionId}`;
  }, [sessionId]);

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          event?: string;
          detail?: string;
          triage?: TriagePayload;
        };

        if (payload.event === "connected") {
          setMessages((previous) => [
            ...previous,
            {
              id: createId(),
              sender: "system",
              text: "চ্যাট সংযোগ সম্পন্ন হয়েছে।",
            },
          ]);
          return;
        }

        if (payload.event === "ai_response" && payload.triage) {
          setMessages((previous) => [
            ...previous,
            {
              id: createId(),
              sender: "ai",
              text: payload.triage.response_bn,
            },
          ]);
          setTyping(false);
          return;
        }

        if (payload.event === "escalation") {
          setMessages((previous) => [
            ...previous,
            {
              id: createId(),
              sender: "system",
              text: "উচ্চ ঝুঁকি শনাক্ত হয়েছে, রেসপন্ডারদের কাছে অ্যালার্ট পাঠানো হয়েছে।",
            },
          ]);
          return;
        }

        if (payload.event === "error") {
          setTyping(false);
          setMessages((previous) => [
            ...previous,
            {
              id: createId(),
              sender: "system",
              text: payload.detail ?? "কোনও ত্রুটি হয়েছে।",
            },
          ]);
        }
      } catch {
        setTyping(false);
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = () => {
      setConnected(false);
      setTyping(false);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [wsUrl]);

  const sendMessage = useCallback(
    async (text: string) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected");
      }

      const cleanText = text.trim();
      if (!cleanText) {
        return;
      }

      setMessages((previous) => [
        ...previous,
        {
          id: createId(),
          sender: "user",
          text: cleanText,
        },
      ]);
      setTyping(true);

      socket.send(
        JSON.stringify({
          message: cleanText,
          category,
        })
      );
    },
    [category]
  );

  return {
    messages,
    typing,
    connected,
    sendMessage,
  };
}
