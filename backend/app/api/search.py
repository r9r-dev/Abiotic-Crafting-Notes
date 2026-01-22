import unicodedata
from typing import Optional, List

from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models import Item, NPC


router = APIRouter(prefix="/search", tags=["search"])


def normalize_search_text(text: str) -> str:
    """Normalise le texte pour la recherche (accents, ligatures, points)."""
    # Remplacer les ligatures
    text = text.replace("oe", "oe").replace("OE", "OE")
    text = text.replace("ae", "ae").replace("AE", "AE")
    # Supprimer les points (pour F.O.R.G.E. -> FORGE)
    text = text.replace(".", "")
    # Supprimer les accents
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    return text


class UnifiedSearchResult(BaseModel):
    """Resultat de recherche unifie (item ou NPC)."""
    type: str  # 'item' ou 'npc'
    row_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    icon_path: Optional[str] = None
    category: Optional[str] = None
    # Champs specifiques NPC
    is_hostile: Optional[bool] = None
    is_passive: Optional[bool] = None

    class Config:
        from_attributes = True


class UnifiedSearchResponse(BaseModel):
    """Reponse de recherche unifiee."""
    query: str
    count: int
    results: List[UnifiedSearchResult]


@router.get("", response_model=UnifiedSearchResponse)
def unified_search(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    db: Session = Depends(get_db),
):
    """
    Recherche unifiee d'items et de NPCs.
    Retourne jusqu'a 15 items et 5 NPCs.
    """
    # Normaliser le terme de recherche
    search_normalized = f"%{normalize_search_text(q.lower())}%"

    # Fonction SQL pour normaliser le texte
    def normalize_column(col):
        # Remplacer ligatures
        normalized = func.replace(func.replace(col, "oe", "oe"), "OE", "OE")
        normalized = func.replace(func.replace(normalized, "ae", "ae"), "AE", "AE")
        # Supprimer les points
        normalized = func.replace(normalized, ".", "")
        # Supprimer les accents (caracteres francais courants)
        accents_from = "àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ"
        accents_to = "aaaeeeeiioouucAAAEEEEIIOOUUC"
        normalized = func.translate(func.lower(normalized), accents_from, accents_to)
        return normalized

    # Rechercher les items (max 15)
    items = db.query(Item).filter(
        or_(
            normalize_column(Item.name).like(search_normalized),
            normalize_column(Item.description).like(search_normalized),
        )
    ).order_by(
        normalize_column(Item.name).like(search_normalized).desc(),
        Item.name,
    ).limit(15).all()

    # Rechercher les NPCs (max 5)
    # Utiliser COALESCE pour gerer les NULL
    npcs = db.query(NPC).filter(
        or_(
            normalize_column(func.coalesce(NPC.name, '')).like(search_normalized),
            normalize_column(func.coalesce(NPC.description, '')).like(search_normalized),
            normalize_column(NPC.row_id).like(search_normalized),
        )
    ).order_by(
        normalize_column(func.coalesce(NPC.name, '')).like(search_normalized).desc(),
        NPC.name,
    ).limit(5).all()

    # Combiner les resultats
    results: List[UnifiedSearchResult] = []

    # Ajouter les items
    for item in items:
        results.append(UnifiedSearchResult(
            type="item",
            row_id=item.row_id,
            name=item.name,
            description=item.description,
            icon_path=item.icon_path,
            category=item.category.value if item.category else None,
            is_hostile=None,
            is_passive=None,
        ))

    # Ajouter les NPCs
    for npc in npcs:
        results.append(UnifiedSearchResult(
            type="npc",
            row_id=npc.row_id,
            name=npc.name,
            description=npc.description,
            icon_path=None,  # NPCs n'ont pas d'icone pour l'instant
            category=npc.category,
            is_hostile=npc.is_hostile,
            is_passive=npc.is_passive,
        ))

    return UnifiedSearchResponse(
        query=q,
        count=len(results),
        results=results,
    )
