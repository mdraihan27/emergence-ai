from pydantic import BaseModel, Field

from app.models.incident import EmergencyType


class TriageResult(BaseModel):
    type: EmergencyType
    severity: int = Field(..., ge=1, le=5)
    response_bn: str
    should_escalate: bool
