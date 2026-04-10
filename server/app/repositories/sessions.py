from datetime import UTC, datetime
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import serialize_document


class SessionRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.collection = db["sessions"]

    async def create(self) -> dict:
        document = {
            "session_id": str(uuid4()),
            "created_at": datetime.now(UTC),
        }
        await self.collection.insert_one(document)
        return document

    async def get_by_session_id(self, session_id: str) -> dict | None:
        document = await self.collection.find_one({"session_id": session_id})
        return serialize_document(document)
