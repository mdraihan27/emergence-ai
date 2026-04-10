from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_responder_repository, require_admin_key
from app.models.responder import ResponderCreate, ResponderOut, ResponderUpdate
from app.repositories.responders import ResponderRepository

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin_key)],
)


@router.post("/responders", response_model=ResponderOut, status_code=status.HTTP_201_CREATED)
async def create_responder(
    payload: ResponderCreate,
    repository: Annotated[ResponderRepository, Depends(get_responder_repository)],
) -> dict:
    return await repository.create(payload)


@router.get("/responders", response_model=list[ResponderOut])
async def list_responders(
    repository: Annotated[ResponderRepository, Depends(get_responder_repository)],
) -> list[dict]:
    return await repository.list_all()


@router.put("/responders/{responder_id}", response_model=ResponderOut)
async def update_responder(
    responder_id: str,
    payload: ResponderUpdate,
    repository: Annotated[ResponderRepository, Depends(get_responder_repository)],
) -> dict:
    updated = await repository.update(responder_id, payload)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Responder not found",
        )
    return updated


@router.delete("/responders/{responder_id}")
async def delete_responder(
    responder_id: str,
    repository: Annotated[ResponderRepository, Depends(get_responder_repository)],
) -> dict:
    deleted = await repository.delete(responder_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Responder not found",
        )
    return {"deleted": True}
