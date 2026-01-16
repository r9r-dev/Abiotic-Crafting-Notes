"""
Routes API pour les recettes - compatibilité avec l'ancien frontend.

Ce module maintient la compatibilité avec l'ancien format pendant la transition.
Les nouvelles fonctionnalités utilisent /api/items.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import os

from app.database import get_db
from app.services.item_service import (
    get_item,
    search_recipes_compat,
    get_categories,
    build_dependency_tree,
    calculate_total_resources,
)
from app.schemas.item import RecipeSearchResult, DependencyNode, ResourceCalculation

router = APIRouter(prefix="/recipes", tags=["recipes"])

# Icons directory
_default_icons = Path("/app/data/icons") if Path("/app/data").exists() else Path(__file__).parent.parent.parent.parent / "data" / "icons"
ICONS_DIR = Path(os.environ.get("ICONS_PATH", str(_default_icons)))


# Schéma de compatibilité pour les recettes détaillées
from pydantic import BaseModel
from typing import Optional


class IngredientCompat(BaseModel):
    item_id: str
    item_name: str
    item_name_fr: Optional[str] = None
    quantity: int


class RecipeVariantCompat(BaseModel):
    ingredients: list[IngredientCompat]
    station: Optional[str] = None


class RecipeCompat(BaseModel):
    """Format de recette compatible avec l'ancien frontend."""
    id: str
    name: str
    name_fr: Optional[str] = None
    description_fr: Optional[str] = None
    icon_url: Optional[str] = None
    icon_local: Optional[str] = None
    category: str
    weight: Optional[float] = None
    stack_size: Optional[int] = None
    durability: Optional[int] = None
    variants: list[RecipeVariantCompat] = []
    repair_material: Optional[str] = None
    repair_quantity: Optional[int] = None
    wiki_url: Optional[str] = None


def _item_to_recipe_compat(item_detail) -> RecipeCompat:
    """Convertit un ItemDetail en RecipeCompat."""
    variants = []
    for v in item_detail.variants:
        ingredients = [
            IngredientCompat(
                item_id=ing.item_id,
                item_name=ing.item_name,
                item_name_fr=ing.item_name,  # Même valeur car déjà FR
                quantity=ing.quantity,
            )
            for ing in v.ingredients
        ]
        variants.append(RecipeVariantCompat(ingredients=ingredients, station=v.station))

    return RecipeCompat(
        id=item_detail.id,
        name=item_detail.name,
        name_fr=item_detail.name,  # Même valeur car déjà FR
        description_fr=item_detail.description,
        icon_url=item_detail.icon_url,
        icon_local=item_detail.icon_local,
        category=item_detail.category,
        weight=item_detail.weight,
        stack_size=item_detail.stack_size,
        durability=item_detail.durability,
        variants=variants,
        repair_material=item_detail.repair_item,
        repair_quantity=item_detail.repair_quantity,
        wiki_url=item_detail.wiki_url,
    )


@router.get("", response_model=list[RecipeSearchResult])
def list_recipes(
    q: str = Query(default="", description="Search query (accent-insensitive)"),
    category: str | None = Query(default=None, description="Filter by category"),
    craftable_only: bool = Query(default=True, description="Only return craftable items"),
    source: str | None = Query(default=None, description="Filter by source type"),
    db: Session = Depends(get_db),
):
    """
    Search and list recipes.

    Compatible avec l'ancien format frontend (name_fr = name).
    """
    return search_recipes_compat(
        db,
        query=q if q else None,
        category=category,
        craftable_only=craftable_only,
        source_type=source,
    )


@router.get("/categories", response_model=list[str])
def list_categories(
    source: str | None = Query(default=None, description="Filter by source type"),
    db: Session = Depends(get_db),
):
    """Get all recipe categories."""
    return get_categories(db, source_type=source)


@router.get("/{item_id}", response_model=RecipeCompat)
def get_recipe_by_id(item_id: str, db: Session = Depends(get_db)):
    """Get a recipe by its ID."""
    item = get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _item_to_recipe_compat(item)


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
        item = get_item(db, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Recipe not found")
    return resources


# Icons router
icons_router = APIRouter(prefix="/icons", tags=["icons"])


@icons_router.get("/{item_id}.png")
def get_icon(item_id: str):
    """Get icon for an item."""
    icon_path = ICONS_DIR / f"{item_id}.png"
    if not icon_path.exists():
        raise HTTPException(status_code=404, detail="Icon not found")
    return FileResponse(icon_path, media_type="image/png")
