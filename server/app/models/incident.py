from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.models.common import Location


class EmergencyType(str, Enum):
    crime = "crime"
    medical = "medical"
    fire = "fire"
    mental_health = "mental_health"
    other = "other"


class SosRequest(BaseModel):
    type: EmergencyType
    location: Location
    manual_location: str | None = None
    session_id: str | None = None


class IncidentAssignment(BaseModel):
    responder_id: str
    responder_type: str
    distance_km: float
    score: float


class IncidentOut(BaseModel):
    id: str
    type: EmergencyType
    session_id: str | None
    location: Location
    manual_location: str | None
    severity: int = Field(..., ge=1, le=5)
    status: str
    source: str
    assigned_responders: list[IncidentAssignment]
    created_at: datetime


class QueueItemOut(BaseModel):
    incident_id: str
    severity: int
    timestamp: datetime
    status: str
