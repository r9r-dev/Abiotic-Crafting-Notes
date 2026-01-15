from fastapi import Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import get_settings
from app.models.user import User
from pydantic import BaseModel


class CurrentUser(BaseModel):
    """Current user from Pangolin SSO headers."""
    id: str
    email: str
    name: str

    class Config:
        from_attributes = True


def get_current_user_from_headers(request: Request) -> CurrentUser:
    """
    Extract user info from Pangolin SSO headers.
    Headers set by Pangolin proxy:
    - Remote-User: unique user ID
    - Remote-Email: user email
    - Remote-Name: display name
    """
    settings = get_settings()

    if settings.dev_mode:
        return CurrentUser(
            id=settings.dev_user_id,
            email=settings.dev_user_email,
            name=settings.dev_user_name
        )

    user_id = request.headers.get("Remote-User")
    email = request.headers.get("Remote-Email")
    name = request.headers.get("Remote-Name")

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return CurrentUser(
        id=user_id,
        email=email or f"{user_id}@unknown",
        name=name or user_id
    )


def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """
    Get or create user in database from Pangolin headers.
    """
    current = get_current_user_from_headers(request)

    user = db.query(User).filter(User.id == current.id).first()
    if not user:
        user = User(
            id=current.id,
            email=current.email,
            name=current.name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user info if changed
        if user.email != current.email or user.name != current.name:
            user.email = current.email
            user.name = current.name
            db.commit()
            db.refresh(user)

    return user
