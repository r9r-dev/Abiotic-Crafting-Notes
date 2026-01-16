from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from app.database import get_db
from app.services.recipe_service import (
    get_recipe,
    search_recipes,
    get_categories,
    build_dependency_tree,
    calculate_total_resources,
)
from app.schemas.recipe import Recipe, RecipeSearchResult, DependencyNode, ResourceCalculation

router = APIRouter(prefix="/recipes", tags=["recipes"])

# Icons directory - configurable via env or default to /app/data/icons (Docker)
import os
_default_icons = Path("/app/data/icons") if Path("/app/data").exists() else Path(__file__).parent.parent.parent.parent / "data" / "icons"
ICONS_DIR = Path(os.environ.get("ICONS_PATH", str(_default_icons)))


@router.get("", response_model=list[RecipeSearchResult])
def list_recipes(
    q: str = Query(default="", description="Search query (FR/EN, accent-insensitive)"),
    category: str | None = Query(default=None, description="Filter by category"),
    db: Session = Depends(get_db),
):
    """Search and list recipes.

    Search is performed on:
    - English name
    - French name (accent-insensitive)
    - French description (accent-insensitive)
    """
    return search_recipes(db, q if q else None, category)


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    """Get all recipe categories."""
    return get_categories(db)


@router.get("/{item_id}", response_model=Recipe)
def get_recipe_by_id(item_id: str, db: Session = Depends(get_db)):
    """Get a recipe by its ID."""
    recipe = get_recipe(db, item_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.get("/{item_id}/dependencies", response_model=DependencyNode)
def get_dependencies(
    item_id: str,
    quantity: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
):
    """Get the dependency tree for an item."""
    tree = build_dependency_tree(db, item_id, quantity)
    if not tree:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return tree


@router.get("/{item_id}/resources", response_model=list[ResourceCalculation])
def get_resources(
    item_id: str,
    quantity: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
):
    """Calculate total base resources needed for an item."""
    resources = calculate_total_resources(db, item_id, quantity)
    if not resources:
        recipe = get_recipe(db, item_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
    return resources


# Icons router (separate to avoid conflict with recipe IDs)
icons_router = APIRouter(prefix="/icons", tags=["icons"])


@icons_router.get("/{item_id}.png")
def get_icon(item_id: str):
    """Get icon for an item."""
    icon_path = ICONS_DIR / f"{item_id}.png"
    if not icon_path.exists():
        raise HTTPException(status_code=404, detail="Icon not found")
    return FileResponse(icon_path, media_type="image/png")
