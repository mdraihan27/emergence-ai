from datetime import datetime

from pydantic import BaseModel


class SessionCreateResponse(BaseModel):
    session_id: str
    created_at: datetime
