"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChatUI, type ChatMessage } from "@shared-ui";

import { BACKEND_WS_BASE } from "@/lib/api";
import { useSessionId } from "@/hooks/useSessionId";

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type IncidentCache = {
  id: string;
  severity?: number;
  assigned_responders?: Array<{
    responder_id: string;
    responder_name?: string;
    responder_type?: string;
    distance_km?: number;
  }>;
};

export default function UserIncidentChatPage() {
  const params = useParams<{ incidentId: string }>();
  const incidentId = params.incidentId;

  const { sessionId, loading } = useSessionId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const incident = useMemo(() => {
    if (typeof globalThis === "undefined") {
      return null;
    }

    const raw = globalThis.localStorage.getItem(`ers_user_incident_${incidentId}`);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as IncidentCache;
    } catch {
      return null;
    }
  }, [incidentId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const ws = new WebSocket(`${BACKEND_WS_BASE}/ws/incident/${incidentId}/user/${sessionId}`);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setMessages((previous) => [
        ...previous,
        {
          id: createId(),
          sender: "system",
          text: "Connected to incident room. A responder can now chat with you.",
        },
      ]);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          event?: string;
          sender?: string;
          message?: string;
        };

        if (payload.event !== "incident_chat" || !payload.message) {
          return;
        }

        let sender: ChatMessage["sender"] = "system";
        if (payload.sender?.startsWith("responder:")) {
          sender = "responder";
        } else if (payload.sender?.startsWith("user:")) {
          sender = "user";
        }

        setMessages((previous) => [
          ...previous,
          {
            id: createId(),
            sender,
            text: payload.message,
          },
        ]);
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [incidentId, sessionId]);

  const handleSend = useCallback(async (text: string) => {
    const ws = socketRef.current;
    if (ws?.readyState !== WebSocket.OPEN) {
      throw new Error("Socket not connected");
    }

    ws.send(JSON.stringify({ message: text }));
  }, []);

  if (loading || !sessionId) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-white/80 p-6 text-sm text-[#655b81] shadow-soft">
        Preparing incident connection...
      </div>
    );
  }

  const responderCount = incident?.assigned_responders?.length ?? 0;
  const primaryResponder = incident?.assigned_responders?.[0];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <header className="rounded-3xl bg-white/80 p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-[#3f3558]">Emergency Responder Chat</h1>
        <p className="text-sm text-[#675d84]">Incident ID: {incidentId}</p>
        <p className="mt-1 text-xs text-[#746b8d]">Chat: {connected ? "Connected" : "Connecting..."}</p>
        <p className="mt-2 text-sm text-[#5f547a]">
          {responderCount > 0
            ? `${responderCount} nearby responder(s) notified.`
            : "Nearby responders have been notified and will join shortly."}
        </p>
        {primaryResponder && (
          <p className="mt-1 text-xs text-[#746b8d]">
            Priority handoff: {primaryResponder.responder_name ?? "Responder"}
            {typeof primaryResponder.distance_km === "number"
              ? ` (${primaryResponder.distance_km.toFixed(1)} km away)`
              : ""}
          </p>
        )}
        <Link href="/" className="mt-3 inline-flex rounded-xl bg-[#f1e4d8] px-3 py-2 text-sm text-[#5f4d41]">
          Back to Home
        </Link>
      </header>

      <ChatUI
        title="User <-> Responder Live Chat"
        subtitle="Share symptoms, location updates, and safety status"
        messages={messages}
        typing={false}
        onSend={handleSend}
        disabled={!connected}
      />
    </div>
  );
}
