from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.items import router as items_router
from app.api.npcs import router as npcs_router
from app.api.search import router as search_router
from app.api.compendium import router as compendium_router
from app.api.dialogues import router as dialogues_router
from app.api.analytics import router as analytics_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(items_router)
api_router.include_router(npcs_router)
api_router.include_router(search_router)
api_router.include_router(compendium_router)
api_router.include_router(dialogues_router)
api_router.include_router(analytics_router)
