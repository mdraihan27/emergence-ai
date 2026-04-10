import type { Responder } from "@/lib/api";

const AUTH_STORAGE_KEY = "ers_responder_auth";

export type ResponderAuth = {
  token: string;
  responder: Responder;
};

export function getResponderAuth(): ResponderAuth | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ResponderAuth;
  } catch {
    return null;
  }
}

export function setResponderAuth(auth: ResponderAuth): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearResponderAuth(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
