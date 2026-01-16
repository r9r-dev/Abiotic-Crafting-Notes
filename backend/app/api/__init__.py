from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.recipes import router as recipes_router, icons_router
from app.api.orders import router as orders_router
from app.api.items import router as items_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(recipes_router)
api_router.include_router(items_router)
api_router.include_router(orders_router)
api_router.include_router(icons_router)
