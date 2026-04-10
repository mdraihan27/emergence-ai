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

type EscalationIncident = {
  id: string;
  severity?: number;
  status?: string;
  assigned_responders?: Array<{
    responder_id: string;
    responder_name?: string;
    responder_type?: string;
  }>;
};

type EscalationPayload = {
  event?: string;
  detail?: string;
  triage?: TriagePayload;
  incident?: EscalationIncident;
  call_999?: boolean;
  connect_to_responder_chat?: boolean;
  assigned_responder?: {
    responder_id: string;
    responder_name?: string;
    responder_type?: string;
    distance_km?: number;
  };
};

type UseChatSocketOptions = {
  onEscalation?: (incident: EscalationIncident) => void;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useChatSocket(
  sessionId: string | null,
  category: string,
  options?: UseChatSocketOptions
) {
  const socketRef = useRef<WebSocket | null>(null);
  const onEscalationRef = useRef<UseChatSocketOptions["onEscalation"]>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onEscalationRef.current = options?.onEscalation;
  }, [options?.onEscalation]);

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
        const payload = JSON.parse(event.data) as EscalationPayload;

        if (payload.event === "connected") {
          setMessages((previous) => [
            ...previous,
            {
              id: createId(),
              sender: "system",
              text: "Chat connection established.",
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
          setTyping(false);
          const responderName = payload.assigned_responder?.responder_name;
          let escalationText = "High risk detected. You are being connected to nearby responders now.";
          if (payload.call_999) {
            escalationText = responderName
              ? `999 escalation triggered. Connecting you with nearby responder ${responderName}.`
              : "999 escalation triggered. Connecting you with a nearby available responder now.";
          }

          setMessages((previous) => [
            ...previous,
            {
              id: createId(),
              sender: "system",
              text: escalationText,
            },
          ]);
          if (payload.incident) {
            onEscalationRef.current?.(payload.incident);
          }
          return;
        }

        if (payload.event === "error") {
          setTyping(false);
          setMessages((previous) => [
            ...previous,
            {
              id: createId(),
              sender: "system",
              text: payload.detail ?? "An error occurred.",
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
      if (socket?.readyState !== WebSocket.OPEN) {
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
