from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.items import router as items_router
from app.api.npcs import router as npcs_router
from app.api.search import router as search_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(items_router)
api_router.include_router(npcs_router)
api_router.include_router(search_router)
