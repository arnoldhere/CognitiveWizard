from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from db import get_db
from schemas.auth_schema import UserCreate, UserRead, LoginRequest, Token
from services.auth_service import create_user, authenticate_user, get_user_by_email
from utils.security import create_access_token, decode_access_token
from models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    token_data = decode_access_token(token)
    user = get_user_by_email(db, token_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )
    return current_user


def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges"
            )
        return current_user

    return role_checker


@router.post("/signup", response_model=UserRead)
def signup(user_details: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user_details.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )
    user = create_user(
        db,
        email=user_details.email,
        password=user_details.password,
        full_name=user_details.full_name,
        role=user_details.role or "user",
    )
    return user


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    access_token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user
