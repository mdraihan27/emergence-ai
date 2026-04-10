from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import Location
from app.models.incident import EmergencyType


class ChatInput(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    category: EmergencyType | None = None
    location: Location | None = None


class ChatMessageOut(BaseModel):
    id: str
    sender: str
    message: str
    session_id: str | None = None
    incident_id: str | None = None
    created_at: datetime
