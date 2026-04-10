from math import asin, cos, radians, sin, sqrt

from app.core.config import Settings


EMERGENCY_RESPONDER_MAP: dict[str, list[str]] = {
    "crime": ["police", "volunteer"],
    "medical": ["medical", "volunteer"],
    "fire": ["fire", "volunteer"],
    "mental_health": ["medical", "volunteer"],
    "other": ["volunteer"],
}

DEFAULT_SEVERITY_MAP: dict[str, int] = {
    "crime": 3,
    "medical": 4,
    "fire": 5,
    "mental_health": 3,
    "other": 3,
}


def haversine_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    radius_km = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    )
    c = 2 * asin(sqrt(a))
    return radius_km * c


class DispatcherService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @staticmethod
    def responder_types_for_incident(emergency_type: str) -> list[str]:
        return EMERGENCY_RESPONDER_MAP.get(emergency_type, ["volunteer"])

    @staticmethod
    def default_severity_for_type(emergency_type: str) -> int:
        return DEFAULT_SEVERITY_MAP.get(emergency_type, 3)

    def rank_responders(
        self,
        emergency_type: str,
        incident_location: dict,
        severity: int,
        responders: list[dict],
    ) -> list[dict]:
        incident_lat = incident_location["lat"]
        incident_lng = incident_location["lng"]

        candidates: list[dict] = []
        for responder in responders:
            responder_location = responder.get("location") or {}
            responder_lat = responder_location.get("lat")
            responder_lng = responder_location.get("lng")
            if responder_lat is None or responder_lng is None:
                continue

            distance_km = haversine_distance_km(
                incident_lat,
                incident_lng,
                responder_lat,
                responder_lng,
            )
            score = (severity * 10) - distance_km

            candidates.append(
                {
                    "responder_id": responder["id"],
                    "responder_type": responder["type"],
                    "responder_name": responder["name"],
                    "phone": responder["phone"],
                    "distance_km": round(distance_km, 3),
                    "score": round(score, 3),
                    "emergency_type": emergency_type,
                }
            )

        candidates.sort(key=lambda item: item["score"], reverse=True)
        return candidates[: self.settings.max_dispatch_responders]
