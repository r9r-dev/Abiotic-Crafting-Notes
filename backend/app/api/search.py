import unicodedata
from typing import Optional, List

from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, literal, union_all, case, cast, String

from app.database import get_db
from app.models import Item, NPC, CompendiumEntry


router = APIRouter(prefix="/search", tags=["search"])


def normalize_search_text(text: str) -> str:
    """Normalise le texte pour la recherche (accents, ligatures, points)."""
    # Remplacer les ligatures
    text = text.replace("œ", "oe").replace("Œ", "OE")
    text = text.replace("æ", "ae").replace("Æ", "AE")
    # Supprimer les points
    text = text.replace(".", "")
    # Supprimer les accents
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    return text


class UnifiedSearchResult(BaseModel):
    """Resultat de recherche unifie (item, NPC ou Compendium)."""
    type: str
    row_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    icon_path: Optional[str] = None
    category: Optional[str] = None
    is_hostile: Optional[bool] = None
    is_passive: Optional[bool] = None
    # Compendium specific
    title: Optional[str] = None
    subtitle: Optional[str] = None

    class Config:
        from_attributes = True


class UnifiedSearchResponse(BaseModel):
    """Reponse de recherche unifiee."""
    query: str
    count: int
    results: List[UnifiedSearchResult]


def _normalize_column(col):
    """Normalise une colonne SQL pour la recherche."""
    # Remplacer les ligatures
    normalized = func.replace(func.replace(col, "œ", "oe"), "Œ", "OE")
    normalized = func.replace(func.replace(normalized, "æ", "ae"), "Æ", "AE")
    # Supprimer les points
    normalized = func.replace(normalized, ".", "")
    # Supprimer les accents
    accents_from = "àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ"
    accents_to = "aaaeeeeiioouucAAAEEEEIIOOUUC"
    normalized = func.translate(func.lower(normalized), accents_from, accents_to)
    return normalized


def _build_relevance_score(name_col, desc_col, rowid_col, search_term: str):
    """
    Construit un score de pertinence avec priorite aux mots entiers.

    Scores :
    - 1000 : nom exact
    - 200 : mot entier dans le nom
    - 50 : contient dans le nom
    - 20 : mot entier dans la description
    - 5 : contient dans la description
    - 1 : contient dans le row_id
    """
    term = normalize_search_text(search_term.lower())

    # Patterns pour la recherche
    contains = f"%{term}%"
    word_start = f"{term} %"      # mot en debut
    word_end = f"% {term}"        # mot en fin
    word_middle = f"% {term} %"   # mot au milieu
    exact = term                   # correspondance exacte

    name_norm = _normalize_column(func.coalesce(name_col, ''))
    desc_norm = _normalize_column(func.coalesce(desc_col, ''))
    rowid_norm = _normalize_column(rowid_col)

    # Score pour le nom
    name_score = (
        # Nom exact
        case((name_norm == exact, 1000), else_=0) +
        # Mot entier dans le nom (debut, fin ou milieu)
        case((name_norm.like(word_start), 200), else_=0) +
        case((name_norm.like(word_end), 200), else_=0) +
        case((name_norm.like(word_middle), 200), else_=0) +
        # Contient dans le nom (mais pas mot entier - eviter double comptage)
        case((
            (name_norm.like(contains)) &
            ~(name_norm == exact) &
            ~(name_norm.like(word_start)) &
            ~(name_norm.like(word_end)) &
            ~(name_norm.like(word_middle)),
            50
        ), else_=0)
    )

    # Score pour la description
    desc_score = (
        # Mot entier dans la description
        case((desc_norm.like(word_start), 20), else_=0) +
        case((desc_norm.like(word_end), 20), else_=0) +
        case((desc_norm.like(word_middle), 20), else_=0) +
        # Contient dans la description
        case((
            (desc_norm.like(contains)) &
            ~(desc_norm.like(word_start)) &
            ~(desc_norm.like(word_end)) &
            ~(desc_norm.like(word_middle)),
            5
        ), else_=0)
    )

    # Score pour le row_id
    rowid_score = case((rowid_norm.like(contains), 1), else_=0)

    return name_score + desc_score + rowid_score


@router.get("", response_model=UnifiedSearchResponse)
def unified_search(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    db: Session = Depends(get_db),
):
    """
    Recherche unifiee d'items et de NPCs avec tri par pertinence.
    Priorite aux correspondances de mots entiers.
    """
    # Sous-requete pour les items
    item_relevance = _build_relevance_score(
        Item.name, Item.description, Item.row_id, q
    )

    items_query = db.query(
        literal('item').label('type'),
        Item.row_id.label('row_id'),
        Item.name.label('name'),
        Item.description.label('description'),
        Item.icon_path.label('icon_path'),
        func.lower(cast(Item.category, String)).label('category'),
        literal(None).label('is_hostile'),
        literal(None).label('is_passive'),
        literal(None).label('title'),
        literal(None).label('subtitle'),
        item_relevance.label('relevance'),
    ).filter(
        item_relevance > 0
    )

    # Sous-requete pour les NPCs
    npc_relevance = _build_relevance_score(
        NPC.name, NPC.description, NPC.row_id, q
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
        literal(None).label('title'),
        literal(None).label('subtitle'),
        npc_relevance.label('relevance'),
    ).filter(
        npc_relevance > 0
    )

    # Sous-requete pour le Compendium
    compendium_relevance = _build_relevance_score(
        CompendiumEntry.title, CompendiumEntry.subtitle, CompendiumEntry.row_id, q
    )

    compendium_query = db.query(
        literal('compendium').label('type'),
        CompendiumEntry.row_id.label('row_id'),
        literal(None).label('name'),
        literal(None).label('description'),
        CompendiumEntry.image_path.label('icon_path'),
        cast(CompendiumEntry.category, String).label('category'),
        literal(None).label('is_hostile'),
        literal(None).label('is_passive'),
        CompendiumEntry.title.label('title'),
        CompendiumEntry.subtitle.label('subtitle'),
        compendium_relevance.label('relevance'),
    ).filter(
        compendium_relevance > 0
    )

    # UNION des trois requetes
    combined = union_all(items_query, npcs_query, compendium_query).alias('combined')

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
                title=r.title,
                subtitle=r.subtitle,
            )
            for r in results
        ],
    )
