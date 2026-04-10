from datetime import UTC, datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from app.repositories.base import serialize_document, to_object_id


class IncidentRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.collection = db["incidents"]

    async def create(self, payload: dict) -> dict:
        document = {
            **payload,
            "status": payload.get("status", "active"),
            "created_at": payload.get("created_at", datetime.now(UTC)),
        }
        result = await self.collection.insert_one(document)
        created = await self.collection.find_one({"_id": result.inserted_id})
        return serialize_document(created) or {}

    async def get_by_id(self, incident_id: str) -> dict | None:
        document = await self.collection.find_one({"_id": to_object_id(incident_id)})
        return serialize_document(document)

    async def update_assignments(self, incident_id: str, assignments: list[dict]) -> dict | None:
        await self.collection.update_one(
            {"_id": to_object_id(incident_id)},
            {"$set": {"assigned_responders": assignments}},
        )
        return await self.get_by_id(incident_id)

    async def set_status(self, incident_id: str, status: str) -> dict | None:
        await self.collection.update_one(
            {"_id": to_object_id(incident_id)},
            {"$set": {"status": status}},
        )
        return await self.get_by_id(incident_id)

    async def list_active_sorted(self) -> list[dict]:
        cursor = self.collection.find({"status": "active"}).sort(
            [("severity", DESCENDING), ("created_at", ASCENDING)]
        )
        items = await cursor.to_list(length=1000)
        return [serialize_document(item) for item in items]
