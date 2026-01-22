import unicodedata
from typing import Optional, List

from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, literal, union_all, case, cast, String

from app.database import get_db
from app.models import Item, NPC


router = APIRouter(prefix="/search", tags=["search"])


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


class UnifiedSearchResult(BaseModel):
    """Resultat de recherche unifie (item ou NPC)."""
    type: str
    row_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    icon_path: Optional[str] = None
    category: Optional[str] = None
    is_hostile: Optional[bool] = None
    is_passive: Optional[bool] = None

    class Config:
        from_attributes = True


class UnifiedSearchResponse(BaseModel):
    """Reponse de recherche unifiee."""
    query: str
    count: int
    results: List[UnifiedSearchResult]


def _normalize_column(col):
    """Normalise une colonne SQL pour la recherche."""
    normalized = func.replace(func.replace(col, "oe", "oe"), "OE", "OE")
    normalized = func.replace(func.replace(normalized, "ae", "ae"), "AE", "AE")
    normalized = func.replace(normalized, ".", "")
    accents_from = "àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ"
    accents_to = "aaaeeeeiioouucAAAEEEEIIOOUUC"
    normalized = func.translate(func.lower(normalized), accents_from, accents_to)
    return normalized


@router.get("", response_model=UnifiedSearchResponse)
def unified_search(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    db: Session = Depends(get_db),
):
    """
    Recherche unifiee d'items et de NPCs avec tri par pertinence.
    Les resultats sont melanges et tries par score de pertinence.
    """
    search_normalized = f"%{normalize_search_text(q.lower())}%"

    # Score de pertinence :
    # - 100 si le nom contient le terme
    # - 10 si la description contient le terme
    # - 1 si le row_id contient le terme

    # Sous-requete pour les items
    item_name_norm = _normalize_column(func.coalesce(Item.name, ''))
    item_desc_norm = _normalize_column(func.coalesce(Item.description, ''))
    item_rowid_norm = _normalize_column(Item.row_id)

    item_relevance = (
        case((item_name_norm.like(search_normalized), 100), else_=0) +
        case((item_desc_norm.like(search_normalized), 10), else_=0) +
        case((item_rowid_norm.like(search_normalized), 1), else_=0)
    )

    items_query = db.query(
        literal('item').label('type'),
        Item.row_id.label('row_id'),
        Item.name.label('name'),
        Item.description.label('description'),
        Item.icon_path.label('icon_path'),
        cast(Item.category, String).label('category'),
        literal(None).label('is_hostile'),
        literal(None).label('is_passive'),
        item_relevance.label('relevance'),
    ).filter(
        item_relevance > 0
    )

    # Sous-requete pour les NPCs
    npc_name_norm = _normalize_column(func.coalesce(NPC.name, ''))
    npc_desc_norm = _normalize_column(func.coalesce(NPC.description, ''))
    npc_rowid_norm = _normalize_column(NPC.row_id)

    npc_relevance = (
        case((npc_name_norm.like(search_normalized), 100), else_=0) +
        case((npc_desc_norm.like(search_normalized), 10), else_=0) +
        case((npc_rowid_norm.like(search_normalized), 1), else_=0)
    )

    npcs_query = db.query(
        literal('npc').label('type'),
        NPC.row_id.label('row_id'),
        NPC.name.label('name'),
        NPC.description.label('description'),
        literal(None).label('icon_path'),
        NPC.category.label('category'),
        NPC.is_hostile.label('is_hostile'),
        NPC.is_passive.label('is_passive'),
        npc_relevance.label('relevance'),
    ).filter(
        npc_relevance > 0
    )

    # UNION des deux requetes
    combined = union_all(items_query, npcs_query).alias('combined')

    # Requete finale triee par pertinence
    results = db.query(combined).order_by(
        combined.c.relevance.desc(),
        combined.c.name,
    ).limit(20).all()

    return UnifiedSearchResponse(
        query=q,
        count=len(results),
        results=[
            UnifiedSearchResult(
                type=r.type,
                row_id=r.row_id,
                name=r.name,
                description=r.description,
                icon_path=r.icon_path,
                category=r.category,
                is_hostile=r.is_hostile,
                is_passive=r.is_passive,
            )
            for r in results
        ],
    )
