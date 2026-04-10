from pymongo import ASCENDING, DESCENDING

from app.db.mongo import get_database


async def ensure_indexes() -> None:
    db = get_database()

    await db["responders"].create_index(
        [("type", ASCENDING), ("is_available", ASCENDING)]
    )
    await db["responders"].create_index("phone")

    await db["sessions"].create_index("session_id", unique=True)
    await db["sessions"].create_index("created_at")

    await db["messages"].create_index(
        [("session_id", ASCENDING), ("created_at", ASCENDING)]
    )
    await db["messages"].create_index(
        [("incident_id", ASCENDING), ("created_at", ASCENDING)]
    )

    await db["incidents"].create_index(
        [("status", ASCENDING), ("severity", DESCENDING), ("created_at", ASCENDING)]
    )
    await db["incidents"].create_index([("type", ASCENDING), ("created_at", DESCENDING)])
