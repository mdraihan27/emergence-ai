"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCard } from "@shared-ui";

import type { IncidentAlert } from "@/lib/api";
import { toggleAvailability } from "@/lib/api";
import { acceptAlert, addPendingAlert, getPendingAlerts, rejectAlert } from "@/lib/alerts";
import { clearResponderAuth, getResponderAuth, setResponderAuth, type ResponderAuth } from "@/lib/auth";
import { useResponderSocket } from "@/hooks/useResponderSocket";

export default function DashboardPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<ResponderAuth | null>(null);
  const [alerts, setAlerts] = useState<IncidentAlert[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = getResponderAuth();
    if (!session) {
      router.replace("/login");
      return;
    }

    setAuth(session);
    setAlerts(getPendingAlerts());
    setLoadingAuth(false);
  }, [router]);

  const onIncident = useCallback((incident: IncidentAlert) => {
    const updated = addPendingAlert(incident);
    setAlerts(updated);
  }, []);

  const { connected } = useResponderSocket({
    responderId: auth?.responder.id ?? null,
    token: auth?.token ?? null,
    onIncident,
  });

  const handleToggleAvailability = async () => {
    if (!auth) {
      return;
    }

    setBusy(true);
    try {
      const updatedResponder = await toggleAvailability(auth.token, !auth.responder.is_available);
      const updatedAuth: ResponderAuth = {
        ...auth,
        responder: updatedResponder,
      };
      setAuth(updatedAuth);
      setResponderAuth(updatedAuth);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = (incident: IncidentAlert) => {
    const updated = rejectAlert(incident.id);
    setAlerts(updated);
  };

  const handleAccept = (incident: IncidentAlert) => {
    const updated = acceptAlert(incident.id);
    setAlerts(updated.pending);
    router.push(`/incidents/${incident.id}`);
  };

  const logout = () => {
    clearResponderAuth();
    router.push("/login");
  };

  if (loadingAuth || !auth) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-white/80 p-6 text-sm text-[#5f557a] shadow-soft">
        Session loading...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <header className="rounded-3xl bg-white/80 p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#3f3558]">Responder Dashboard</h1>
            <p className="text-sm text-[#675d84]">
              {auth.responder.name} ({auth.responder.type})
            </p>
            <p className="mt-1 text-xs text-[#736a8c]">WebSocket: {connected ? "Connected" : "Disconnected"}</p>
          </div>
          <button onClick={logout} className="rounded-xl bg-[#f1e4d8] px-3 py-2 text-sm text-[#5f4d41]">
            Logout
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggleAvailability}
            disabled={busy}
            className={`h-11 rounded-xl px-4 text-sm font-semibold ${
              auth.responder.is_available
                ? "bg-[#B4D3D9] text-[#234955]"
                : "bg-[#BDA6CE] text-[#3b3157]"
            } disabled:opacity-60`}
          >
            {auth.responder.is_available ? "Available" : "Unavailable"}
          </button>
          <span className="text-xs text-[#6d6388]">Incoming alerts: {alerts.length}</span>
        </div>
      </header>

      <section className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-2xl bg-white/70 p-4 text-sm text-[#6d6388] shadow-sm">No active alerts.</div>
        ) : (
          alerts.map((incident) => (
            <div key={incident.id} className="space-y-2">
              <AlertCard incident={incident} onAccept={handleAccept} onReject={handleReject} />
              <Link
                href={`/alerts/${incident.id}`}
                className="inline-flex rounded-xl bg-[#f0e7f7] px-3 py-2 text-xs font-medium text-[#4f426f]"
              >
                Open Alert Screen
              </Link>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
