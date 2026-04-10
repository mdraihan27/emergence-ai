from datetime import UTC, datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING

from app.models.responder import ResponderCreate, ResponderUpdate
from app.repositories.base import serialize_document, to_object_id


class ResponderRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.collection = db["responders"]

    async def create(self, payload: ResponderCreate) -> dict:
        data = payload.model_dump()
        data["created_at"] = datetime.now(UTC)
        result = await self.collection.insert_one(data)
        document = await self.collection.find_one({"_id": result.inserted_id})
        return serialize_document(document) or {}

    async def list_all(self) -> list[dict]:
        cursor = self.collection.find({}).sort("created_at", ASCENDING)
        return [serialize_document(item) for item in await cursor.to_list(length=1000)]

    async def get_by_id(self, responder_id: str) -> dict | None:
        document = await self.collection.find_one({"_id": to_object_id(responder_id)})
        return serialize_document(document)

    async def update(self, responder_id: str, payload: ResponderUpdate) -> dict | None:
        updates = payload.model_dump(exclude_none=True)
        if not updates:
            return await self.get_by_id(responder_id)

        await self.collection.update_one(
            {"_id": to_object_id(responder_id)},
            {"$set": updates},
        )
        return await self.get_by_id(responder_id)

    async def delete(self, responder_id: str) -> bool:
        result = await self.collection.delete_one({"_id": to_object_id(responder_id)})
        return result.deleted_count > 0

    async def set_availability(self, responder_id: str, is_available: bool) -> dict | None:
        await self.collection.update_one(
            {"_id": to_object_id(responder_id)},
            {"$set": {"is_available": is_available}},
        )
        return await self.get_by_id(responder_id)

    async def find_available_by_types(self, responder_types: list[str]) -> list[dict]:
        cursor = self.collection.find(
            {
                "type": {"$in": responder_types},
                "is_available": True,
            }
        )
        documents = await cursor.to_list(length=500)
        return [serialize_document(item) for item in documents]
