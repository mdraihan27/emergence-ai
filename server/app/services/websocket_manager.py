import asyncio
from collections import defaultdict

from fastapi import WebSocket


class WebSocketHub:
    def __init__(self) -> None:
        self._responder_channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._session_channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._incident_rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect_responder(self, responder_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._responder_channels[responder_id].add(websocket)

    async def disconnect_responder(self, responder_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._responder_channels[responder_id].discard(websocket)
            if not self._responder_channels[responder_id]:
                self._responder_channels.pop(responder_id, None)

    async def connect_session(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._session_channels[session_id].add(websocket)

    async def disconnect_session(self, session_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._session_channels[session_id].discard(websocket)
            if not self._session_channels[session_id]:
                self._session_channels.pop(session_id, None)

    async def connect_incident_room(self, incident_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._incident_rooms[incident_id].add(websocket)

    async def disconnect_incident_room(self, incident_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._incident_rooms[incident_id].discard(websocket)
            if not self._incident_rooms[incident_id]:
                self._incident_rooms.pop(incident_id, None)

    async def send_to_responder(self, responder_id: str, payload: dict) -> None:
        sockets = self._responder_channels.get(responder_id, set())
        await self._broadcast(sockets, payload)

    async def send_to_many_responders(self, responder_ids: list[str], payload: dict) -> None:
        targets: set[WebSocket] = set()
        for responder_id in responder_ids:
            targets.update(self._responder_channels.get(responder_id, set()))
        await self._broadcast(targets, payload)

    async def send_to_session(self, session_id: str, payload: dict) -> None:
        sockets = self._session_channels.get(session_id, set())
        await self._broadcast(sockets, payload)

    async def send_to_incident_room(self, incident_id: str, payload: dict) -> None:
        sockets = self._incident_rooms.get(incident_id, set())
        await self._broadcast(sockets, payload)

    async def _broadcast(self, sockets: set[WebSocket], payload: dict) -> None:
        stale_sockets: list[WebSocket] = []
        for socket in tuple(sockets):
            try:
                await socket.send_json(payload)
            except Exception:
                stale_sockets.append(socket)

        if stale_sockets:
            async with self._lock:
                for socket in stale_sockets:
                    for channel in [
                        self._responder_channels,
                        self._session_channels,
                        self._incident_rooms,
                    ]:
                        for _, members in channel.items():
                            members.discard(socket)
