import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, or_, func

from app.database import get_db


def remove_accents(text: str) -> str:
    """Supprime les accents d'une chaîne."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
from app.models import Item, Recipe, RecipeIngredient, Bench
from app.schemas.item import (
    ItemResponse,
    RecipeResponse,
    RecipeIngredientResponse,
    IngredientItemResponse,
    BenchMinimalResponse,
    ItemSearchResult,
    ItemSearchResponse,
)

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/search", response_model=ItemSearchResponse)
def search_items(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    db: Session = Depends(get_db),
):
    """
    Recherche d'items par nom ou description.
    Retourne jusqu'à 20 résultats.
    Ignore les accents (ex: "fusil a pompe" trouve "fusil à pompe").
    """
    # Normaliser le terme de recherche (sans accents, minuscules)
    search_normalized = f"%{remove_accents(q.lower())}%"

    # Fonction SQL pour normaliser les accents (caractères français courants)
    accents_from = "àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ"
    accents_to = "aaaeeeeiioouucAAAEEEEIIOOUUC"

    def normalize_column(col):
        return func.translate(func.lower(col), accents_from, accents_to)

    results = db.query(Item).filter(
        or_(
            normalize_column(Item.name).like(search_normalized),
            normalize_column(Item.description).like(search_normalized),
        )
    ).order_by(
        # Prioriser les correspondances sur le nom
        normalize_column(Item.name).like(search_normalized).desc(),
        Item.name,
    ).limit(20).all()

    return ItemSearchResponse(
        query=q,
        count=len(results),
        results=[
            ItemSearchResult(
                row_id=item.row_id,
                category=item.category.value,
                name=item.name,
                description=item.description,
                icon_path=item.icon_path,
            )
            for item in results
        ],
    )


@router.get("/{row_id}", response_model=ItemResponse)
def get_item(row_id: str, db: Session = Depends(get_db)):
    """
    Recupere un item par son row_id avec toutes ses relations.
    Inclut les recettes qui produisent cet item avec leurs ingredients enrichis.
    """
    # Charger l'item avec ses sous-types
    item = db.query(Item).options(
        joinedload(Item.weapon),
        joinedload(Item.equipment),
        joinedload(Item.consumable),
        joinedload(Item.deployable),
    ).filter(Item.row_id == row_id).first()

    if not item:
        raise HTTPException(status_code=404, detail=f"Item '{row_id}' non trouve")

    # Charger les recettes qui produisent cet item
    recipes = db.query(Recipe).options(
        joinedload(Recipe.ingredients),
        joinedload(Recipe.bench),
    ).filter(Recipe.output_item_row_id == row_id).all()

    # Enrichir les ingredients avec nom_fr et icon_path
    enriched_recipes = []
    for recipe in recipes:
        # Collecter tous les item_row_id des ingredients
        ingredient_row_ids = [ing.item_row_id for ing in recipe.ingredients]

        # Charger les infos des items ingredients en une seule query
        ingredient_items = {}
        if ingredient_row_ids:
            items_query = db.query(Item.row_id, Item.name, Item.icon_path).filter(
                Item.row_id.in_(ingredient_row_ids)
            ).all()
            ingredient_items = {i.row_id: i for i in items_query}

        # Construire les ingredients enrichis
        enriched_ingredients = []
        for ing in sorted(recipe.ingredients, key=lambda x: x.position):
            item_info = ingredient_items.get(ing.item_row_id)
            enriched_ingredients.append(RecipeIngredientResponse(
                item_row_id=ing.item_row_id,
                quantity=ing.quantity,
                is_substitute_group=ing.is_substitute_group,
                substitute_group_row_id=ing.substitute_group_row_id,
                position=ing.position,
                item=IngredientItemResponse(
                    row_id=ing.item_row_id,
                    name=item_info.name if item_info else None,
                    icon_path=item_info.icon_path if item_info else None,
                ) if item_info else None
            ))

        # Construire le bench minimal
        bench_response = None
        if recipe.bench:
            bench_response = BenchMinimalResponse(
                row_id=recipe.bench.row_id,
                name=recipe.bench.name,
                item_row_id=recipe.bench.item_row_id,
                tier=recipe.bench.tier,
            )

        enriched_recipes.append(RecipeResponse(
            row_id=recipe.row_id,
            output_item_row_id=recipe.output_item_row_id,
            count_to_create=recipe.count_to_create,
            bench_row_id=recipe.bench_row_id,
            unlock_condition=recipe.unlock_condition,
            is_default_unlocked=recipe.is_default_unlocked,
            category=recipe.category,
            subcategory=recipe.subcategory,
            craft_time=recipe.craft_time,
            name=recipe.name,
            ingredients=enriched_ingredients,
            bench=bench_response,
        ))

    # Construire la reponse finale
    return ItemResponse(
        id=item.id,
        row_id=item.row_id,
        category=item.category,
        release_group=item.release_group,
        name=item.name,
        description=item.description,
        flavor_text=item.flavor_text,
        stack_size=item.stack_size,
        weight=item.weight,
        max_durability=item.max_durability,
        can_lose_durability=item.can_lose_durability,
        chance_to_lose_durability=item.chance_to_lose_durability,
        icon_path=item.icon_path,
        mesh_path=item.mesh_path,
        gameplay_tags=item.gameplay_tags,
        repair_item_id=item.repair_item_id,
        repair_quantity_min=item.repair_quantity_min,
        repair_quantity_max=item.repair_quantity_max,
        salvage_row_id=item.salvage_row_id,
        weapon=item.weapon,
        equipment=item.equipment,
        consumable=item.consumable,
        deployable=item.deployable,
        recipes=enriched_recipes,
    )
