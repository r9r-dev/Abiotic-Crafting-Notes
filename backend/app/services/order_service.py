from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderItemResponse, MissingResource


def create_order(db: Session, user: User, order_data: OrderCreate) -> Order:
    """Create a new order."""
    order = Order(
        requester_id=user.id,
        notes=order_data.notes
    )
    db.add(order)
    db.flush()

    for item in order_data.items:
        order_item = OrderItem(
            order_id=order.id,
            item_id=item.item_id,
            quantity=item.quantity
        )
        db.add(order_item)

    db.commit()
    db.refresh(order)
    return order


def get_orders(
    db: Session,
    status: OrderStatus | None = None,
    requester_id: str | None = None,
    crafter_id: str | None = None,
    limit: int = 50
) -> list[Order]:
    """Get orders with optional filters."""
    query = db.query(Order)

    if status:
        query = query.filter(Order.status == status)
    if requester_id:
        query = query.filter(Order.requester_id == requester_id)
    if crafter_id:
        query = query.filter(Order.crafter_id == crafter_id)

    return query.order_by(desc(Order.created_at)).limit(limit).all()


def get_order(db: Session, order_id: int) -> Order | None:
    """Get a single order by ID."""
    return db.query(Order).filter(Order.id == order_id).first()


def update_order(db: Session, order: Order, user: User, update_data: OrderUpdate) -> Order:
    """Update an order."""
    if update_data.status:
        order.status = update_data.status

        # Auto-assign crafter when accepting
        if update_data.status == OrderStatus.ACCEPTED and not order.crafter_id:
            order.crafter_id = user.id

    if update_data.notes is not None:
        order.notes = update_data.notes

    if update_data.missing_resources is not None:
        order.missing_resources = [r.model_dump() for r in update_data.missing_resources]
        if update_data.missing_resources:
            order.status = OrderStatus.MISSING_RESOURCES

    db.commit()
    db.refresh(order)
    return order


def cancel_order(db: Session, order: Order) -> Order:
    """Cancel an order."""
    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    return order


def order_to_response(order: Order) -> OrderResponse:
    """Convert Order model to response schema."""
    missing = None
    if order.missing_resources:
        missing = [MissingResource(**r) for r in order.missing_resources]

    return OrderResponse(
        id=order.id,
        requester_id=order.requester_id,
        requester_name=order.requester.name,
        crafter_id=order.crafter_id,
        crafter_name=order.crafter.name if order.crafter else None,
        status=order.status,
        notes=order.notes,
        missing_resources=missing,
        items=[OrderItemResponse.model_validate(item) for item in order.items],
        created_at=order.created_at,
        updated_at=order.updated_at
    )
