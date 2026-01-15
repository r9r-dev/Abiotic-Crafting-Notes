import json
import os
from pathlib import Path
from functools import lru_cache
from app.schemas.recipe import Recipe, RecipeSearchResult, DependencyNode, ResourceCalculation


# Data path can be configured via environment variable
# Default: /app/data/recipes.json (Docker) or relative path (dev)
_default_path = Path(__file__).parent.parent.parent / "data" / "recipes.json"
DATA_PATH = Path(os.environ.get("RECIPES_DATA_PATH", str(_default_path)))


@lru_cache()
def load_recipes() -> dict[str, Recipe]:
    """Load recipes from JSON file."""
    if not DATA_PATH.exists():
        return {}

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    return {item_id: Recipe(**recipe) for item_id, recipe in data.items()}


def reload_recipes():
    """Clear cache and reload recipes."""
    load_recipes.cache_clear()
    return load_recipes()


def get_recipe(item_id: str) -> Recipe | None:
    """Get a single recipe by ID."""
    recipes = load_recipes()
    return recipes.get(item_id)


def search_recipes(query: str, category: str | None = None) -> list[RecipeSearchResult]:
    """Search recipes by name or category."""
    recipes = load_recipes()
    results = []

    query_lower = query.lower() if query else ""

    for item_id, recipe in recipes.items():
        # Filter by category
        if category and recipe.category.lower() != category.lower():
            continue

        # Filter by name
        if query_lower and query_lower not in recipe.name.lower():
            continue

        results.append(RecipeSearchResult(
            id=item_id,
            name=recipe.name,
            icon_url=recipe.icon_url,
            category=recipe.category,
            craftable=len(recipe.variants) > 0
        ))

    return sorted(results, key=lambda x: x.name)


def get_categories() -> list[str]:
    """Get all unique categories."""
    recipes = load_recipes()
    categories = set(recipe.category for recipe in recipes.values())
    return sorted(categories)


def build_dependency_tree(item_id: str, quantity: int = 1, visited: set | None = None) -> DependencyNode | None:
    """Build a dependency tree for an item (recursive)."""
    if visited is None:
        visited = set()

    recipe = get_recipe(item_id)
    if not recipe:
        return None

    # Prevent infinite recursion
    if item_id in visited:
        return DependencyNode(
            item_id=item_id,
            item_name=recipe.name,
            quantity=quantity,
            craftable=len(recipe.variants) > 0,
            children=[]
        )

    visited.add(item_id)

    children = []
    if recipe.variants:
        # Use first variant for dependency tree
        variant = recipe.variants[0]
        for ingredient in variant.ingredients:
            child = build_dependency_tree(
                ingredient.item_id,
                ingredient.quantity * quantity,
                visited.copy()
            )
            if child:
                children.append(child)
            else:
                # Item not in recipes (base resource)
                children.append(DependencyNode(
                    item_id=ingredient.item_id,
                    item_name=ingredient.item_name,
                    quantity=ingredient.quantity * quantity,
                    craftable=False,
                    children=[]
                ))

    return DependencyNode(
        item_id=item_id,
        item_name=recipe.name,
        quantity=quantity,
        craftable=len(recipe.variants) > 0,
        children=children
    )


def calculate_total_resources(item_id: str, quantity: int = 1) -> list[ResourceCalculation]:
    """Calculate total base resources needed for an item."""
    resources: dict[str, int] = {}
    resource_names: dict[str, str] = {}

    def collect_resources(node: DependencyNode):
        if not node.children:
            # Base resource
            if node.item_id not in resources:
                resources[node.item_id] = 0
                resource_names[node.item_id] = node.item_name
            resources[node.item_id] += node.quantity
        else:
            for child in node.children:
                collect_resources(child)

    tree = build_dependency_tree(item_id, quantity)
    if tree:
        collect_resources(tree)

    return [
        ResourceCalculation(
            item_id=item_id,
            item_name=resource_names[item_id],
            total_quantity=qty,
            is_base_resource=True
        )
        for item_id, qty in sorted(resources.items(), key=lambda x: x[1], reverse=True)
    ]
