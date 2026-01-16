"""
Service pour les items avec nouveau format JSONB.
"""

from sqlalchemy import func, text
from sqlalchemy.orm import Session
from app.models.item import Item
from app.schemas.item import (
    ItemSearchResult,
    ItemDetail,
    ItemSource,
    ItemLocation,
    CraftingVariant,
    CraftingIngredient,
    SalvageResult,
    UpgradeFrom,
    DependencyNode,
    ResourceCalculation,
    RecipeSearchResult,
)


def _parse_source_types(data: dict) -> list[ItemSource]:
    """Parse les source_types depuis le JSON."""
    sources = []
    for s in data.get("source_types", []):
        sources.append(ItemSource(
            type=s.get("type"),
            target=s.get("target"),
            npc=s.get("npc"),
            item=s.get("item"),
            station=s.get("station"),
            location=s.get("location"),
            bait=s.get("bait"),
        ))
    return sources


def _parse_locations(data: dict) -> list[ItemLocation]:
    """Parse les locations depuis le JSON."""
    locations = []
    for loc in data.get("locations", []):
        locations.append(ItemLocation(
            area=loc.get("area", ""),
            details=loc.get("details"),
        ))
    return locations


def _parse_variants(data: dict) -> list[CraftingVariant]:
    """Parse les variants depuis le JSON."""
    variants = []
    for v in data.get("variants", []):
        ingredients = [
            CraftingIngredient(
                item_id=ing.get("item_id", ""),
                item_name=ing.get("item_name", ""),
                quantity=ing.get("quantity", 1),
            )
            for ing in v.get("ingredients", [])
        ]
        variants.append(CraftingVariant(
            ingredients=ingredients,
            station=v.get("station"),
            result_quantity=v.get("result_quantity", 1),
        ))
    return variants


def _parse_salvage(data: dict) -> list[SalvageResult]:
    """Parse les salvage depuis le JSON."""
    salvage = []
    for s in data.get("salvage", []):
        salvage.append(SalvageResult(
            item_id=s.get("item_id", ""),
            item_name=s.get("item_name", ""),
            min=s.get("min", 1),
            max=s.get("max", 1),
        ))
    return salvage


def _parse_upgrade_from(data: dict) -> list[UpgradeFrom]:
    """Parse les upgrade_from depuis le JSON."""
    upgrades = []
    for u in data.get("upgrade_from", []):
        ingredients = [
            CraftingIngredient(
                item_id=ing.get("item_id", ""),
                item_name=ing.get("item_name", ""),
                quantity=ing.get("quantity", 1),
            )
            for ing in u.get("ingredients", [])
        ]
        upgrades.append(UpgradeFrom(
            source_id=u.get("source_id", ""),
            source_name=u.get("source_name", ""),
            ingredients=ingredients,
            station=u.get("station"),
        ))
    return upgrades


def get_item(db: Session, item_id: str) -> ItemDetail | None:
    """Récupère les détails complets d'un item."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        return None

    data = item.data

    return ItemDetail(
        id=item.id,
        name=data.get("name", ""),
        description=data.get("description"),
        icon_url=data.get("icon_url"),
        icon_local=data.get("icon_local"),
        wiki_url=data.get("wiki_url"),
        category=data.get("category", ""),
        weight=data.get("weight"),
        stack_size=data.get("stack_size"),
        durability=data.get("durability"),
        research_category=data.get("research_category"),
        repair_item=data.get("repair_item"),
        repair_quantity=data.get("repair_quantity"),
        source_types=_parse_source_types(data),
        variants=_parse_variants(data),
        locations=_parse_locations(data),
        salvage=_parse_salvage(data),
        upgrade_from=_parse_upgrade_from(data),
        gear=data.get("gear"),
        loss_chance=data.get("loss_chance"),
        see_also=data.get("see_also"),
    )


def search_items(
    db: Session,
    query: str | None = None,
    category: str | None = None,
    source_type: str | None = None,
    limit: int = 100,
) -> list[ItemSearchResult]:
    """
    Recherche des items.

    Args:
        query: Texte de recherche (nom, description)
        category: Filtrer par catégorie
        source_type: Filtrer par type de source (Baking, Crafting, etc.)
        limit: Nombre max de résultats
    """
    q = db.query(Item)

    # Filtre par catégorie
    if category:
        q = q.filter(func.lower(Item.category) == category.lower())

    # Filtre par type de source
    if source_type:
        q = q.filter(
            text("EXISTS (SELECT 1 FROM jsonb_array_elements(data->'source_types') s WHERE s->>'type' = :source_type)")
            .bindparams(source_type=source_type)
        )

    # Filtre par recherche textuelle (nom, description)
    if query:
        search_pattern = f"%{query}%"
        q = q.filter(
            text("""
                f_unaccent(lower(data->>'name')) LIKE f_unaccent(lower(:pattern))
                OR f_unaccent(lower(COALESCE(data->>'description', ''))) LIKE f_unaccent(lower(:pattern))
            """).bindparams(pattern=search_pattern)
        )

    items = q.order_by(Item.name).limit(limit).all()

    results = []
    for item in items:
        data = item.data
        source_types = [s.get("type") for s in data.get("source_types", []) if s.get("type")]
        results.append(ItemSearchResult(
            id=item.id,
            name=data.get("name", ""),
            icon_url=data.get("icon_url"),
            icon_local=data.get("icon_local"),
            category=data.get("category", ""),
            source_types=list(set(source_types)),  # Unique
        ))

    return results


def get_items_by_source(
    db: Session,
    source_type: str,
    category: str | None = None,
    query: str | None = None,
) -> list[ItemSearchResult]:
    """
    Récupère les items par type de source.

    Utilisé pour les magasins (Cuisine = Baking, Assemblage = Crafting).
    """
    return search_items(db, query=query, category=category, source_type=source_type)


def get_categories(db: Session, source_type: str | None = None) -> list[str]:
    """Récupère les catégories uniques, optionnellement filtrées par type de source."""
    q = db.query(Item.category).distinct()

    if source_type:
        q = q.filter(
            text("EXISTS (SELECT 1 FROM jsonb_array_elements(data->'source_types') s WHERE s->>'type' = :source_type)")
            .bindparams(source_type=source_type)
        )

    categories = q.all()
    return sorted([c[0] for c in categories if c[0]])


def build_dependency_tree(
    db: Session, item_id: str, quantity: int = 1, visited: set | None = None
) -> DependencyNode | None:
    """Construit l'arbre de dépendances pour un item."""
    if visited is None:
        visited = set()

    item = get_item(db, item_id)
    if not item:
        return None

    # Prévenir récursion infinie
    if item_id in visited:
        return DependencyNode(
            item_id=item_id,
            item_name=item.name,
            quantity=quantity,
            craftable=len(item.variants) > 0,
            children=[],
        )

    visited.add(item_id)

    children = []
    if item.variants:
        # Utilise la première variante
        variant = item.variants[0]
        for ingredient in variant.ingredients:
            child = build_dependency_tree(
                db, ingredient.item_id, ingredient.quantity * quantity, visited.copy()
            )
            if child:
                children.append(child)
            else:
                # Item non craftable (ressource de base)
                ing_item = db.query(Item).filter(Item.id == ingredient.item_id).first()
                children.append(DependencyNode(
                    item_id=ingredient.item_id,
                    item_name=ing_item.name if ing_item else ingredient.item_name,
                    quantity=ingredient.quantity * quantity,
                    craftable=False,
                    children=[],
                ))

    return DependencyNode(
        item_id=item_id,
        item_name=item.name,
        quantity=quantity,
        craftable=len(item.variants) > 0,
        children=children,
    )


def calculate_total_resources(
    db: Session, item_id: str, quantity: int = 1
) -> list[ResourceCalculation]:
    """Calcule les ressources de base totales pour un item."""
    resources: dict[str, int] = {}
    resource_names: dict[str, str] = {}

    def collect_resources(node: DependencyNode):
        if not node.children:
            # Ressource de base
            if node.item_id not in resources:
                resources[node.item_id] = 0
                resource_names[node.item_id] = node.item_name
            resources[node.item_id] += node.quantity
        else:
            for child in node.children:
                collect_resources(child)

    tree = build_dependency_tree(db, item_id, quantity)
    if tree:
        collect_resources(tree)

    return [
        ResourceCalculation(
            item_id=rid,
            item_name=resource_names[rid],
            total_quantity=qty,
            is_base_resource=True,
        )
        for rid, qty in sorted(resources.items(), key=lambda x: x[1], reverse=True)
    ]


# --- Fonctions de compatibilité pour l'ancien API ---

def search_recipes_compat(
    db: Session,
    query: str | None = None,
    category: str | None = None,
    craftable_only: bool = True,
    source_type: str | None = None,
) -> list[RecipeSearchResult]:
    """
    Recherche compatible avec l'ancien format frontend.
    Retourne des RecipeSearchResult avec name_fr = name.
    """
    q = db.query(Item)

    # Filtre craftable
    if craftable_only:
        q = q.filter(
            text("jsonb_array_length(COALESCE(data->'variants', '[]'::jsonb)) > 0")
        )

    # Filtre catégorie
    if category:
        q = q.filter(func.lower(Item.category) == category.lower())

    # Filtre source_type
    if source_type:
        q = q.filter(
            text("EXISTS (SELECT 1 FROM jsonb_array_elements(data->'source_types') s WHERE s->>'type' = :source_type)")
            .bindparams(source_type=source_type)
        )

    # Recherche textuelle
    if query:
        search_pattern = f"%{query}%"
        q = q.filter(
            text("""
                f_unaccent(lower(data->>'name')) LIKE f_unaccent(lower(:pattern))
                OR f_unaccent(lower(COALESCE(data->>'description', ''))) LIKE f_unaccent(lower(:pattern))
            """).bindparams(pattern=search_pattern)
        )

    items = q.order_by(Item.name).limit(100).all()

    results = []
    for item in items:
        data = item.data
        source_types = [s.get("type") for s in data.get("source_types", []) if s.get("type")]
        variants = data.get("variants", [])

        results.append(RecipeSearchResult(
            id=item.id,
            name=data.get("name", ""),
            name_fr=data.get("name", ""),  # Même valeur car déjà FR
            icon_url=data.get("icon_url"),
            icon_local=data.get("icon_local"),
            category=data.get("category", ""),
            craftable=len(variants) > 0,
            source_types=list(set(source_types)),
        ))

    return results
