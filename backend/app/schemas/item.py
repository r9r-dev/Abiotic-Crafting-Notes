from pydantic import BaseModel, field_validator
from typing import Optional, List
from enum import Enum


class ItemSearchResult(BaseModel):
    """Résultat de recherche simplifié."""
    row_id: str
    category: str
    name: Optional[str] = None
    description: Optional[str] = None
    icon_path: Optional[str] = None

    class Config:
        from_attributes = True


class ItemSearchResponse(BaseModel):
    """Réponse de recherche avec liste de résultats."""
    query: str
    count: int
    results: List[ItemSearchResult]


class ItemListResult(BaseModel):
    """Resultat pour la galerie."""
    row_id: str
    category: str
    name: Optional[str] = None
    description: Optional[str] = None
    icon_path: Optional[str] = None
    gameplay_tags: Optional[str] = None

    class Config:
        from_attributes = True


class ItemListResponse(BaseModel):
    """Reponse paginee pour la galerie."""
    items: List[ItemListResult]
    total: int
    skip: int
    limit: int
    has_more: bool


class ItemCategory(str, Enum):
    WEAPON = "weapon"
    EQUIPMENT = "equipment"
    CONSUMABLE = "consumable"
    DEPLOYABLE = "deployable"
    DEPLOYABLE_SMALL = "deployable_small"
    CRAFTING_BENCH = "crafting_bench"
    PICKUP = "pickup"
    PLANT = "plant"
    PET = "pet"


class ReleaseGroup(str, Enum):
    CORE = "Core"
    DARK_ENERGY = "DarkEnergy"
    COMMUNITY = "Community"


class EquipSlot(str, Enum):
    HEAD = "Head"
    TORSO = "Torso"
    SUIT = "Suit"
    LEGS = "Legs"
    FEET = "Feet"
    HANDS = "Hands"
    BACK = "Back"
    FACE = "Face"
    ACCESSORY = "Accessory"


class DecayTemperature(str, Enum):
    NONE = "None"
    COLD = "Cold"
    WARM = "Warm"
    HOT = "Hot"


# Sous-types schemas

class LinkedItemResponse(BaseModel):
    """Item lie (ammo, projectile, cooked, etc.)."""
    row_id: str
    name: Optional[str] = None
    icon_path: Optional[str] = None
    requires_baking: Optional[bool] = None  # Utilise pour les sources de transformation

    class Config:
        from_attributes = True


class BuffResponse(BaseModel):
    """Buff ou debuff."""
    row_id: str
    name: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class UpgradeTreeNode(BaseModel):
    """Noeud dans l'arbre d'améliorations."""
    row_id: str
    name: Optional[str] = None
    icon_path: Optional[str] = None
    children: List["UpgradeTreeNode"] = []

    class Config:
        from_attributes = True


UpgradeTreeNode.model_rebuild()


class WeaponResponse(BaseModel):
    is_melee: bool
    damage_per_hit: float
    damage_type: Optional[str] = None
    time_between_shots: float
    burst_fire_count: int
    bullet_spread_min: float
    bullet_spread_max: float
    max_aim_correction: float
    recoil_amount: float
    maximum_hitscan_range: float
    magazine_size: int
    require_ammo: bool
    ammo_type_row_id: Optional[str] = None
    ammo_item: Optional[LinkedItemResponse] = None
    projectile_row_id: Optional[str] = None
    pellet_count: int
    tracer_per_shots: int
    loudness_primary: float
    loudness_secondary: float
    secondary_attack_type: Optional[str] = None
    underwater_state: Optional[str] = None

    class Config:
        from_attributes = True


class EquipmentResponse(BaseModel):
    equip_slot: Optional[EquipSlot] = None
    can_auto_equip: bool
    armor_bonus: int
    heat_resist: int
    cold_resist: int
    damage_mitigation_types: Optional[str] = None
    is_container: bool
    container_capacity: int
    container_weight_reduction: float
    set_bonus_row_id: Optional[str] = None

    class Config:
        from_attributes = True


class ConsumableResponse(BaseModel):
    time_to_consume: float
    hunger_fill: float
    thirst_fill: float
    fatigue_fill: float
    continence_fill: float
    sanity_fill: float
    health_change: float
    armor_change: float
    temperature_change: float
    radiation_change: float
    radioactivity: float
    buffs_to_add: List[BuffResponse] = []
    buffs_to_remove: List[BuffResponse] = []
    consumable_tag: Optional[str] = None
    consumed_action: Optional[str] = None
    can_be_cooked: bool
    is_cookware: bool
    cooked_item_row_id: Optional[str] = None
    cooked_item: Optional[LinkedItemResponse] = None
    burned_item_row_id: Optional[str] = None
    burned_item: Optional[LinkedItemResponse] = None
    time_to_cook_baseline: float
    time_to_burn_baseline: float
    requires_baking: bool
    starting_portions: int
    can_item_decay: bool
    item_decay_temperature: Optional[DecayTemperature] = None
    decay_to_item_row_id: Optional[str] = None
    decay_to_item: Optional[LinkedItemResponse] = None
    max_liquid: int
    allowed_liquids: Optional[str] = None
    # Relations inverses de transformation
    cooked_from: List[LinkedItemResponse] = []
    burned_from: List[LinkedItemResponse] = []
    decayed_from: List[LinkedItemResponse] = []

    class Config:
        from_attributes = True


class DeployableResponse(BaseModel):
    deployed_class_path: Optional[str] = None
    placement_orientations: Optional[str] = None
    hologram_mesh_path: Optional[str] = None
    hologram_scale: float
    is_small: bool
    is_crafting_bench: bool
    texture_variant_row_id: Optional[str] = None

    class Config:
        from_attributes = True


# Schemas pour les ingredients enrichis

class IngredientItemResponse(BaseModel):
    """Info minimale d'un item pour affichage dans une recette."""
    row_id: str
    name: Optional[str] = None
    icon_path: Optional[str] = None

    class Config:
        from_attributes = True


class RecipeIngredientResponse(BaseModel):
    item_row_id: str
    quantity: int
    is_substitute_group: bool
    substitute_group_row_id: Optional[str] = None
    position: int
    item: Optional[IngredientItemResponse] = None

    class Config:
        from_attributes = True


class BenchMinimalResponse(BaseModel):
    """Info minimale d'un etabli."""
    row_id: str
    name: Optional[str] = None
    item_row_id: Optional[str] = None
    tier: int

    class Config:
        from_attributes = True


class ItemMinimalResponse(BaseModel):
    """Info minimale d'un item pour les relations."""
    row_id: str
    name: Optional[str] = None
    icon_path: Optional[str] = None

    class Config:
        from_attributes = True


class SalvageDropResponse(BaseModel):
    """Item obtenu lors du desassemblage."""
    item_row_id: str
    quantity_min: int
    quantity_max: int
    drop_chance: float
    position: int
    item: Optional[ItemMinimalResponse] = None

    class Config:
        from_attributes = True


class SalvageResponse(BaseModel):
    """Profil de desassemblage d'un item."""
    row_id: str
    salvage_time: float
    bench_row_id: Optional[str] = None
    bench: Optional[BenchMinimalResponse] = None
    drops: List[SalvageDropResponse] = []

    class Config:
        from_attributes = True


class ItemUpgradeIngredientResponse(BaseModel):
    """Ingredient requis pour une amelioration."""
    item_row_id: str
    quantity: int
    position: int
    item: Optional[ItemMinimalResponse] = None

    class Config:
        from_attributes = True


class ItemUpgradeResponse(BaseModel):
    """Amelioration possible d'un item."""
    id: int
    source_item_row_id: str
    output_item_row_id: str
    output_item: Optional[ItemMinimalResponse] = None
    position: int
    ingredients: List[ItemUpgradeIngredientResponse] = []

    class Config:
        from_attributes = True


class UsedInRecipeResponse(BaseModel):
    """Recette utilisant cet item comme ingredient."""
    row_id: str
    output_item_row_id: str
    output_item: Optional[ItemMinimalResponse] = None
    quantity: int
    bench: Optional[BenchMinimalResponse] = None

    class Config:
        from_attributes = True


class UsedInUpgradeResponse(BaseModel):
    """Upgrade utilisant cet item comme ingredient."""
    id: int
    source_item_row_id: str
    source_item: Optional[ItemMinimalResponse] = None
    output_item_row_id: str
    output_item: Optional[ItemMinimalResponse] = None
    quantity: int

    class Config:
        from_attributes = True


class UpgradedFromResponse(BaseModel):
    """Item qui peut etre ameliore vers cet item."""
    id: int
    source_item_row_id: str
    source_item: Optional[ItemMinimalResponse] = None
    ingredients: List[ItemUpgradeIngredientResponse] = []

    class Config:
        from_attributes = True


class DroppedByNPCResponse(BaseModel):
    """NPC qui peut drop cet item."""
    npc_row_id: str
    npc_name: Optional[str] = None
    loot_type: str  # "death", "gib"
    salvage_row_id: str  # Pour determiner le type de degat (_blunt, _slash, etc.)
    quantity_min: int
    quantity_max: int
    drop_chance: float

    class Config:
        from_attributes = True


class RecipeResponse(BaseModel):
    row_id: str
    output_item_row_id: str
    count_to_create: int
    bench_row_id: Optional[str] = None
    unlock_condition: Optional[str] = None
    is_default_unlocked: bool
    category: Optional[str] = None
    subcategory: Optional[str] = None
    craft_time: float
    recipe_tags: Optional[List[str]] = None
    name: Optional[str] = None
    ingredients: List[RecipeIngredientResponse] = []
    bench: Optional[BenchMinimalResponse] = None

    @field_validator("recipe_tags", mode="before")
    @classmethod
    def parse_recipe_tags(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    class Config:
        from_attributes = True


# Schema principal Item

class ItemResponse(BaseModel):
    id: int
    row_id: str
    category: ItemCategory
    release_group: Optional[ReleaseGroup] = None
    name: Optional[str] = None
    description: Optional[str] = None
    flavor_text: Optional[str] = None
    stack_size: int
    weight: float
    max_durability: float
    can_lose_durability: bool
    chance_to_lose_durability: float
    icon_path: Optional[str] = None
    mesh_path: Optional[str] = None
    gameplay_tags: Optional[str] = None
    repair_item_id: Optional[str] = None
    repair_item: Optional[LinkedItemResponse] = None
    repair_quantity_min: int
    repair_quantity_max: int
    salvage_row_id: Optional[str] = None

    # Relations sous-types
    weapon: Optional[WeaponResponse] = None
    equipment: Optional[EquipmentResponse] = None
    consumable: Optional[ConsumableResponse] = None
    deployable: Optional[DeployableResponse] = None

    # Recettes qui produisent cet item
    recipes: List[RecipeResponse] = []

    # Salvage (desassemblage)
    salvage: Optional[SalvageResponse] = None

    # améliorations possibles
    upgrades: List[ItemUpgradeResponse] = []

    # Relations inversees
    used_in_recipes: List[UsedInRecipeResponse] = []
    used_in_upgrades: List[UsedInUpgradeResponse] = []
    upgraded_from: List[UpgradedFromResponse] = []
    dropped_by: List[DroppedByNPCResponse] = []  # NPCs qui peuvent drop cet item

    # Chaines complètes de transformation
    upgrade_tree: Optional[UpgradeTreeNode] = None  # Arbre complet d'améliorations
    cooking_chain: List[LinkedItemResponse] = []  # Chaine complète de cuisson

    class Config:
        from_attributes = True
