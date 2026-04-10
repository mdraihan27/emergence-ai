"use client";

import { FormEvent, useMemo, useState } from "react";

import { useSessionId } from "@/hooks/useSessionId";
import { IncidentResponse, sendSos } from "@/lib/api";

type EmergencyType = "crime" | "medical" | "fire" | "other";

export default function SosPage() {
  const { sessionId, loading: sessionLoading } = useSessionId();
  const [type, setType] = useState<EmergencyType>("medical");
  const [manualLocation, setManualLocation] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [useManualPin, setUseManualPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [incident, setIncident] = useState<IncidentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const hasGps = lat !== "" && lng !== "";
    return !submitting && !sessionLoading && hasGps;
  }, [lat, lng, sessionLoading, submitting]);

  const requestGps = () => {
    if (!navigator.geolocation) {
      setError("GPS is not available on this device.");
      return;
    }

    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
      },
      () => {
        setError("Could not get GPS location. Grant permission and try again.");
      }
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        type,
        location: {
          lat: Number(lat),
          lng: Number(lng),
        },
        manual_location: manualLocation || undefined,
        session_id: sessionId ?? undefined,
      };

      const createdIncident = await sendSos(payload);
      setIncident(createdIncident);
    } catch {
      setError("SOS could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="rounded-3xl bg-white/70 p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-[#3f3558]">Send SOS</h1>
        <p className="mt-2 text-sm text-[#685d84]">Share emergency type, location, and extra details.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl bg-white/80 p-5 shadow-soft">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#4b4168]">Emergency Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as EmergencyType)}
            className="h-11 w-full rounded-xl border border-[#d8cae5] bg-white px-3 text-sm outline-none focus:border-[#9B8EC7]"
          >
            <option value="crime">Crime</option>
            <option value="medical">Medical</option>
            <option value="fire">Fire</option>
            <option value="other">Other</option>
          </select>
        </label>

        <div className="rounded-2xl bg-[#f3f7f8] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={requestGps}
              className="h-10 rounded-xl bg-[#B4D3D9] px-4 text-sm font-medium text-[#264b56]"
            >
              Get GPS Location
            </button>
            <button
              type="button"
              onClick={() => setUseManualPin((prev) => !prev)}
              className="h-10 rounded-xl bg-[#BDA6CE] px-4 text-sm font-medium text-[#3d3359]"
            >
              {useManualPin ? "Switch Back to GPS" : "Map Pin (Manual)"}
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={lat}
              onChange={(event) => setLat(event.target.value)}
              disabled={!useManualPin}
              placeholder="Latitude"
              className="h-11 rounded-xl border border-[#d8cae5] bg-white px-3 text-sm outline-none"
            />
            <input
              value={lng}
              onChange={(event) => setLng(event.target.value)}
              disabled={!useManualPin}
              placeholder="Longitude"
              className="h-11 rounded-xl border border-[#d8cae5] bg-white px-3 text-sm outline-none"
            />
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#4b4168]">Manual Location (Optional)</span>
          <input
            value={manualLocation}
            onChange={(event) => setManualLocation(event.target.value)}
            placeholder="Example: Dhanmondi 27, Road 10"
            className="h-11 w-full rounded-xl border border-[#d8cae5] bg-white px-3 text-sm outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-11 w-full rounded-xl bg-[#9B8EC7] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send SOS"}
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      {incident ? (
        <section className="space-y-3 rounded-3xl bg-white/85 p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-[#3f3558]">SOS Submitted</h2>
          <p className="text-sm text-[#655a81]">Incident ID: {incident.id}</p>
          <p className="text-sm text-[#655a81]">Severity: {incident.severity}</p>
          <p className="text-sm text-[#655a81]">Assigned responders: {incident.assigned_responders.length}</p>
          <ul className="space-y-2">
            {incident.assigned_responders.map((item) => (
              <li key={item.responder_id} className="rounded-xl bg-[#f4edf9] px-3 py-2 text-sm text-[#43395d]">
                {item.responder_name} ({item.responder_type}) - {item.distance_km}km
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
