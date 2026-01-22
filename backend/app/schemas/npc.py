from pydantic import BaseModel, field_validator
from typing import Optional, List

from app.schemas.item import SalvageResponse


class NPCMinimalResponse(BaseModel):
    """NPC minimal pour les references."""
    row_id: str
    name: Optional[str] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True


class NPCSearchResult(BaseModel):
    """Resultat de recherche NPC."""
    type: str = "npc"
    row_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_hostile: bool = True
    is_passive: bool = False

    class Config:
        from_attributes = True


class NPCSearchResponse(BaseModel):
    """Reponse de recherche NPC."""
    query: str
    count: int
    results: List[NPCSearchResult]


class NPCLootTableResponse(BaseModel):
    """Loot table d'un NPC."""
    loot_type: str
    salvage: Optional[SalvageResponse] = None

    class Config:
        from_attributes = True


class HPZones(BaseModel):
    """Points de vie par zone."""
    head: float
    body: float
    limbs: float


class CombatStats(BaseModel):
    """Stats de combat."""
    melee_attack_damage: float
    ranged_attack_damage: float
    attack_range: float


class MovementStats(BaseModel):
    """Stats de mouvement."""
    default_walk_speed: float
    default_run_speed: float


class NPCResponse(BaseModel):
    """NPC complet avec toutes les relations."""
    id: int
    row_id: str
    name: Optional[str] = None
    description: Optional[str] = None

    # HP par zone
    hp_zones: HPZones

    # Combat
    combat: CombatStats

    # Mouvement
    movement: MovementStats

    # Comportement
    is_hostile: bool = True
    is_passive: bool = False
    aggro_range: float = 0.0

    # Resistances/Faiblesses (listes de strings)
    damage_resistances: List[str] = []
    damage_weaknesses: List[str] = []

    # Spawn
    category: Optional[str] = None
    spawn_weight: float = 1.0

    # Loot tables
    loot_tables: List[NPCLootTableResponse] = []

    class Config:
        from_attributes = True
