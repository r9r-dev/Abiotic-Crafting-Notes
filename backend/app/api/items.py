"""
Routes API pour les items avec nouveau format JSONB.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.item_service import (
    get_item,
    search_items,
    get_items_by_source,
    get_categories,
    build_dependency_tree,
    calculate_total_resources,
)
from app.schemas.item import (
    ItemSearchResult,
    ItemDetail,
    DependencyNode,
    ResourceCalculation,
)

router = APIRouter(prefix="/items", tags=["items"])


@router.get("", response_model=list[ItemSearchResult])
def list_items(
    q: str = Query(default="", description="Recherche textuelle (nom, description)"),
    category: str | None = Query(default=None, description="Filtrer par catégorie"),
    source: str | None = Query(default=None, description="Filtrer par type de source (Baking, Crafting, etc.)"),
    limit: int = Query(default=100, ge=1, le=500, description="Nombre max de résultats"),
    db: Session = Depends(get_db),
):
    """
    Recherche et liste les items.

    La recherche est effectuée sur le nom et la description.
    Elle est insensible à la casse et aux accents.
    """
    return search_items(
        db,
        query=q if q else None,
        category=category,
        source_type=source,
        limit=limit,
    )


@router.get("/categories", response_model=list[str])
def list_categories(
    source: str | None = Query(default=None, description="Filtrer par type de source"),
    db: Session = Depends(get_db),
):
    """Récupère toutes les catégories, optionnellement filtrées par type de source."""
    return get_categories(db, source_type=source)


@router.get("/baking", response_model=list[ItemSearchResult])
def list_baking_items(
    q: str = Query(default="", description="Recherche textuelle"),
    category: str | None = Query(default=None, description="Filtrer par catégorie"),
    db: Session = Depends(get_db),
):
    """
    Liste les items obtenables par cuisson (Baking).

    Endpoint dédié pour le magasin Cuisine.
    """
    return get_items_by_source(db, "Baking", category=category, query=q if q else None)


@router.get("/crafting", response_model=list[ItemSearchResult])
def list_crafting_items(
    q: str = Query(default="", description="Recherche textuelle"),
    category: str | None = Query(default=None, description="Filtrer par catégorie"),
    db: Session = Depends(get_db),
):
    """
    Liste les items obtenables par assemblage (Crafting).

    Endpoint dédié pour le magasin Assemblage.
    """
    return get_items_by_source(db, "Crafting", category=category, query=q if q else None)


@router.get("/{item_id}", response_model=ItemDetail)
def get_item_by_id(item_id: str, db: Session = Depends(get_db)):
    """Récupère les détails complets d'un item par son ID."""
    item = get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    return item


@router.get("/{item_id}/dependencies", response_model=DependencyNode)
def get_dependencies(
    item_id: str,
    quantity: int = Query(default=1, ge=1, description="Quantité désirée"),
    db: Session = Depends(get_db),
):
    """Récupère l'arbre de dépendances pour un item."""
    tree = build_dependency_tree(db, item_id, quantity)
    if not tree:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    return tree


@router.get("/{item_id}/resources", response_model=list[ResourceCalculation])
def get_resources(
    item_id: str,
    quantity: int = Query(default=1, ge=1, description="Quantité désirée"),
    db: Session = Depends(get_db),
):
    """Calcule les ressources de base totales pour un item."""
    resources = calculate_total_resources(db, item_id, quantity)
    if not resources:
        item = get_item(db, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item non trouvé")
    return resources
