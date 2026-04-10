"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChatUI, type ChatMessage } from "@shared-ui";

import { incidentWsUrl } from "@/lib/api";
import { findAcceptedAlert } from "@/lib/alerts";
import { getResponderAuth } from "@/lib/auth";

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function IncidentCollaborationPage() {
  const router = useRouter();
  const params = useParams<{ incidentId: string }>();
  const incidentId = params.incidentId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [callState, setCallState] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const auth = useMemo(() => getResponderAuth(), []);
  const incident = useMemo(() => findAcceptedAlert(incidentId), [incidentId]);

  useEffect(() => {
    if (!auth) {
      router.replace("/login");
      return;
    }

    if (!incident) {
      return;
    }

    const ws = new WebSocket(incidentWsUrl(incidentId, auth.responder.id, auth.token));
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setMessages((previous) => [
        ...previous,
        {
          id: createId(),
          sender: "system",
          text: "Incident chat connected.",
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

        const sender = payload.sender?.startsWith("user:")
          ? "user"
          : payload.sender?.startsWith("responder:")
            ? "responder"
            : "system";

        setMessages((previous) => [
          ...previous,
          {
            id: createId(),
            sender,
            text: payload.message,
          },
        ]);
      } catch {
        // ignore malformed payload
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [auth, incident, incidentId, router]);

  const handleSend = useCallback(async (text: string) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("Socket not connected");
    }

    ws.send(
      JSON.stringify({
        message: text,
      })
    );
  }, []);

  if (!auth || !incident) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 rounded-3xl bg-white/80 p-6 shadow-soft">
        <p className="text-sm text-[#655b81]">Incident data unavailable. Open from alert screen again.</p>
        <Link href="/dashboard" className="inline-flex rounded-xl bg-[#f1e4d8] px-3 py-2 text-sm text-[#5f4d41]">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const mapsUrl = incident.location
    ? `https://www.google.com/maps?q=${incident.location.lat},${incident.location.lng}`
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <header className="rounded-3xl bg-white/80 p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold capitalize text-[#3f3558]">{incident.type} Incident</h1>
            <p className="text-sm text-[#675d84]">Severity: {incident.severity}</p>
            <p className="text-xs text-[#746b8d]">Chat: {connected ? "Connected" : "Disconnected"}</p>
          </div>
          <button
            onClick={() => setCallState("Mock call placed to user.")}
            className="h-10 rounded-xl bg-[#BDA6CE] px-4 text-sm font-medium text-[#3e3459]"
          >
            Call User (Mock)
          </button>
        </div>

        {callState ? <p className="mt-2 text-sm text-[#5c4f78]">{callState}</p> : null}

        <div className="mt-4 rounded-2xl bg-[#f3f7f8] p-3 text-sm text-[#34505b]">
          <p>Live Location View</p>
          {incident.location ? (
            <>
              <p>
                {incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}
              </p>
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-[#4f436f] underline">
                  Open in maps
                </a>
              ) : null}
            </>
          ) : (
            <p>Location unavailable.</p>
          )}
        </div>
      </header>

      <ChatUI
        title="User <-> Responder Chat"
        subtitle="Coordinate response and guide user safely"
        messages={messages}
        typing={false}
        onSend={handleSend}
        disabled={!connected}
      />
    </div>
  );
}
