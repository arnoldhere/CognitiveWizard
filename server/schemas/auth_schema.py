from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "user"


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserRead


class TokenData(BaseModel):
    email: str
    role: str
