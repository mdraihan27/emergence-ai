from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.public import router as public_router
from app.api.responder import router as responder_router
from app.api.ws import router as websocket_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.db.indexes import ensure_indexes
from app.db.mongo import close_mongo_connection, connect_to_mongo, get_database
from app.repositories.incidents import IncidentRepository
from app.repositories.messages import MessageRepository
from app.repositories.responders import ResponderRepository
from app.repositories.sessions import SessionRepository
from app.services.ai_triage import AITriageService
from app.services.dispatcher import DispatcherService
from app.services.queue import IncidentPriorityQueue
from app.services.transcription import TranscriptionService
from app.services.websocket_manager import WebSocketHub

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.debug)

    connect_to_mongo()
    await ensure_indexes()

    db = get_database()
    app.state.responder_repository = ResponderRepository(db)
    app.state.session_repository = SessionRepository(db)
    app.state.incident_repository = IncidentRepository(db)
    app.state.message_repository = MessageRepository(db)

    app.state.dispatcher_service = DispatcherService(settings)
    app.state.triage_service = AITriageService(settings)
    app.state.transcription_service = TranscriptionService(
        model_name=settings.whisper_model,
        language=settings.whisper_language,
    )
    app.state.websocket_hub = WebSocketHub()
    app.state.priority_queue = IncidentPriorityQueue()

    try:
        yield
    finally:
        close_mongo_connection()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)
app.include_router(responder_router)
app.include_router(public_router)
app.include_router(websocket_router)


@app.get("/")
async def root() -> dict:
    return {
        "service": settings.app_name,
        "status": "running",
    }


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "environment": settings.app_env,
    }
