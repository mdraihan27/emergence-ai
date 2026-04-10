from datetime import UTC, datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING

from app.repositories.base import serialize_document


class MessageRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.collection = db["messages"]

    async def create(
        self,
        sender: str,
        message: str,
        session_id: str | None = None,
        incident_id: str | None = None,
    ) -> dict:
        document = {
            "sender": sender,
            "message": message,
            "session_id": session_id,
            "incident_id": incident_id,
            "created_at": datetime.now(UTC),
        }
        result = await self.collection.insert_one(document)
        created = await self.collection.find_one({"_id": result.inserted_id})
        return serialize_document(created) or {}

    async def list_for_session(self, session_id: str, limit: int = 100) -> list[dict]:
        cursor = self.collection.find({"session_id": session_id}).sort("created_at", ASCENDING)
        documents = await cursor.to_list(length=limit)
        return [serialize_document(item) for item in documents]

    async def list_for_incident(self, incident_id: str, limit: int = 200) -> list[dict]:
        cursor = self.collection.find({"incident_id": incident_id}).sort("created_at", ASCENDING)
        documents = await cursor.to_list(length=limit)
        return [serialize_document(item) for item in documents]
