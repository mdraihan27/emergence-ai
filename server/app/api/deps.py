from fastapi import Depends, Header, HTTPException, Request, status

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.repositories.incidents import IncidentRepository
from app.repositories.messages import MessageRepository
from app.repositories.responders import ResponderRepository
from app.repositories.sessions import SessionRepository
from app.services.ai_triage import AITriageService
from app.services.dispatcher import DispatcherService
from app.services.queue import IncidentPriorityQueue
from app.services.transcription import TranscriptionService
from app.services.websocket_manager import WebSocketHub


def get_responder_repository(request: Request) -> ResponderRepository:
    return request.app.state.responder_repository


def get_session_repository(request: Request) -> SessionRepository:
    return request.app.state.session_repository


def get_incident_repository(request: Request) -> IncidentRepository:
    return request.app.state.incident_repository


def get_message_repository(request: Request) -> MessageRepository:
    return request.app.state.message_repository


def get_dispatcher_service(request: Request) -> DispatcherService:
    return request.app.state.dispatcher_service


def get_triage_service(request: Request) -> AITriageService:
    return request.app.state.triage_service


def get_transcription_service(request: Request) -> TranscriptionService:
    return request.app.state.transcription_service


def get_websocket_hub(request: Request) -> WebSocketHub:
    return request.app.state.websocket_hub


def get_priority_queue(request: Request) -> IncidentPriorityQueue:
    return request.app.state.priority_queue


def require_admin_key(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> None:
    settings = get_settings()
    if settings.admin_api_key and x_admin_key != settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin key",
        )


def get_bearer_token(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization must be Bearer token",
        )

    return token


def get_current_responder_id(token: str = Depends(get_bearer_token)) -> str:
    payload = decode_access_token(token)
    role = payload.get("role")
    subject = payload.get("sub")

    if role != "responder" or not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid responder token",
        )

    return str(subject)


async def get_current_responder(
    responder_id: str = Depends(get_current_responder_id),
    repository: ResponderRepository = Depends(get_responder_repository),
) -> dict:
    responder = await repository.get_by_id(responder_id)
    if responder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Responder not found",
        )
    return responder
