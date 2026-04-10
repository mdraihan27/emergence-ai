from bson import ObjectId
from fastapi import HTTPException, status


def to_object_id(raw_id: str) -> ObjectId:
    if not ObjectId.is_valid(raw_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid id format",
        )
    return ObjectId(raw_id)


def serialize_document(document: dict | None) -> dict | None:
    if document is None:
        return None

    serialized = dict(document)
    identifier = serialized.pop("_id", None)
    if identifier is not None:
        serialized["id"] = str(identifier)
    return serialized
