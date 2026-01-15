from fastapi import APIRouter, HTTPException, Query
from app.services import (
    get_recipe,
    search_recipes,
    get_categories,
    build_dependency_tree,
    calculate_total_resources
)
from app.schemas.recipe import Recipe, RecipeSearchResult, DependencyNode, ResourceCalculation

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("", response_model=list[RecipeSearchResult])
def list_recipes(
    q: str = Query(default="", description="Search query"),
    category: str | None = Query(default=None, description="Filter by category")
):
    """Search and list recipes."""
    return search_recipes(q, category)


@router.get("/categories", response_model=list[str])
def list_categories():
    """Get all recipe categories."""
    return get_categories()


@router.get("/{item_id}", response_model=Recipe)
def get_recipe_by_id(item_id: str):
    """Get a recipe by its ID."""
    recipe = get_recipe(item_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.get("/{item_id}/dependencies", response_model=DependencyNode)
def get_dependencies(item_id: str, quantity: int = Query(default=1, ge=1)):
    """Get the dependency tree for an item."""
    tree = build_dependency_tree(item_id, quantity)
    if not tree:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return tree


@router.get("/{item_id}/resources", response_model=list[ResourceCalculation])
def get_resources(item_id: str, quantity: int = Query(default=1, ge=1)):
    """Calculate total base resources needed for an item."""
    resources = calculate_total_resources(item_id, quantity)
    if not resources:
        recipe = get_recipe(item_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
    return resources
