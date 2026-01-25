import unicodedata
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from app.database import get_db
from app.models import (
    CompendiumEntry,
    CompendiumSection,
    CompendiumRecipeUnlock,
    CompendiumCategory,
    NPC,
    Recipe,
)
from app.schemas.compendium import (
    CompendiumSearchResult,
    CompendiumSearchResponse,
    CompendiumListResult,
    CompendiumListResponse,
    CompendiumSectionResponse,
    CompendiumRecipeUnlockResponse,
    CompendiumNPCLink,
    CompendiumResponse,
)

router = APIRouter(prefix="/compendium", tags=["compendium"])


def normalize_search_text(text: str) -> str:
    """Normalise le texte pour la recherche (accents, ligatures, points)."""
    text = text.replace("oe", "oe").replace("OE", "OE")
    text = text.replace("ae", "ae").replace("AE", "AE")
    text = text.replace(".", "")
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    return text


@router.get("/search", response_model=CompendiumSearchResponse)
def search_compendium(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    category: Optional[str] = Query(None, description="Filtrer par categorie"),
    db: Session = Depends(get_db),
):
    """
    Recherche d'entrées du Compendium par titre ou sous-titre.
    Retourne jusqu'a 20 resultats.
    """
    search_normalized = f"%{normalize_search_text(q.lower())}%"

    def normalize_column(col):
        normalized = func.replace(func.replace(col, "oe", "oe"), "OE", "OE")
        normalized = func.replace(func.replace(normalized, "ae", "ae"), "AE", "AE")
        normalized = func.replace(normalized, ".", "")
        accents_from = "àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ"
        accents_to = "aaaeeeeiioouucAAAEEEEIIOOUUC"
        normalized = func.translate(func.lower(normalized), accents_from, accents_to)
        return normalized

    query = db.query(CompendiumEntry).filter(
        or_(
            normalize_column(func.coalesce(CompendiumEntry.title, '')).like(search_normalized),
            normalize_column(func.coalesce(CompendiumEntry.subtitle, '')).like(search_normalized),
            normalize_column(CompendiumEntry.row_id).like(search_normalized),
        )
    )

    if category:
        try:
            cat_enum = CompendiumCategory(category)
            query = query.filter(CompendiumEntry.category == cat_enum)
        except ValueError:
            pass

    results = query.order_by(
        normalize_column(func.coalesce(CompendiumEntry.title, '')).like(search_normalized).desc(),
        CompendiumEntry.title,
    ).limit(20).all()

    return CompendiumSearchResponse(
        query=q,
        count=len(results),
        results=[
            CompendiumSearchResult(
                type="compendium",
                row_id=entry.row_id,
                title=entry.title,
                subtitle=entry.subtitle,
                category=entry.category.value,
                image_path=entry.image_path,
                npc_row_id=entry.npc_row_id,
            )
            for entry in results
        ],
    )


@router.get("/list", response_model=CompendiumListResponse)
def list_compendium(
    category: Optional[str] = Query(None, description="Filtrer par catégorie"),
    skip: int = Query(0, ge=0, description="Nombre d'entrées à sauter"),
    limit: int = Query(50, ge=1, le=100, description="Nombre d'entrées à retourner"),
    db: Session = Depends(get_db),
):
    """
    Liste les entrées du Compendium avec pagination.
    """
    query = db.query(CompendiumEntry)

    if category:
        try:
            cat_enum = CompendiumCategory(category)
            query = query.filter(CompendiumEntry.category == cat_enum)
        except ValueError:
            pass

    total = query.count()
    entries = query.order_by(CompendiumEntry.title).offset(skip).limit(limit).all()

    return CompendiumListResponse(
        entries=[
            CompendiumListResult(
                row_id=entry.row_id,
                title=entry.title,
                subtitle=entry.subtitle,
                category=entry.category.value,
                image_path=entry.image_path,
                npc_row_id=entry.npc_row_id,
                has_kill_requirement=entry.has_kill_requirement,
            )
            for entry in entries
        ],
        total=total,
        skip=skip,
        limit=limit,
        has_more=skip + limit < total,
    )


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """
    Retourne les categories disponibles avec leur nombre d'entrées.
    """
    categories = {}
    for cat in CompendiumCategory:
        count = db.query(CompendiumEntry).filter(
            CompendiumEntry.category == cat
        ).count()
        categories[cat.value] = count

    return categories


@router.get("/by-npc/{npc_row_id}", response_model=Optional[CompendiumResponse])
def get_compendium_by_npc(
    npc_row_id: str,
    db: Session = Depends(get_db),
):
    """
    Recupere l'entree du Compendium liee a un NPC.
    """
    entry = db.query(CompendiumEntry).options(
        joinedload(CompendiumEntry.sections),
        joinedload(CompendiumEntry.recipe_unlocks),
    ).filter(
        CompendiumEntry.npc_row_id == npc_row_id
    ).first()

    if not entry:
        return None

    return _build_compendium_response(db, entry)


@router.get("/{row_id}", response_model=CompendiumResponse)
def get_compendium_entry(
    row_id: str,
    db: Session = Depends(get_db),
):
    """
    Recupere une entree du Compendium par son row_id.
    """
    entry = db.query(CompendiumEntry).options(
        joinedload(CompendiumEntry.sections),
        joinedload(CompendiumEntry.recipe_unlocks),
    ).filter(
        CompendiumEntry.row_id == row_id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail=f"Entrée du Compendium '{row_id}' non trouvée")

    return _build_compendium_response(db, entry)


def _build_compendium_response(db: Session, entry: CompendiumEntry) -> CompendiumResponse:
    """Construit une reponse complète pour une entree du Compendium."""
    # Charger le NPC lie si existe
    npc_link = None
    if entry.npc_row_id:
        npc = db.query(NPC).filter(NPC.row_id == entry.npc_row_id).first()
        if npc:
            npc_link = CompendiumNPCLink(
                row_id=npc.row_id,
                name=npc.name,
                icon_path=npc.icon_path,
            )

    # Charger les noms des recettes
    recipe_unlocks = []
    for unlock in entry.recipe_unlocks:
        recipe = db.query(Recipe).filter(Recipe.row_id == unlock.recipe_row_id).first()
        recipe_unlocks.append(CompendiumRecipeUnlockResponse(
            recipe_row_id=unlock.recipe_row_id,
            recipe_name=recipe.name if recipe else None,
            from_kill_section=unlock.from_kill_section,
        ))

    return CompendiumResponse(
        row_id=entry.row_id,
        title=entry.title,
        subtitle=entry.subtitle,
        category=entry.category.value,
        image_path=entry.image_path,
        npc_row_id=entry.npc_row_id,
        npc=npc_link,
        sections=[
            CompendiumSectionResponse(
                position=section.position,
                unlock_type=section.unlock_type.value,
                text=section.text,
                image_path=section.image_path,
            )
            for section in sorted(entry.sections, key=lambda s: s.position)
        ],
        has_kill_requirement=entry.has_kill_requirement,
        kill_required_count=entry.kill_required_count,
        kill_section_text=entry.kill_section_text,
        kill_section_image_path=entry.kill_section_image_path,
        recipe_unlocks=recipe_unlocks,
    )
