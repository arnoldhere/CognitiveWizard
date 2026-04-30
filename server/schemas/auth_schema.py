from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


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
    chat_limit: Optional[int] = None
    subscribed: Optional[bool] = None
    chat_limit_reset_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserRead


class FaceLoginResponse(BaseModel):
    status: str
    message: str
    confidence: float
    access_token: str
    token_type: str
    user: UserRead

    class Config:
        from_attributes = True


class TokenData(BaseModel):
    email: str
    role: str


class DeleteProfileRequest(BaseModel):
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


class UserStatusUpdate(BaseModel):
    is_active: bool
