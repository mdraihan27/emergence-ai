"use client";

export type AlertCardIncident = {
  id: string;
  type: string;
  severity: number;
  status?: string;
  location?: {
    lat: number;
    lng: number;
  };
  manual_location?: string;
  created_at?: string;
};

type AlertCardProps = Readonly<{
  incident: AlertCardIncident;
  onAccept?: (incident: AlertCardIncident) => void;
  onReject?: (incident: AlertCardIncident) => void;
  compact?: boolean;
}>;

function severityLabel(severity: number): string {
  if (severity >= 5) {
    return "Critical";
  }
  if (severity >= 4) {
    return "High";
  }
  if (severity >= 3) {
    return "Medium";
  }
  return "Low";
}

export function AlertCard({ incident, onAccept, onReject, compact = false }: AlertCardProps) {
  return (
    <article className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold capitalize text-[#3F3558]">{incident.type} Incident</h3>
          <p className="text-xs text-[#72698c]">#{incident.id.slice(0, 8)}</p>
        </div>
        <span className="rounded-xl bg-[#9B8EC7] px-2 py-1 text-xs font-semibold text-white">
          {incident.severity} - {severityLabel(incident.severity)}
        </span>
      </div>

      <div className="mt-3 grid gap-1 text-sm text-[#43395d]">
        <p>
          Location: {incident.location?.lat?.toFixed(4)}, {incident.location?.lng?.toFixed(4)}
        </p>
        {incident.manual_location ? <p>Manual: {incident.manual_location}</p> : null}
        {incident.status ? <p>Status: {incident.status}</p> : null}
      </div>

      {compact ? null : (
        <div className="mt-4 flex gap-2">
          {onAccept ? (
            <button
              onClick={() => onAccept(incident)}
              className="h-10 flex-1 rounded-xl bg-[#B4D3D9] text-sm font-medium text-[#244955] transition hover:bg-[#9fc5cd]"
            >
              Accept
            </button>
          ) : null}
          {onReject ? (
            <button
              onClick={() => onReject(incident)}
              className="h-10 flex-1 rounded-xl bg-[#F1E4D8] text-sm font-medium text-[#5f4d41] transition hover:bg-[#ecd9c8]"
            >
              Reject
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
