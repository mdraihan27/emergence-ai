import type { IncidentAlert } from "@/lib/api";

const PENDING_ALERTS_STORAGE_KEY = "ers_pending_alerts";
const ACCEPTED_ALERTS_STORAGE_KEY = "ers_accepted_alerts";

function readArray(key: string): IncidentAlert[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as IncidentAlert[];
  } catch {
    return [];
  }
}

function writeArray(key: string, value: IncidentAlert[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getPendingAlerts(): IncidentAlert[] {
  return readArray(PENDING_ALERTS_STORAGE_KEY);
}

export function getAcceptedAlerts(): IncidentAlert[] {
  return readArray(ACCEPTED_ALERTS_STORAGE_KEY);
}

export function addPendingAlert(alert: IncidentAlert): IncidentAlert[] {
  const current = getPendingAlerts();
  const withoutDuplicate = current.filter((item) => item.id !== alert.id);
  const updated = [alert, ...withoutDuplicate];
  writeArray(PENDING_ALERTS_STORAGE_KEY, updated);
  return updated;
}

export function rejectAlert(alertId: string): IncidentAlert[] {
  const current = getPendingAlerts();
  const updated = current.filter((item) => item.id !== alertId);
  writeArray(PENDING_ALERTS_STORAGE_KEY, updated);
  return updated;
}

export function acceptAlert(alertId: string): { pending: IncidentAlert[]; accepted: IncidentAlert[] } {
  const pending = getPendingAlerts();
  const alert = pending.find((item) => item.id === alertId);

  const newPending = pending.filter((item) => item.id !== alertId);
  writeArray(PENDING_ALERTS_STORAGE_KEY, newPending);

  if (!alert) {
    return { pending: newPending, accepted: getAcceptedAlerts() };
  }

  const accepted = getAcceptedAlerts();
  const updatedAccepted = [alert, ...accepted.filter((item) => item.id !== alert.id)];
  writeArray(ACCEPTED_ALERTS_STORAGE_KEY, updatedAccepted);

  return { pending: newPending, accepted: updatedAccepted };
}

export function findPendingAlert(alertId: string): IncidentAlert | null {
  return getPendingAlerts().find((item) => item.id === alertId) ?? null;
}

export function findAcceptedAlert(alertId: string): IncidentAlert | null {
  return getAcceptedAlerts().find((item) => item.id === alertId) ?? null;
}
