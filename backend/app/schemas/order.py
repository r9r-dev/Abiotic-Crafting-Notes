from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    item_id: str
    quantity: int = 1


class OrderItemResponse(BaseModel):
    id: int
    item_id: str
    quantity: int

    class Config:
        from_attributes = True


class MissingResource(BaseModel):
    item_id: str
    item_name: str
    quantity_needed: int


class OrderCreate(BaseModel):
    items: list[OrderItemCreate]
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None
    missing_resources: Optional[list[MissingResource]] = None


class OrderResponse(BaseModel):
    id: int
    requester_id: str
    requester_name: str
    crafter_id: Optional[str] = None
    crafter_name: Optional[str] = None
    status: OrderStatus
    notes: Optional[str] = None
    missing_resources: Optional[list[MissingResource]] = None
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
