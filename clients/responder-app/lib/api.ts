export const BACKEND_HTTP_BASE =
  process.env.NEXT_PUBLIC_BACKEND_HTTP ?? "http://localhost:8000";
export const BACKEND_WS_BASE = process.env.NEXT_PUBLIC_BACKEND_WS ?? "ws://localhost:8000";

export type Responder = {
  id: string;
  name: string;
  type: "police" | "medical" | "fire" | "volunteer";
  phone: string;
  location: {
    lat: number;
    lng: number;
  };
  is_available: boolean;
  created_at: string;
};

export type ResponderLoginResponse = {
  access_token: string;
  token_type: string;
  responder: Responder;
};

export type IncidentAlert = {
  id: string;
  type: string;
  severity: number;
  status: string;
  session_id?: string;
  location?: {
    lat: number;
    lng: number;
  };
  manual_location?: string;
  created_at?: string;
};

export async function loginResponder(id: string, otp: string): Promise<ResponderLoginResponse> {
  const response = await fetch(`${BACKEND_HTTP_BASE}/responder/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, otp }),
  });

  if (!response.ok) {
    throw new Error("Responder login failed");
  }

  return response.json();
}

export async function toggleAvailability(token: string, isAvailable: boolean): Promise<Responder> {
  const response = await fetch(`${BACKEND_HTTP_BASE}/responder/availability`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ is_available: isAvailable }),
  });

  if (!response.ok) {
    throw new Error("Availability update failed");
  }

  return response.json();
}

export function responderWsUrl(responderId: string, token: string): string {
  const query = new URLSearchParams({ token });
  return `${BACKEND_WS_BASE}/ws/responder/${responderId}?${query.toString()}`;
}

export function incidentWsUrl(incidentId: string, responderId: string, token: string): string {
  const query = new URLSearchParams({ token });
  return `${BACKEND_WS_BASE}/ws/incident/${incidentId}/responder/${responderId}?${query.toString()}`;
}
