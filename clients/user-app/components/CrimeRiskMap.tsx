"use client";

import { Circle, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type RiskZone = {
  name: string;
  center: [number, number];
  radiusMeters: number;
  note: string;
};

const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];

const RISK_ZONES: RiskZone[] = [
  {
    name: "Mohammadpur Cluster",
    center: [23.7689, 90.3615],
    radiusMeters: 700,
    note: "Repeated late-night harassment and snatching mentions.",
  },
  {
    name: "Jatrabari Junction",
    center: [23.7115, 90.4433],
    radiusMeters: 650,
    note: "Multiple theft and follow-up panic reports.",
  },
  {
    name: "Badda Link Road",
    center: [23.7808, 90.4257],
    radiusMeters: 750,
    note: "Frequent distress narratives around mobility and threats.",
  },
];

export default function CrimeRiskMap() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/70 p-3 shadow-soft">
      <MapContainer
        center={DHAKA_CENTER}
        zoom={12}
        style={{ height: "60vh", width: "100%", borderRadius: "16px" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {RISK_ZONES.map((zone) => (
          <Circle
            key={zone.name}
            center={zone.center}
            radius={zone.radiusMeters}
            pathOptions={{
              color: "#b91c1c",
              fillColor: "#ef4444",
              fillOpacity: 0.35,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{zone.name}</p>
                <p>{zone.note}</p>
                <p className="mt-1 text-xs text-[#7f1d1d]">Flagged as high crime risk area.</p>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
