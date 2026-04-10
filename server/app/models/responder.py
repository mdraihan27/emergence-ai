from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.models.common import Location


class ResponderType(str, Enum):
    police = "police"
    medical = "medical"
    fire = "fire"
    volunteer = "volunteer"


class ResponderBase(BaseModel):
    name: str
    type: ResponderType
    phone: str
    location: Location
    is_available: bool = True


class ResponderCreate(ResponderBase):
    pass


class ResponderUpdate(BaseModel):
    name: str | None = None
    type: ResponderType | None = None
    phone: str | None = None
    location: Location | None = None
    is_available: bool | None = None


class ResponderOut(ResponderBase):
    id: str
    created_at: datetime
