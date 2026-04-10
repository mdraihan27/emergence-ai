from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import (
    get_dispatcher_service,
    get_incident_repository,
    get_priority_queue,
    get_responder_repository,
    get_session_repository,
    get_transcription_service,
    get_triage_service,
    get_websocket_hub,
)
from app.models.incident import IncidentOut, QueueItemOut, SosRequest
from app.models.session import SessionCreateResponse
from app.repositories.incidents import IncidentRepository
from app.repositories.responders import ResponderRepository
from app.repositories.sessions import SessionRepository
from app.services.ai_triage import AITriageService
from app.services.dispatcher import DispatcherService
from app.services.queue import IncidentPriorityQueue
from app.services.transcription import TranscriptionService
from app.services.websocket_manager import WebSocketHub

router = APIRouter(prefix="/api", tags=["public"])


@router.post("/session", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    repository: Annotated[SessionRepository, Depends(get_session_repository)],
) -> dict:
    return await repository.create()


@router.get("/session/{session_id}")
async def get_session(
    session_id: str,
    repository: Annotated[SessionRepository, Depends(get_session_repository)],
) -> dict:
    session = await repository.get_by_session_id(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    return {
        "session_id": session["session_id"],
        "created_at": session["created_at"],
    }


@router.post("/sos", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
async def create_sos(
    payload: SosRequest,
    incident_repository: Annotated[
        IncidentRepository,
        Depends(get_incident_repository),
    ],
    responder_repository: Annotated[
        ResponderRepository,
        Depends(get_responder_repository),
    ],
    dispatcher: Annotated[DispatcherService, Depends(get_dispatcher_service)],
    websocket_hub: Annotated[WebSocketHub, Depends(get_websocket_hub)],
    queue: Annotated[IncidentPriorityQueue, Depends(get_priority_queue)],
) -> dict:
    severity = dispatcher.default_severity_for_type(payload.type.value)

    incident = await incident_repository.create(
        {
            "type": payload.type.value,
            "session_id": payload.session_id,
            "location": payload.location.model_dump(),
            "manual_location": payload.manual_location,
            "severity": severity,
            "status": "active",
            "source": "sos",
            "assigned_responders": [],
        }
    )

    responder_types = dispatcher.responder_types_for_incident(payload.type.value)
    available_responders = await responder_repository.find_available_by_types(responder_types)
    assignments = dispatcher.rank_responders(
        emergency_type=payload.type.value,
        incident_location=payload.location.model_dump(),
        severity=severity,
        responders=available_responders,
    )

    incident = await incident_repository.update_assignments(incident["id"], assignments) or incident
    await queue.push(
        incident_id=incident["id"],
        severity=incident["severity"],
        timestamp=incident["created_at"],
        status=incident["status"],
    )

    if assignments:
        responder_ids = [entry["responder_id"] for entry in assignments]
        await websocket_hub.send_to_many_responders(
            responder_ids,
            {
                "event": "incident_alert",
                "incident": incident,
                "call_event": {
                    "type": "mock_call",
                    "description": "Mock incoming emergency call event",
                },
            },
        )

    return incident


@router.post("/transcribe")
async def transcribe_audio(
    audio: Annotated[UploadFile, File(...)],
    transcription_service: Annotated[
        TranscriptionService,
        Depends(get_transcription_service),
    ],
    triage_service: Annotated[AITriageService, Depends(get_triage_service)],
) -> dict:
    content = await audio.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is empty",
        )

    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"
    transcribed_text = await transcription_service.transcribe_bytes(content, suffix=suffix)
    triage = await triage_service.triage(transcribed_text)

    return {
        "text": transcribed_text,
        "triage": triage.model_dump(),
    }


@router.get("/queue/active", response_model=list[QueueItemOut])
async def get_active_queue(
    queue: Annotated[IncidentPriorityQueue, Depends(get_priority_queue)],
) -> list[dict]:
    return await queue.snapshot()
