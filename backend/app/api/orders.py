from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.order import OrderStatus
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse
from app.services import (
    create_order,
    get_orders,
    get_order,
    update_order,
    cancel_order,
    order_to_response
)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse)
def create_new_order(
    order_data: OrderCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new crafting order."""
    order = create_order(db, user, order_data)
    return order_to_response(order)


@router.get("", response_model=list[OrderResponse])
def list_orders(
    status: OrderStatus | None = Query(default=None),
    mine: bool = Query(default=False, description="Only show my orders"),
    assigned: bool = Query(default=False, description="Only show orders assigned to me"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List orders with optional filters."""
    requester_id = user.id if mine else None
    crafter_id = user.id if assigned else None

    orders = get_orders(db, status, requester_id, crafter_id)
    return [order_to_response(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order_by_id(
    order_id: int,
    db: Session = Depends(get_db)
):
    """Get an order by ID."""
    order = get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order_to_response(order)


@router.patch("/{order_id}", response_model=OrderResponse)
def update_order_by_id(
    order_id: int,
    update_data: OrderUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an order (status, notes, missing resources)."""
    order = get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order = update_order(db, order, user, update_data)
    return order_to_response(order)


@router.post("/{order_id}/accept", response_model=OrderResponse)
def accept_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept an order (assign yourself as crafter)."""
    order = get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="Order is not pending")

    order = update_order(db, order, user, OrderUpdate(status=OrderStatus.ACCEPTED))
    return order_to_response(order)


@router.post("/{order_id}/complete", response_model=OrderResponse)
def complete_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark an order as completed."""
    order = get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.crafter_id and order.crafter_id != user.id:
        raise HTTPException(status_code=403, detail="Only the assigned crafter can complete this order")

    order = update_order(db, order, user, OrderUpdate(status=OrderStatus.COMPLETED))
    return order_to_response(order)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order_by_id(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an order."""
    order = get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.requester_id != user.id:
        raise HTTPException(status_code=403, detail="Only the requester can cancel this order")

    order = cancel_order(db, order)
    return order_to_response(order)
