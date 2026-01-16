"""
Schémas Pydantic pour les items.

Nouveau format avec stockage JSONB - tous les noms sont en français.
"""

from pydantic import BaseModel
from typing import Optional, Literal


# Types de sources possibles
SourceType = Literal[
    "Baking",      # Cuisson au four
    "Burning",     # Brûlage/Combustion
    "Crafting",    # Assemblage
    "Fishing",     # Pêche
    "Killing",     # Tuer des ennemis
    "Salvaging",   # Récupération
    "Trading",     # Commerce
    "Upgrading",   # Amélioration
    "World",       # Trouvé dans le monde
]


class ItemSource(BaseModel):
    """Une source d'obtention d'un item."""
    type: SourceType
    target: Optional[str] = None    # Pour Killing : nom de l'ennemi
    npc: Optional[str] = None       # Pour Trading : nom du marchand
    item: Optional[str] = None      # Pour Baking/Salvaging : item source
    station: Optional[str] = None   # Station de craft
    location: Optional[str] = None  # Localisation
    bait: Optional[str] = None      # Pour Fishing : appât


class ItemLocation(BaseModel):
    """Un emplacement où trouver un item."""
    area: str
    details: Optional[str] = None


class CraftingIngredient(BaseModel):
    """Un ingrédient de recette."""
    item_id: str
    item_name: str  # Nom français
    quantity: int


class CraftingVariant(BaseModel):
    """Une variante de recette de craft."""
    ingredients: list[CraftingIngredient]
    station: Optional[str] = None
    result_quantity: int = 1


class SalvageResult(BaseModel):
    """Résultat de récupération."""
    item_id: str
    item_name: str
    min: int
    max: int


class UpgradeFrom(BaseModel):
    """Source d'amélioration - comment obtenir un item via upgrade."""
    source_id: str
    source_name: str
    ingredients: list[CraftingIngredient]
    station: Optional[str] = None


class ItemSearchResult(BaseModel):
    """Résultat de recherche simplifié."""
    id: str
    name: str  # Nom français
    icon_url: Optional[str] = None
    icon_local: Optional[str] = None
    category: str
    source_types: list[str] = []  # Liste des types de sources


class ItemDetail(BaseModel):
    """Détail complet d'un item."""
    id: str
    name: str  # Nom français
    description: Optional[str] = None
    icon_url: Optional[str] = None
    icon_local: Optional[str] = None
    wiki_url: Optional[str] = None
    category: str

    # Stats
    weight: Optional[float] = None
    stack_size: Optional[int] = None
    durability: Optional[int] = None
    research_category: Optional[str] = None

    # Réparation
    repair_item: Optional[str] = None
    repair_quantity: Optional[int] = None

    # Sources et craft
    source_types: list[ItemSource] = []
    variants: list[CraftingVariant] = []
    locations: list[ItemLocation] = []
    salvage: list[SalvageResult] = []
    upgrade_from: list[UpgradeFrom] = []

    # Données additionnelles (gear, etc.)
    gear: Optional[dict] = None
    loss_chance: Optional[float] = None
    see_also: Optional[list[str]] = None


class DependencyNode(BaseModel):
    """Nœud dans l'arbre de dépendances."""
    item_id: str
    item_name: str  # Nom français
    quantity: int
    craftable: bool
    children: list["DependencyNode"] = []


class ResourceCalculation(BaseModel):
    """Calcul des ressources totales."""
    item_id: str
    item_name: str  # Nom français
    total_quantity: int
    is_base_resource: bool


# Pour compatibilité avec l'ancien frontend (transition)
class RecipeSearchResult(BaseModel):
    """Ancien format - pour compatibilité."""
    id: str
    name: str
    name_fr: Optional[str] = None  # Sera égal à name
    icon_url: Optional[str] = None
    icon_local: Optional[str] = None
    category: str
    craftable: bool
    source_types: list[str] = []

    @classmethod
    def from_item_search(cls, item: ItemSearchResult, craftable: bool = False):
        return cls(
            id=item.id,
            name=item.name,
            name_fr=item.name,  # Même valeur car déjà en français
            icon_url=item.icon_url,
            icon_local=item.icon_local,
            category=item.category,
            craftable=craftable,
            source_types=item.source_types,
        )
