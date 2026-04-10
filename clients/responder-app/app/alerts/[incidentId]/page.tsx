"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCard } from "@shared-ui";

import type { IncidentAlert } from "@/lib/api";
import { acceptAlert, findPendingAlert, rejectAlert } from "@/lib/alerts";
import { getResponderAuth } from "@/lib/auth";

export default function AlertDetailPage() {
  const router = useRouter();
  const params = useParams<{ incidentId: string }>();
  const incidentId = params.incidentId;

  const [incident, setIncident] = useState<IncidentAlert | null>(null);

  useEffect(() => {
    const auth = getResponderAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }

    setIncident(findPendingAlert(incidentId));
  }, [incidentId, router]);

  const handleAccept = () => {
    acceptAlert(incidentId);
    router.push(`/incidents/${incidentId}`);
  };

  const handleReject = () => {
    rejectAlert(incidentId);
    router.push("/dashboard");
  };

  if (!incident) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-white/80 p-6 text-sm text-[#63597f] shadow-soft">
        Alert not found or already processed.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="rounded-3xl bg-white/80 p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-[#3f3558]">Alert Screen</h1>
        <p className="mt-2 text-sm text-[#675d84]">Incident details and responder action.</p>
      </header>

      <AlertCard incident={incident} compact />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={handleAccept}
          className="h-11 rounded-xl bg-[#B4D3D9] text-sm font-semibold text-[#244955]"
        >
          Accept Incident
        </button>
        <button
          onClick={handleReject}
          className="h-11 rounded-xl bg-[#f1e4d8] text-sm font-semibold text-[#5f4d41]"
        >
          Reject Incident
        </button>
      </div>
    </div>
  );
}
