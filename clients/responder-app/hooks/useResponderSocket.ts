"use client";

import { useEffect, useRef, useState } from "react";

import type { IncidentAlert } from "@/lib/api";
import { responderWsUrl } from "@/lib/api";

type UseResponderSocketArgs = {
  responderId: string | null;
  token: string | null;
  onIncident: (incident: IncidentAlert) => void;
};

export function useResponderSocket({ responderId, token, onIncident }: UseResponderSocketArgs) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!responderId || !token) {
      return;
    }

    const ws = new WebSocket(responderWsUrl(responderId, token));
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
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
          incident?: IncidentAlert;
        };

        if (payload.event === "incident_alert" && payload.incident) {
          onIncident(payload.incident);

          if (typeof Notification !== "undefined") {
            if (Notification.permission === "granted") {
              new Notification("New Emergency Alert", {
                body: `${payload.incident.type.toUpperCase()} | Severity ${payload.incident.severity}`,
              });
            } else if (Notification.permission === "default") {
              Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                  new Notification("New Emergency Alert", {
                    body: `${payload.incident?.type.toUpperCase()} | Severity ${payload.incident?.severity}`,
                  });
                }
              });
            }
          }
        }
      } catch {
        // ignore malformed websocket payloads
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [onIncident, responderId, token]);

  return { connected };
}
