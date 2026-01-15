from pydantic import BaseModel
from datetime import datetime


class UserBase(BaseModel):
    email: str
    name: str


class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
