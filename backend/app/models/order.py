from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    MISSING_RESOURCES = "missing_resources"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    requester_id = Column(String, ForeignKey("users.id"), nullable=False)
    crafter_id = Column(String, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    notes = Column(Text, nullable=True)
    missing_resources = Column(JSON, nullable=True)  # [{item_id, quantity_needed}]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    requester = relationship("User", back_populates="orders_created", foreign_keys=[requester_id])
    crafter = relationship("User", back_populates="orders_assigned", foreign_keys=[crafter_id])
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    item_id = Column(String, nullable=False)  # Reference to recipe/item
    quantity = Column(Integer, default=1)

    # Relationships
    order = relationship("Order", back_populates="items")
