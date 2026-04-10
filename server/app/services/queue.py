import asyncio
import heapq
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(order=True)
class QueueEntry:
    sort_index: tuple[int, datetime] = field(init=False, repr=False)
    severity: int
    timestamp: datetime
    incident_id: str
    status: str = "active"

    def __post_init__(self) -> None:
        self.sort_index = (-self.severity, self.timestamp)


class IncidentPriorityQueue:
    def __init__(self) -> None:
        self._heap: list[QueueEntry] = []
        self._entries: dict[str, QueueEntry] = {}
        self._lock = asyncio.Lock()

    async def push(
        self,
        incident_id: str,
        severity: int,
        timestamp: datetime,
        status: str = "active",
    ) -> None:
        async with self._lock:
            entry = QueueEntry(
                incident_id=incident_id,
                severity=severity,
                timestamp=timestamp,
                status=status,
            )
            self._entries[incident_id] = entry
            heapq.heappush(self._heap, entry)

    async def update_status(self, incident_id: str, status: str) -> None:
        async with self._lock:
            entry = self._entries.get(incident_id)
            if entry is not None:
                entry.status = status

    async def pop_next(self) -> dict | None:
        async with self._lock:
            while self._heap:
                entry = heapq.heappop(self._heap)
                current = self._entries.get(entry.incident_id)
                if current is None:
                    continue
                if current.status != "active":
                    continue
                return self._to_dict(current)
            return None

    async def snapshot(self) -> list[dict]:
        async with self._lock:
            active = [
                entry
                for entry in self._entries.values()
                if entry.status == "active"
            ]
            ordered = sorted(active, key=lambda item: (-item.severity, item.timestamp))
            return [self._to_dict(entry) for entry in ordered]

    @staticmethod
    def _to_dict(entry: QueueEntry) -> dict:
        return {
            "incident_id": entry.incident_id,
            "severity": entry.severity,
            "timestamp": entry.timestamp,
            "status": entry.status,
        }
