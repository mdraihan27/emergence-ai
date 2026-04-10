from typing import Annotated

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import (
    get_current_responder,
    get_current_responder_id,
    get_responder_repository,
)
from app.core.config import get_settings
from app.core.security import create_access_token
from app.models.auth import ResponderLoginRequest, TokenResponse
from app.models.responder import ResponderOut
from app.repositories.responders import ResponderRepository

router = APIRouter(prefix="/responder", tags=["responder"])


class AvailabilityUpdate(BaseModel):
    is_available: bool


@router.post("/login", response_model=TokenResponse)
async def responder_login(
    payload: ResponderLoginRequest,
    repository: Annotated[ResponderRepository, Depends(get_responder_repository)],
) -> dict:
    settings = get_settings()

    responder = await repository.get_by_id(payload.id)
    if responder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Responder ID not found",
        )

    if payload.otp != settings.dummy_otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )

    token = create_access_token(subject=responder["id"], role="responder")
    return {
        "access_token": token,
        "token_type": "bearer",
        "responder": responder,
    }


@router.patch("/availability", response_model=ResponderOut)
async def toggle_availability(
    payload: AvailabilityUpdate,
    responder_id: Annotated[str, Depends(get_current_responder_id)],
    repository: Annotated[ResponderRepository, Depends(get_responder_repository)],
) -> dict:
    updated = await repository.set_availability(responder_id, payload.is_available)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Responder not found",
        )
    return updated


@router.get("/me", response_model=ResponderOut)
async def get_me(
    current_responder: Annotated[dict, Depends(get_current_responder)],
) -> dict:
    return current_responder
