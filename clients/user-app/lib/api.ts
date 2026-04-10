export const BACKEND_HTTP_BASE =
  process.env.NEXT_PUBLIC_BACKEND_HTTP ?? "http://localhost:8000";
export const BACKEND_WS_BASE = process.env.NEXT_PUBLIC_BACKEND_WS ?? "ws://localhost:8000";

export type EmergencyType = "crime" | "medical" | "fire" | "other";

export type SessionResponse = {
  session_id: string;
  created_at: string;
};

export type SosPayload = {
  type: EmergencyType;
  location: {
    lat: number;
    lng: number;
  };
  manual_location?: string;
  session_id?: string;
};

export type IncidentAssignment = {
  responder_id: string;
  responder_type: string;
  responder_name: string;
  distance_km: number;
  score: number;
};

export type IncidentResponse = {
  id: string;
  type: EmergencyType;
  session_id?: string;
  location: {
    lat: number;
    lng: number;
  };
  manual_location?: string;
  severity: number;
  status: string;
  source: string;
  assigned_responders: IncidentAssignment[];
  created_at: string;
};

export async function createSession(): Promise<SessionResponse> {
  const response = await fetch(`${BACKEND_HTTP_BASE}/api/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Session creation failed");
  }

  return response.json();
}

export async function getSession(sessionId: string): Promise<SessionResponse | null> {
  const response = await fetch(`${BACKEND_HTTP_BASE}/api/session/${sessionId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Session lookup failed");
  }

  return response.json();
}

export async function sendSos(payload: SosPayload): Promise<IncidentResponse> {
  const response = await fetch(`${BACKEND_HTTP_BASE}/api/sos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "SOS request failed");
  }

  return response.json();
}

export type TranscribeResponse = {
  text: string;
  triage: {
    type: string;
    severity: number;
    response_bn: string;
    should_escalate: boolean;
  };
};

export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "voice.webm");

  const response = await fetch(`${BACKEND_HTTP_BASE}/api/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Audio transcription failed");
  }

  return response.json();
}
