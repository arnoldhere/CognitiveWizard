from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from config.settings import settings
from schemas.auth_schema import TokenData
from fastapi import HTTPException, status


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire})
    token = jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return token


def decode_access_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if not email:
            raise JWTError()
        return TokenData(email=email, role=role)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
