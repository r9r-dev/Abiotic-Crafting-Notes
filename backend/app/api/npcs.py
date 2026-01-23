import json
import unicodedata
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from app.database import get_db
from app.models import NPC, NpcLootTable, Item, Bench
from app.models.salvage import Salvage
from app.schemas.npc import (
    NPCResponse,
    NPCSearchResult,
    NPCSearchResponse,
    NPCLootTableResponse,
    NPCListResult,
    NPCListResponse,
    HPZones,
    CombatStats,
    MovementStats,
)
from app.schemas.item import (
    SalvageResponse,
    SalvageDropResponse,
    ItemMinimalResponse,
    BenchMinimalResponse,
)

router = APIRouter(prefix="/npcs", tags=["npcs"])


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


def _parse_json_list(json_str: str | None) -> list[str]:
    """Parse une chaine JSON en liste de strings."""
    if not json_str:
        return []
    try:
        result = json.loads(json_str)
        if isinstance(result, list):
            return [str(item) for item in result]
        return []
    except json.JSONDecodeError:
        return []


def _parse_damage_tags(json_str: str | None) -> list[str]:
    """Parse un GameplayTagQuery pour extraire les types de dégâts.

    Format attendu:
    {"TagDictionary": [{"TagName": "DamageType.Blunt"}, {"TagName": "DamageType.Fire"}], ...}

    Retourne: ["Blunt", "Fire"]
    """
    if not json_str:
        return []
    try:
        data = json.loads(json_str)
        if not isinstance(data, dict):
            return []

        tag_dict = data.get("TagDictionary", [])
        if not isinstance(tag_dict, list):
            return []

        damage_types = []
        for tag in tag_dict:
            if isinstance(tag, dict) and "TagName" in tag:
                tag_name = tag["TagName"]
                # Extraire le type après "DamageType."
                if tag_name.startswith("DamageType."):
                    damage_type = tag_name.replace("DamageType.", "")
                    damage_types.append(damage_type)

        return damage_types
    except json.JSONDecodeError:
        return []


def _build_salvage_response(
    db: Session,
    salvage: Salvage,
    bench_map: dict[str, Bench],
    items_cache: dict,
) -> SalvageResponse:
    """Construit une SalvageResponse avec les drops enrichis."""
    # Charger les items des drops
    drop_item_row_ids = [d.item_row_id for d in salvage.drops]
    if drop_item_row_ids:
        items_query = db.query(Item.row_id, Item.name, Item.icon_path).filter(
            Item.row_id.in_(drop_item_row_ids)
        ).all()
        for item in items_query:
            items_cache[item.row_id] = item

    # Construire les drops enrichis
    enriched_drops = []
    for drop in sorted(salvage.drops, key=lambda x: x.position):
        item_info = items_cache.get(drop.item_row_id)
        enriched_drops.append(SalvageDropResponse(
            item_row_id=drop.item_row_id,
            quantity_min=drop.quantity_min,
            quantity_max=drop.quantity_max,
            drop_chance=drop.drop_chance,
            position=drop.position,
            item=ItemMinimalResponse(
                row_id=drop.item_row_id,
                name=item_info.name if item_info else None,
                icon_path=item_info.icon_path if item_info else None,
            ) if item_info else None,
        ))

    # Bench pour le salvage
    bench_response = None
    if salvage.bench_row_id and salvage.bench_row_id in bench_map:
        bench = bench_map[salvage.bench_row_id]
        bench_response = BenchMinimalResponse(
            row_id=bench.row_id,
            name=bench.name,
            item_row_id=bench.item_row_id,
            tier=bench.tier,
        )

    return SalvageResponse(
        row_id=salvage.row_id,
        salvage_time=salvage.salvage_time,
        bench_row_id=salvage.bench_row_id,
        bench=bench_response,
        drops=enriched_drops,
    )


@router.get("/search", response_model=NPCSearchResponse)
def search_npcs(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    db: Session = Depends(get_db),
):
    """
    Recherche de NPCs par nom ou description.
    Retourne jusqu'a 20 resultats.
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
        accents_from = "aaaeeeeiioouucAAAEEEEIIOOUUC"
        accents_to = "aaaeeeeiioouucAAAEEEEIIOOUUC"
        normalized = func.translate(func.lower(normalized), accents_from, accents_to)
        return normalized

    # Utiliser COALESCE pour gerer les NULL
    results = db.query(NPC).filter(
        or_(
            normalize_column(func.coalesce(NPC.name, '')).like(search_normalized),
            normalize_column(func.coalesce(NPC.description, '')).like(search_normalized),
            normalize_column(NPC.row_id).like(search_normalized),
        )
    ).order_by(
        # Prioriser les correspondances sur le nom
        normalize_column(func.coalesce(NPC.name, '')).like(search_normalized).desc(),
        NPC.name,
    ).limit(20).all()

    return NPCSearchResponse(
        query=q,
        count=len(results),
        results=[
            NPCSearchResult(
                type="npc",
                row_id=npc.row_id,
                name=npc.name,
                description=npc.description,
                category=npc.category,
                is_hostile=npc.is_hostile,
                is_passive=npc.is_passive,
                icon_path=npc.icon_path,
            )
            for npc in results
        ],
    )


@router.get("/list", response_model=NPCListResponse)
def list_npcs(
    skip: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=100),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Liste les NPCs avec pagination et filtres."""
    query = db.query(NPC)

    if category:
        query = query.filter(NPC.category == category)

    total = query.count()
    results = query.order_by(NPC.name).offset(skip).limit(limit).all()

    return NPCListResponse(
        npcs=[NPCListResult(
            row_id=npc.row_id,
            name=npc.name,
            description=npc.description,
            category=npc.category,
            is_hostile=npc.is_hostile,
            is_passive=npc.is_passive,
            icon_path=npc.icon_path,
        ) for npc in results],
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + limit) < total,
    )


@router.get("/{row_id}", response_model=NPCResponse)
def get_npc(row_id: str, db: Session = Depends(get_db)):
    """
    Recupere un NPC par son row_id avec toutes ses relations.
    Inclut les loot tables avec leurs salvages resolus.
    """
    # Charger le NPC avec ses loot tables
    npc = db.query(NPC).options(
        joinedload(NPC.loot_tables)
    ).filter(NPC.row_id == row_id).first()

    if not npc:
        raise HTTPException(status_code=404, detail=f"NPC '{row_id}' non trouvé")

    # Cache pour les items lies
    items_cache: dict = {}
    bench_map: dict[str, Bench] = {}

    # Collecter tous les salvage_row_id des loot tables
    salvage_row_ids = [lt.salvage_row_id for lt in npc.loot_tables if lt.salvage_row_id]

    # Charger tous les salvages en une seule requete
    salvages: dict[str, Salvage] = {}
    if salvage_row_ids:
        salvage_list = db.query(Salvage).options(
            joinedload(Salvage.drops)
        ).filter(Salvage.row_id.in_(salvage_row_ids)).all()
        salvages = {s.row_id: s for s in salvage_list}

        # Collecter les bench_row_ids
        bench_row_ids = {s.bench_row_id for s in salvage_list if s.bench_row_id}
        if bench_row_ids:
            benches = db.query(Bench).filter(Bench.row_id.in_(bench_row_ids)).all()
            bench_map = {b.row_id: b for b in benches}

    # Construire les loot tables avec salvages resolus
    loot_tables_response = []
    for lt in sorted(npc.loot_tables, key=lambda x: x.position):
        salvage_response = None
        if lt.salvage_row_id and lt.salvage_row_id in salvages:
            salvage = salvages[lt.salvage_row_id]
            salvage_response = _build_salvage_response(db, salvage, bench_map, items_cache)

        loot_tables_response.append(NPCLootTableResponse(
            loot_type=lt.loot_type,
            salvage=salvage_response,
        ))

    # Construire la reponse finale
    return NPCResponse(
        id=npc.id,
        row_id=npc.row_id,
        name=npc.name,
        description=npc.description,
        icon_path=npc.icon_path,
        hp_zones=HPZones(
            head=npc.hp_head,
            body=npc.hp_body,
            limbs=npc.hp_limbs,
        ),
        combat=CombatStats(
            melee_attack_damage=npc.melee_attack_damage,
            ranged_attack_damage=npc.ranged_attack_damage,
            attack_range=npc.attack_range,
        ),
        movement=MovementStats(
            default_walk_speed=npc.default_walk_speed,
            default_run_speed=npc.default_run_speed,
        ),
        is_hostile=npc.is_hostile,
        is_passive=npc.is_passive,
        aggro_range=npc.aggro_range,
        damage_resistances=_parse_damage_tags(npc.damage_resistances),
        damage_weaknesses=_parse_damage_tags(npc.damage_weaknesses),
        category=npc.category,
        spawn_weight=npc.spawn_weight,
        loot_tables=loot_tables_response,
    )
