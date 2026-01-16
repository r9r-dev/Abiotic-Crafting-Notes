from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session
from app.models.item import Item
from app.schemas.recipe import (
    Recipe,
    RecipeVariant,
    Ingredient,
    RecipeSearchResult,
    DependencyNode,
    ResourceCalculation,
)


def _item_to_recipe(item: Item) -> Recipe:
    """Convert SQLAlchemy Item to Pydantic Recipe."""
    variants = []
    for v in item.variants or []:
        ingredients = [
            Ingredient(
                item_id=ing["item_id"],
                item_name=ing["item_name"],
                quantity=ing["quantity"],
            )
            for ing in v.get("ingredients", [])
        ]
        variants.append(RecipeVariant(ingredients=ingredients, station=v.get("station")))

    return Recipe(
        id=item.id,
        name=item.name,
        name_fr=item.name_fr,
        description_fr=item.description_fr,
        icon_url=item.icon_url,
        icon_local=item.icon_local,
        category=item.category,
        weight=float(item.weight) if item.weight else None,
        stack_size=item.stack_size,
        durability=item.durability,
        variants=variants,
        repair_material=item.repair_material,
        repair_quantity=item.repair_quantity,
        wiki_url=item.wiki_url,
    )


def get_recipe(db: Session, item_id: str) -> Recipe | None:
    """Get a single recipe by ID."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        return None
    return _item_to_recipe(item)


def search_recipes(
    db: Session, query: str | None = None, category: str | None = None
) -> list[RecipeSearchResult]:
    """Search recipes by name (FR/EN), description, or category.

    Search is case-insensitive and accent-insensitive.
    """
    q = db.query(Item)

    # Filter by category
    if category:
        q = q.filter(func.lower(Item.category) == category.lower())

    # Filter by search query (name EN, name FR, description FR)
    if query:
        search_pattern = f"%{query}%"
        q = q.filter(
            or_(
                func.lower(Item.name).like(func.lower(search_pattern)),
                text("f_unaccent(lower(name_fr)) LIKE f_unaccent(lower(:pattern))").bindparams(pattern=search_pattern),
                text("f_unaccent(lower(description_fr)) LIKE f_unaccent(lower(:pattern))").bindparams(pattern=search_pattern),
            )
        )

    items = q.order_by(Item.name).all()

    return [
        RecipeSearchResult(
            id=item.id,
            name=item.name,
            name_fr=item.name_fr,
            icon_url=item.icon_url,
            icon_local=item.icon_local,
            category=item.category,
            craftable=len(item.variants or []) > 0,
        )
        for item in items
    ]


def get_categories(db: Session) -> list[str]:
    """Get all unique categories."""
    categories = db.query(Item.category).distinct().all()
    return sorted([c[0] for c in categories])


def build_dependency_tree(
    db: Session, item_id: str, quantity: int = 1, visited: set | None = None
) -> DependencyNode | None:
    """Build a dependency tree for an item (recursive)."""
    if visited is None:
        visited = set()

    recipe = get_recipe(db, item_id)
    if not recipe:
        return None

    # Prevent infinite recursion
    if item_id in visited:
        return DependencyNode(
            item_id=item_id,
            item_name=recipe.name,
            item_name_fr=recipe.name_fr,
            quantity=quantity,
            craftable=len(recipe.variants) > 0,
            children=[],
        )

    visited.add(item_id)

    children = []
    if recipe.variants:
        # Use first variant for dependency tree
        variant = recipe.variants[0]
        for ingredient in variant.ingredients:
            child = build_dependency_tree(
                db, ingredient.item_id, ingredient.quantity * quantity, visited.copy()
            )
            if child:
                children.append(child)
            else:
                # Item not in recipes (base resource) - try to get name_fr
                ingredient_item = db.query(Item).filter(Item.id == ingredient.item_id).first()
                children.append(
                    DependencyNode(
                        item_id=ingredient.item_id,
                        item_name=ingredient.item_name,
                        item_name_fr=ingredient_item.name_fr if ingredient_item else None,
                        quantity=ingredient.quantity * quantity,
                        craftable=False,
                        children=[],
                    )
                )

    return DependencyNode(
        item_id=item_id,
        item_name=recipe.name,
        item_name_fr=recipe.name_fr,
        quantity=quantity,
        craftable=len(recipe.variants) > 0,
        children=children,
    )


def calculate_total_resources(
    db: Session, item_id: str, quantity: int = 1
) -> list[ResourceCalculation]:
    """Calculate total base resources needed for an item."""
    resources: dict[str, int] = {}
    resource_names: dict[str, str] = {}
    resource_names_fr: dict[str, str | None] = {}

    def collect_resources(node: DependencyNode):
        if not node.children:
            # Base resource
            if node.item_id not in resources:
                resources[node.item_id] = 0
                resource_names[node.item_id] = node.item_name
                resource_names_fr[node.item_id] = node.item_name_fr
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
            item_name_fr=resource_names_fr[rid],
            total_quantity=qty,
            is_base_resource=True,
        )
        for rid, qty in sorted(resources.items(), key=lambda x: x[1], reverse=True)
    ]
