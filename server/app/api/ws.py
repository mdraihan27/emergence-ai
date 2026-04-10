import json
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.api.deps import (
    get_dispatcher_service,
    get_incident_repository,
    get_message_repository,
    get_priority_queue,
    get_responder_repository,
    get_session_repository,
    get_triage_service,
    get_websocket_hub,
)
from app.core.config import get_settings
from app.core.security import decode_access_token
from app.repositories.incidents import IncidentRepository
from app.repositories.messages import MessageRepository
from app.repositories.responders import ResponderRepository
from app.repositories.sessions import SessionRepository
from app.services.ai_triage import AITriageService
from app.services.dispatcher import DispatcherService
from app.services.queue import IncidentPriorityQueue
from app.services.websocket_manager import WebSocketHub

router = APIRouter(tags=["websocket"])


def _parse_payload(raw_text: str) -> dict:
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return {"message": raw_text}

    if isinstance(parsed, dict):
        return parsed
    return {"message": str(parsed)}


def _extract_location(payload: dict) -> dict:
    raw_location = payload.get("location")
    if isinstance(raw_location, dict):
        try:
            return {
                "lat": float(raw_location["lat"]),
                "lng": float(raw_location["lng"]),
            }
        except Exception:
            pass

    return {
        "lat": 23.8103,
        "lng": 90.4125,
    }


async def _load_incident_or_close(
    websocket: WebSocket,
    incident_id: str,
    incident_repository: IncidentRepository,
) -> dict | None:
    incident = await incident_repository.get_by_id(incident_id)
    if incident is None:
        await websocket.close(code=1008)
        return None
    return incident


async def _authorize_incident_participant(
    websocket: WebSocket,
    participant: str,
    participant_id: str,
    token: str | None,
) -> bool:
    if participant not in {"user", "responder"}:
        await websocket.close(code=1008)
        return False

    if participant == "user":
        return True

    if token is None:
        await websocket.close(code=1008)
        return False

    try:
        token_payload = decode_access_token(token)
    except Exception:
        await websocket.close(code=1008)
        return False

    if token_payload.get("role") != "responder" or token_payload.get("sub") != participant_id:
        await websocket.close(code=1008)
        return False

    return True


@router.websocket("/ws/responder/{responder_id}")
async def responder_alert_channel(
    websocket: WebSocket,
    responder_id: str,
    websocket_hub: Annotated[WebSocketHub, Depends(get_websocket_hub)],
    token: str = Query(...),
) -> None:
    try:
        try:
            payload = decode_access_token(token)
        except Exception:
            await websocket.close(code=1008)
            return

        if payload.get("role") != "responder" or payload.get("sub") != responder_id:
            await websocket.close(code=1008)
            return

        await websocket_hub.connect_responder(responder_id, websocket)
        await websocket.send_json(
            {
                "event": "connected",
                "channel": "responder",
                "responder_id": responder_id,
            }
        )

        while True:
            message = await websocket.receive_text()
            if message.strip().lower() == "ping":
                await websocket.send_json({"event": "pong"})
            else:
                await websocket.send_json({"event": "ack", "payload": message})
    except WebSocketDisconnect:
        await websocket_hub.disconnect_responder(responder_id, websocket)
    except Exception:
        await websocket.close(code=1011)


@router.websocket("/ws/chat/{session_id}")
async def ai_chat_channel(
    websocket: WebSocket,
    session_id: str,
    session_repository: Annotated[SessionRepository, Depends(get_session_repository)],
    message_repository: Annotated[MessageRepository, Depends(get_message_repository)],
    incident_repository: Annotated[IncidentRepository, Depends(get_incident_repository)],
    responder_repository: Annotated[
        ResponderRepository,
        Depends(get_responder_repository),
    ],
    triage_service: Annotated[AITriageService, Depends(get_triage_service)],
    dispatcher: Annotated[DispatcherService, Depends(get_dispatcher_service)],
    websocket_hub: Annotated[WebSocketHub, Depends(get_websocket_hub)],
    queue: Annotated[IncidentPriorityQueue, Depends(get_priority_queue)],
) -> None:
    settings = get_settings()
    session = await session_repository.get_by_session_id(session_id)
    if session is None:
        await websocket.close(code=1008)
        return

    await websocket_hub.connect_session(session_id, websocket)
    await websocket.send_json(
        {
            "event": "connected",
            "channel": "ai_chat",
            "session_id": session_id,
        }
    )

    try:
        while True:
            raw_message = await websocket.receive_text()
            payload = _parse_payload(raw_message)

            user_message = str(payload.get("message", "")).strip()
            if not user_message:
                await websocket.send_json(
                    {
                        "event": "error",
                        "detail": "message field is required",
                    }
                )
                continue

            category = payload.get("category")
            location = _extract_location(payload)

            await message_repository.create(
                sender="user",
                message=user_message,
                session_id=session_id,
            )

            triage = await triage_service.triage(
                user_message=user_message,
                category=category,
            )

            await message_repository.create(
                sender="ai",
                message=triage.response_bn,
                session_id=session_id,
            )

            await websocket_hub.send_to_session(
                session_id,
                {
                    "event": "ai_response",
                    "triage": triage.model_dump(),
                },
            )

            should_dispatch = False
            if triage.severity <= 2:
                should_dispatch = False
            elif triage.severity == 3:
                should_dispatch = triage.should_escalate
            elif triage.severity >= settings.severity_escalation_threshold:
                should_dispatch = True

            if not should_dispatch:
                continue

            incident = await incident_repository.create(
                {
                    "type": triage.type.value,
                    "session_id": session_id,
                    "location": location,
                    "manual_location": payload.get("manual_location"),
                    "severity": triage.severity,
                    "status": "active",
                    "source": "ai_chat",
                    "assigned_responders": [],
                }
            )

            responder_types = dispatcher.responder_types_for_incident(triage.type.value)
            available_responders = await responder_repository.find_available_by_types(
                responder_types
            )
            assignments = dispatcher.rank_responders(
                emergency_type=triage.type.value,
                incident_location=location,
                severity=triage.severity,
                responders=available_responders,
            )

            incident = (
                await incident_repository.update_assignments(incident["id"], assignments)
                or incident
            )

            await queue.push(
                incident_id=incident["id"],
                severity=incident["severity"],
                timestamp=incident["created_at"],
                status=incident["status"],
            )

            if assignments:
                responder_ids = [assignment["responder_id"] for assignment in assignments]
                await websocket_hub.send_to_many_responders(
                    responder_ids,
                    {
                        "event": "incident_alert",
                        "incident": incident,
                        "triage": triage.model_dump(),
                        "call_event": {
                            "type": "mock_call",
                            "description": "Mock incoming call event from dispatcher",
                        },
                    },
                )

            primary_responder = assignments[0] if assignments else None

            await websocket_hub.send_to_session(
                session_id,
                {
                    "event": "escalation",
                    "call_999": True,
                    "connect_to_responder_chat": True,
                    "incident": incident,
                    "assigned_count": len(assignments),
                    "assigned_responder": primary_responder,
                },
            )
    except WebSocketDisconnect:
        await websocket_hub.disconnect_session(session_id, websocket)
    except Exception:
        await websocket.close(code=1011)


@router.websocket("/ws/incident/{incident_id}/{participant}/{participant_id}")
async def incident_room_chat(
    websocket: WebSocket,
    incident_id: str,
    participant: str,
    participant_id: str,
    incident_repository: Annotated[IncidentRepository, Depends(get_incident_repository)],
    message_repository: Annotated[MessageRepository, Depends(get_message_repository)],
    websocket_hub: Annotated[WebSocketHub, Depends(get_websocket_hub)],
    token: str | None = Query(default=None),
) -> None:
    incident = await _load_incident_or_close(websocket, incident_id, incident_repository)
    if incident is None:
        return

    authorized = await _authorize_incident_participant(
        websocket=websocket,
        participant=participant,
        participant_id=participant_id,
        token=token,
    )
    if not authorized:
        return

    await websocket_hub.connect_incident_room(incident_id, websocket)
    await websocket.send_json(
        {
            "event": "connected",
            "channel": "incident_chat",
            "incident_id": incident_id,
            "participant": participant,
            "participant_id": participant_id,
        }
    )

    try:
        while True:
            raw_message = await websocket.receive_text()
            payload = _parse_payload(raw_message)
            message_text = str(payload.get("message", "")).strip()
            if not message_text:
                continue

            sender = f"{participant}:{participant_id}"
            session_id = participant_id if participant == "user" else incident.get("session_id")

            await message_repository.create(
                sender=sender,
                message=message_text,
                session_id=session_id,
                incident_id=incident_id,
            )

            await websocket_hub.send_to_incident_room(
                incident_id,
                {
                    "event": "incident_chat",
                    "incident_id": incident_id,
                    "sender": sender,
                    "message": message_text,
                    "timestamp": datetime.now(UTC).isoformat(),
                },
            )
    except WebSocketDisconnect:
        await websocket_hub.disconnect_incident_room(incident_id, websocket)
    except Exception:
        await websocket.close(code=1011)
