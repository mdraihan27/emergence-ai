from pydantic import BaseModel, Field

from app.models.responder import ResponderOut


class ResponderLoginRequest(BaseModel):
    phone: str = Field(..., min_length=3)
    otp: str = Field(..., min_length=4)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    responder: ResponderOut


class TokenPayload(BaseModel):
    sub: str
    role: str
