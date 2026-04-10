from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import get_settings


def create_access_token(
    subject: str,
    role: str = "responder",
    expires_delta: timedelta | None = None,
) -> str:
    settings = get_settings()
    expiry = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=settings.jwt_expires_minutes)
    )
    payload = {
        "sub": subject,
        "role": role,
        "exp": expiry,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc
