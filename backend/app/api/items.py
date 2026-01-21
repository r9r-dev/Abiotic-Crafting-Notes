import unicodedata
from itertools import product

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from app.database import get_db
from app.models import Item, Recipe, RecipeIngredient, Bench, RecipeSubstitute, RecipeSubstituteItem, Buff
from app.models.salvage import Salvage, SalvageDrop
from app.models.item_upgrade import ItemUpgrade, ItemUpgradeIngredient
from app.models.consumable import Consumable
from app.schemas.item import (
    ItemResponse,
    RecipeResponse,
    RecipeIngredientResponse,
    IngredientItemResponse,
    BenchMinimalResponse,
    ItemSearchResult,
    ItemSearchResponse,
    LinkedItemResponse,
    SalvageResponse,
    SalvageDropResponse,
    ItemMinimalResponse,
    WeaponResponse,
    ConsumableResponse,
    ItemUpgradeResponse,
    ItemUpgradeIngredientResponse,
    UsedInRecipeResponse,
    UsedInUpgradeResponse,
    UpgradedFromResponse,
    UpgradeTreeNode,
    BuffResponse,
)

router = APIRouter(prefix="/items", tags=["items"])


def normalize_search_text(text: str) -> str:
    """Normalise le texte pour la recherche (accents, ligatures, points)."""
    # Remplacer les ligatures
    text = text.replace("œ", "oe").replace("Œ", "OE")
    text = text.replace("æ", "ae").replace("Æ", "AE")
    # Supprimer les points (pour F.O.R.G.E. -> FORGE)
    text = text.replace(".", "")
    # Supprimer les accents
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    return text


def _get_linked_item(db: Session, row_id: str | None, items_cache: dict) -> LinkedItemResponse | None:
    """Recupere un item lie depuis le cache ou la DB."""
    if not row_id:
        return None

    if row_id not in items_cache:
        item = db.query(Item.row_id, Item.name, Item.icon_path).filter(
            Item.row_id == row_id
        ).first()
        items_cache[row_id] = item

    item = items_cache.get(row_id)
    if item:
        return LinkedItemResponse(
            row_id=item.row_id,
            name=item.name,
            icon_path=item.icon_path,
        )
    return None


def _resolve_buffs(db: Session, buffs_json: str | None) -> list[BuffResponse]:
    """Resout les buffs depuis leur JSON string vers des BuffResponse enrichis."""
    import json

    if not buffs_json:
        return []

    try:
        buff_ids = json.loads(buffs_json)
        if not isinstance(buff_ids, list):
            return []
    except json.JSONDecodeError:
        return []

    if not buff_ids:
        return []

    # Recuperer tous les buffs en une seule requete
    buffs = db.query(Buff).filter(Buff.row_id.in_(buff_ids)).all()
    buffs_map = {b.row_id: b for b in buffs}

    result = []
    for buff_id in buff_ids:
        buff = buffs_map.get(buff_id)
        if buff:
            result.append(BuffResponse(
                row_id=buff.row_id,
                name=buff.name,
                description=buff.description,
            ))
        else:
            # Buff non trouve en base, on retourne juste l'ID
            result.append(BuffResponse(
                row_id=buff_id,
                name=None,
                description=None,
            ))

    return result


def _get_transformation_sources(
    db: Session,
    row_id: str,
    transformation_type: str
) -> list[LinkedItemResponse]:
    """Recupere les items qui se transforment en cet item.

    Args:
        db: Session de base de donnees
        row_id: ID de l'item cible
        transformation_type: 'cooked', 'burned' ou 'decayed'

    Returns:
        Liste des items sources
    """
    column_map = {
        'cooked': Consumable.cooked_item_row_id,
        'burned': Consumable.burned_item_row_id,
        'decayed': Consumable.decay_to_item_row_id,
    }

    column = column_map.get(transformation_type)
    if not column:
        return []

    # Trouver les consumables qui ont cet item comme cible de transformation
    # Inclure requires_baking pour les sources de cuisson
    sources = db.query(
        Item.row_id, Item.name, Item.icon_path, Consumable.requires_baking
    ).join(
        Consumable, Consumable.item_id == Item.id
    ).filter(
        column == row_id
    ).all()

    return [
        LinkedItemResponse(
            row_id=source.row_id,
            name=source.name,
            icon_path=source.icon_path,
            requires_baking=source.requires_baking if transformation_type == 'cooked' else None,
        )
        for source in sources
    ]


def _get_full_upgrade_tree(db: Session, row_id: str) -> UpgradeTreeNode | None:
    """Construit l'arbre complet d'ameliorations contenant l'item."""

    # 1. Charger TOUTES les relations d'upgrade en memoire
    all_upgrades = db.query(
        ItemUpgrade.source_item_row_id,
        ItemUpgrade.output_item_row_id
    ).all()

    if not all_upgrades:
        return None

    # 2. Construire les maps d'adjacence
    children_map: dict[str, list[str]] = {}  # parent -> [enfants]
    parents_map: dict[str, str] = {}          # enfant -> parent

    for upgrade in all_upgrades:
        source = upgrade.source_item_row_id
        output = upgrade.output_item_row_id

        if source not in children_map:
            children_map[source] = []
        children_map[source].append(output)
        parents_map[output] = source

    # 3. Trouver la racine (remonter jusqu'a l'item sans parent)
    current = row_id
    visited = {current}

    while current in parents_map:
        parent = parents_map[current]
        if parent in visited:
            break  # Cycle detecte
        visited.add(parent)
        current = parent

    root_id = current

    # 4. Verifier que l'item est dans un arbre d'upgrade
    if root_id not in children_map and root_id not in parents_map:
        if row_id not in children_map and row_id not in parents_map:
            return None

    # 5. Collecter tous les IDs de l'arbre (BFS)
    tree_item_ids = set()
    queue = [root_id]
    while queue:
        current = queue.pop(0)
        tree_item_ids.add(current)
        for child in children_map.get(current, []):
            if child not in tree_item_ids:
                queue.append(child)

    # 6. Charger les infos de tous les items en une requete
    items = db.query(Item.row_id, Item.name, Item.icon_path).filter(
        Item.row_id.in_(tree_item_ids)
    ).all()
    items_map = {i.row_id: i for i in items}

    # 7. Construire l'arbre recursivement
    def build_node(item_row_id: str) -> UpgradeTreeNode:
        item = items_map.get(item_row_id)
        children = [
            build_node(child_id)
            for child_id in children_map.get(item_row_id, [])
        ]
        return UpgradeTreeNode(
            row_id=item_row_id,
            name=item.name if item else None,
            icon_path=item.icon_path if item else None,
            children=children
        )

    return build_node(root_id)


def _get_full_cooking_chain(db: Session, row_id: str) -> list[LinkedItemResponse]:
    """Recupere la chaine complete de cuisson pour un item.

    Remonte jusqu'a l'item non cuit puis descend jusqu'a l'item brule/pourri.
    """
    # Trouver la racine (remonter les cuissons)
    current_id = row_id
    visited = {current_id}

    while True:
        # Chercher un item qui se cuit vers current_id
        parent = db.query(Item.row_id).join(
            Consumable, Consumable.item_id == Item.id
        ).filter(
            Consumable.cooked_item_row_id == current_id
        ).first()

        if not parent or parent.row_id in visited:
            break
        current_id = parent.row_id
        visited.add(current_id)

    root_id = current_id

    # Construire la chaine depuis la racine (suivre cooked_item)
    chain = []
    current_id = root_id
    visited = set()

    while current_id and current_id not in visited:
        visited.add(current_id)

        # Recuperer les infos de l'item et son cooked_item
        item_data = db.query(
            Item.row_id, Item.name, Item.icon_path,
            Consumable.cooked_item_row_id, Consumable.requires_baking
        ).outerjoin(
            Consumable, Consumable.item_id == Item.id
        ).filter(
            Item.row_id == current_id
        ).first()

        if item_data:
            chain.append(LinkedItemResponse(
                row_id=item_data.row_id,
                name=item_data.name,
                icon_path=item_data.icon_path,
                requires_baking=item_data.requires_baking,
            ))
            current_id = item_data.cooked_item_row_id
        else:
            break

    # Ne retourner la chaine que si elle contient plus d'un element
    return chain if len(chain) > 1 else []


def _build_recipe_response(
    db: Session,
    recipe: Recipe,
    ingredient_row_ids: list[str],
    bench_map: dict[str, Bench],
    is_expanded: bool = False
) -> RecipeResponse:
    """Construit une RecipeResponse avec les ingredients specifies."""
    # Charger les infos des items ingredients en une seule query
    ingredient_items = {}
    if ingredient_row_ids:
        items_query = db.query(Item.row_id, Item.name, Item.icon_path).filter(
            Item.row_id.in_(ingredient_row_ids)
        ).all()
        ingredient_items = {i.row_id: i for i in items_query}

    # Construire les ingredients enrichis
    enriched_ingredients = []
    for idx, (ing, final_row_id) in enumerate(
        zip(sorted(recipe.ingredients, key=lambda x: x.position), ingredient_row_ids)
    ):
        item_info = ingredient_items.get(final_row_id)
        enriched_ingredients.append(RecipeIngredientResponse(
            item_row_id=final_row_id,
            quantity=ing.quantity,
            is_substitute_group=False if is_expanded else ing.is_substitute_group,
            substitute_group_row_id=None if is_expanded else ing.substitute_group_row_id,
            position=ing.position,
            item=IngredientItemResponse(
                row_id=final_row_id,
                name=item_info.name if item_info else None,
                icon_path=item_info.icon_path if item_info else None,
            ) if item_info else None
        ))

    # Construire le bench minimal (via bench_row_id)
    bench_response = None
    bench = bench_map.get(recipe.bench_row_id) if recipe.bench_row_id else None
    if bench:
        bench_response = BenchMinimalResponse(
            row_id=bench.row_id,
            name=bench.name,
            item_row_id=bench.item_row_id,
            tier=bench.tier,
        )

    return RecipeResponse(
        row_id=recipe.row_id,
        output_item_row_id=recipe.output_item_row_id,
        count_to_create=recipe.count_to_create,
        bench_row_id=recipe.bench_row_id,
        unlock_condition=recipe.unlock_condition,
        is_default_unlocked=recipe.is_default_unlocked,
        category=recipe.category,
        subcategory=recipe.subcategory,
        craft_time=recipe.craft_time,
        recipe_tags=recipe.recipe_tags,
        name=recipe.name,
        ingredients=enriched_ingredients,
        bench=bench_response,
    )


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


def _build_upgrades_response(
    db: Session,
    upgrades: list[ItemUpgrade],
    items_cache: dict,
) -> list[ItemUpgradeResponse]:
    """Construit la liste des upgrades avec les items enrichis."""
    # Collecter tous les item_row_id necessaires
    all_item_row_ids = set()
    for upgrade in upgrades:
        all_item_row_ids.add(upgrade.output_item_row_id)
        for ing in upgrade.ingredients:
            all_item_row_ids.add(ing.item_row_id)

    # Charger les items en une seule requete
    if all_item_row_ids:
        items_query = db.query(Item.row_id, Item.name, Item.icon_path).filter(
            Item.row_id.in_(all_item_row_ids)
        ).all()
        for item in items_query:
            items_cache[item.row_id] = item

    # Construire les reponses
    result = []
    for upgrade in sorted(upgrades, key=lambda x: x.position):
        output_item_info = items_cache.get(upgrade.output_item_row_id)

        # Ingredients enrichis
        enriched_ingredients = []
        for ing in sorted(upgrade.ingredients, key=lambda x: x.position):
            ing_item_info = items_cache.get(ing.item_row_id)
            enriched_ingredients.append(ItemUpgradeIngredientResponse(
                item_row_id=ing.item_row_id,
                quantity=ing.quantity,
                position=ing.position,
                item=ItemMinimalResponse(
                    row_id=ing.item_row_id,
                    name=ing_item_info.name if ing_item_info else None,
                    icon_path=ing_item_info.icon_path if ing_item_info else None,
                ) if ing_item_info else None,
            ))

        result.append(ItemUpgradeResponse(
            id=upgrade.id,
            source_item_row_id=upgrade.source_item_row_id,
            output_item_row_id=upgrade.output_item_row_id,
            output_item=ItemMinimalResponse(
                row_id=upgrade.output_item_row_id,
                name=output_item_info.name if output_item_info else None,
                icon_path=output_item_info.icon_path if output_item_info else None,
            ) if output_item_info else None,
            position=upgrade.position,
            ingredients=enriched_ingredients,
        ))

    return result


def _build_used_in_recipes_response(
    db: Session,
    row_id: str,
    bench_map: dict[str, Bench],
    items_cache: dict,
) -> list[UsedInRecipeResponse]:
    """Construit la liste des recettes utilisant cet item comme ingredient."""
    # Recettes utilisant cet item comme ingredient
    recipes_with_item = db.query(Recipe, RecipeIngredient.quantity).join(
        RecipeIngredient
    ).filter(
        RecipeIngredient.item_row_id == row_id
    ).all()

    if not recipes_with_item:
        return []

    # Collecter les output_item_row_id et bench_row_id
    output_row_ids = {r.output_item_row_id for r, _ in recipes_with_item}
    bench_row_ids = {r.bench_row_id for r, _ in recipes_with_item if r.bench_row_id}

    # Charger les items de sortie
    if output_row_ids:
        items_query = db.query(Item.row_id, Item.name, Item.icon_path).filter(
            Item.row_id.in_(output_row_ids)
        ).all()
        for item in items_query:
            items_cache[item.row_id] = item

    # Charger les benches manquants
    missing_benches = bench_row_ids - set(bench_map.keys())
    if missing_benches:
        benches = db.query(Bench).filter(Bench.row_id.in_(missing_benches)).all()
        for bench in benches:
            bench_map[bench.row_id] = bench

    # Construire les reponses
    result = []
    for recipe, quantity in recipes_with_item:
        output_item_info = items_cache.get(recipe.output_item_row_id)
        bench = bench_map.get(recipe.bench_row_id) if recipe.bench_row_id else None

        bench_response = None
        if bench:
            bench_response = BenchMinimalResponse(
                row_id=bench.row_id,
                name=bench.name,
                item_row_id=bench.item_row_id,
                tier=bench.tier,
            )

        result.append(UsedInRecipeResponse(
            row_id=recipe.row_id,
            output_item_row_id=recipe.output_item_row_id,
            output_item=ItemMinimalResponse(
                row_id=recipe.output_item_row_id,
                name=output_item_info.name if output_item_info else None,
                icon_path=output_item_info.icon_path if output_item_info else None,
            ) if output_item_info else None,
            quantity=quantity,
            bench=bench_response,
        ))

    return result


def _build_used_in_upgrades_response(
    db: Session,
    row_id: str,
    items_cache: dict,
) -> list[UsedInUpgradeResponse]:
    """Construit la liste des upgrades utilisant cet item comme ingredient."""
    # Upgrades utilisant cet item comme ingredient
    upgrades_with_item = db.query(ItemUpgrade, ItemUpgradeIngredient.quantity).join(
        ItemUpgradeIngredient
    ).filter(
        ItemUpgradeIngredient.item_row_id == row_id
    ).all()

    if not upgrades_with_item:
        return []

    # Collecter tous les item_row_id necessaires
    all_item_row_ids = set()
    for upgrade, _ in upgrades_with_item:
        all_item_row_ids.add(upgrade.source_item_row_id)
        all_item_row_ids.add(upgrade.output_item_row_id)

    # Charger les items
    if all_item_row_ids:
        items_query = db.query(Item.row_id, Item.name, Item.icon_path).filter(
            Item.row_id.in_(all_item_row_ids)
        ).all()
        for item in items_query:
            items_cache[item.row_id] = item

    # Construire les reponses
    result = []
    for upgrade, quantity in upgrades_with_item:
        source_item_info = items_cache.get(upgrade.source_item_row_id)
        output_item_info = items_cache.get(upgrade.output_item_row_id)

        result.append(UsedInUpgradeResponse(
            id=upgrade.id,
            source_item_row_id=upgrade.source_item_row_id,
            source_item=ItemMinimalResponse(
                row_id=upgrade.source_item_row_id,
                name=source_item_info.name if source_item_info else None,
                icon_path=source_item_info.icon_path if source_item_info else None,
            ) if source_item_info else None,
            output_item_row_id=upgrade.output_item_row_id,
            output_item=ItemMinimalResponse(
                row_id=upgrade.output_item_row_id,
                name=output_item_info.name if output_item_info else None,
                icon_path=output_item_info.icon_path if output_item_info else None,
            ) if output_item_info else None,
            quantity=quantity,
        ))

    return result


def _build_upgraded_from_response(
    db: Session,
    row_id: str,
    items_cache: dict,
) -> list[UpgradedFromResponse]:
    """Construit la liste des items qui peuvent etre ameliores vers cet item."""
    # Items qui s'ameliorent vers cet item
    upgrades = db.query(ItemUpgrade).options(
        joinedload(ItemUpgrade.ingredients)
    ).filter(ItemUpgrade.output_item_row_id == row_id).all()

    if not upgrades:
        return []

    # Collecter tous les item_row_id necessaires
    all_item_row_ids = set()
    for upgrade in upgrades:
        all_item_row_ids.add(upgrade.source_item_row_id)
        for ing in upgrade.ingredients:
            all_item_row_ids.add(ing.item_row_id)

    # Charger les items
    if all_item_row_ids:
        items_query = db.query(Item.row_id, Item.name, Item.icon_path).filter(
            Item.row_id.in_(all_item_row_ids)
        ).all()
        for item in items_query:
            items_cache[item.row_id] = item

    # Construire les reponses
    result = []
    for upgrade in upgrades:
        source_item_info = items_cache.get(upgrade.source_item_row_id)

        # Ingredients enrichis
        enriched_ingredients = []
        for ing in sorted(upgrade.ingredients, key=lambda x: x.position):
            ing_item_info = items_cache.get(ing.item_row_id)
            enriched_ingredients.append(ItemUpgradeIngredientResponse(
                item_row_id=ing.item_row_id,
                quantity=ing.quantity,
                position=ing.position,
                item=ItemMinimalResponse(
                    row_id=ing.item_row_id,
                    name=ing_item_info.name if ing_item_info else None,
                    icon_path=ing_item_info.icon_path if ing_item_info else None,
                ) if ing_item_info else None,
            ))

        result.append(UpgradedFromResponse(
            id=upgrade.id,
            source_item_row_id=upgrade.source_item_row_id,
            source_item=ItemMinimalResponse(
                row_id=upgrade.source_item_row_id,
                name=source_item_info.name if source_item_info else None,
                icon_path=source_item_info.icon_path if source_item_info else None,
            ) if source_item_info else None,
            ingredients=enriched_ingredients,
        ))

    return result


@router.get("/search", response_model=ItemSearchResponse)
def search_items(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    db: Session = Depends(get_db),
):
    """
    Recherche d'items par nom ou description.
    Retourne jusqu'à 20 résultats.
    Ignore les accents, ligatures et points (ex: "coeur" trouve "Cœur", "for" trouve "F.O.R.G.E.").
    """
    # Normaliser le terme de recherche
    search_normalized = f"%{normalize_search_text(q.lower())}%"

    # Fonction SQL pour normaliser le texte
    # 1. Remplacer les ligatures
    # 2. Supprimer les points
    # 3. Supprimer les accents
    def normalize_column(col):
        # Remplacer ligatures
        normalized = func.replace(func.replace(col, "œ", "oe"), "Œ", "OE")
        normalized = func.replace(func.replace(normalized, "æ", "ae"), "Æ", "AE")
        # Supprimer les points
        normalized = func.replace(normalized, ".", "")
        # Supprimer les accents (caractères français courants)
        accents_from = "àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ"
        accents_to = "aaaeeeeiioouucAAAEEEEIIOOUUC"
        normalized = func.translate(func.lower(normalized), accents_from, accents_to)
        return normalized

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
    Les recettes avec des ingredients de substitution (Any*) sont eclatees en
    plusieurs recettes distinctes.
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

    # Cache pour les items lies (evite les requetes repetees)
    items_cache: dict = {}

    # Charger les recettes qui produisent cet item
    recipes = db.query(Recipe).options(
        joinedload(Recipe.ingredients),
    ).filter(Recipe.output_item_row_id == row_id).all()

    # Collecter tous les bench_row_id necessaires
    bench_row_ids = {r.bench_row_id for r in recipes if r.bench_row_id}

    # Charger le salvage si present
    salvage_response = None
    if item.salvage_row_id:
        salvage = db.query(Salvage).options(
            joinedload(Salvage.drops)
        ).filter(Salvage.row_id == item.salvage_row_id).first()

        if salvage and salvage.bench_row_id:
            bench_row_ids.add(salvage.bench_row_id)

    # Charger tous les benches en une seule requete
    bench_map: dict[str, Bench] = {}
    if bench_row_ids:
        benches = db.query(Bench).filter(Bench.row_id.in_(bench_row_ids)).all()
        bench_map = {b.row_id: b for b in benches}

    # Construire la reponse salvage
    if item.salvage_row_id and salvage:
        salvage_response = _build_salvage_response(db, salvage, bench_map, items_cache)

    # Charger tous les groupes de substitution avec leurs items
    substitute_groups: dict[str, list[str]] = {}
    substitute_row_ids = set()
    for recipe in recipes:
        for ing in recipe.ingredients:
            if ing.is_substitute_group and ing.item_row_id:
                substitute_row_ids.add(ing.item_row_id)

    if substitute_row_ids:
        # Charger les substitutes et leurs items
        substitutes = db.query(RecipeSubstitute).filter(
            RecipeSubstitute.row_id.in_(substitute_row_ids)
        ).all()
        substitute_id_map = {s.row_id: s.id for s in substitutes}

        # Charger les items de chaque groupe
        for sub_row_id, sub_id in substitute_id_map.items():
            sub_items = db.query(RecipeSubstituteItem.item_row_id).filter(
                RecipeSubstituteItem.substitute_id == sub_id
            ).all()
            substitute_groups[sub_row_id] = [si.item_row_id for si in sub_items]

    # Enrichir les ingredients et eclater les recettes avec substituts
    enriched_recipes = []
    for recipe in recipes:
        # Trier les ingredients par position
        sorted_ingredients = sorted(recipe.ingredients, key=lambda x: x.position)

        # Verifier si la recette a des substituts
        has_substitutes = any(
            ing.is_substitute_group and ing.item_row_id in substitute_groups
            for ing in sorted_ingredients
        )

        if not has_substitutes:
            # Pas de substituts - construire la recette normalement
            ingredient_row_ids = [ing.item_row_id for ing in sorted_ingredients]
            enriched_recipes.append(
                _build_recipe_response(db, recipe, ingredient_row_ids, bench_map, is_expanded=False)
            )
        else:
            # Generer toutes les combinaisons de substituts
            # Pour chaque ingredient, lister les items possibles
            variant_options = []
            for ing in sorted_ingredients:
                if ing.is_substitute_group and ing.item_row_id in substitute_groups:
                    # Remplacer par chaque item du groupe
                    variant_options.append(substitute_groups[ing.item_row_id])
                else:
                    # Garder l'ingredient tel quel
                    variant_options.append([ing.item_row_id])

            # Generer toutes les combinaisons
            for combination in product(*variant_options):
                enriched_recipes.append(
                    _build_recipe_response(db, recipe, list(combination), bench_map, is_expanded=True)
                )

    # Enrichir les sous-types avec les items lies
    weapon_response = None
    if item.weapon:
        weapon_response = WeaponResponse(
            is_melee=item.weapon.is_melee,
            damage_per_hit=item.weapon.damage_per_hit,
            damage_type=item.weapon.damage_type,
            time_between_shots=item.weapon.time_between_shots,
            burst_fire_count=item.weapon.burst_fire_count,
            bullet_spread_min=item.weapon.bullet_spread_min,
            bullet_spread_max=item.weapon.bullet_spread_max,
            max_aim_correction=item.weapon.max_aim_correction,
            recoil_amount=item.weapon.recoil_amount,
            maximum_hitscan_range=item.weapon.maximum_hitscan_range,
            magazine_size=item.weapon.magazine_size,
            require_ammo=item.weapon.require_ammo,
            ammo_type_row_id=item.weapon.ammo_type_row_id,
            ammo_item=_get_linked_item(db, item.weapon.ammo_type_row_id, items_cache),
            projectile_row_id=item.weapon.projectile_row_id,
            pellet_count=item.weapon.pellet_count,
            tracer_per_shots=item.weapon.tracer_per_shots,
            loudness_primary=item.weapon.loudness_primary,
            loudness_secondary=item.weapon.loudness_secondary,
            secondary_attack_type=item.weapon.secondary_attack_type,
            underwater_state=item.weapon.underwater_state,
        )

    consumable_response = None
    if item.consumable:
        # Recuperer les relations inverses de transformation
        cooked_from = _get_transformation_sources(db, row_id, 'cooked')
        burned_from = _get_transformation_sources(db, row_id, 'burned')
        decayed_from = _get_transformation_sources(db, row_id, 'decayed')

        consumable_response = ConsumableResponse(
            time_to_consume=item.consumable.time_to_consume,
            hunger_fill=item.consumable.hunger_fill,
            thirst_fill=item.consumable.thirst_fill,
            fatigue_fill=item.consumable.fatigue_fill,
            continence_fill=item.consumable.continence_fill,
            sanity_fill=item.consumable.sanity_fill,
            health_change=item.consumable.health_change,
            armor_change=item.consumable.armor_change,
            temperature_change=item.consumable.temperature_change,
            radiation_change=item.consumable.radiation_change,
            radioactivity=item.consumable.radioactivity,
            buffs_to_add=_resolve_buffs(db, item.consumable.buffs_to_add),
            buffs_to_remove=_resolve_buffs(db, item.consumable.buffs_to_remove),
            consumable_tag=item.consumable.consumable_tag,
            consumed_action=item.consumable.consumed_action,
            can_be_cooked=item.consumable.can_be_cooked,
            is_cookware=item.consumable.is_cookware,
            cooked_item_row_id=item.consumable.cooked_item_row_id,
            cooked_item=_get_linked_item(db, item.consumable.cooked_item_row_id, items_cache),
            burned_item_row_id=item.consumable.burned_item_row_id,
            burned_item=_get_linked_item(db, item.consumable.burned_item_row_id, items_cache),
            time_to_cook_baseline=item.consumable.time_to_cook_baseline,
            time_to_burn_baseline=item.consumable.time_to_burn_baseline,
            requires_baking=item.consumable.requires_baking,
            starting_portions=item.consumable.starting_portions,
            can_item_decay=item.consumable.can_item_decay,
            item_decay_temperature=item.consumable.item_decay_temperature,
            decay_to_item_row_id=item.consumable.decay_to_item_row_id,
            decay_to_item=_get_linked_item(db, item.consumable.decay_to_item_row_id, items_cache),
            max_liquid=item.consumable.max_liquid,
            allowed_liquids=item.consumable.allowed_liquids,
            cooked_from=cooked_from,
            burned_from=burned_from,
            decayed_from=decayed_from,
        )

    # Charger l'item de reparation
    repair_item_response = _get_linked_item(db, item.repair_item_id, items_cache)

    # Charger les upgrades possibles
    upgrades = db.query(ItemUpgrade).options(
        joinedload(ItemUpgrade.ingredients)
    ).filter(ItemUpgrade.source_item_row_id == row_id).all()

    upgrades_response = _build_upgrades_response(db, upgrades, items_cache)

    # Charger les relations inversees
    used_in_recipes_response = _build_used_in_recipes_response(db, row_id, bench_map, items_cache)
    used_in_upgrades_response = _build_used_in_upgrades_response(db, row_id, items_cache)
    upgraded_from_response = _build_upgraded_from_response(db, row_id, items_cache)

    # Charger les chaines completes de transformation
    upgrade_tree = _get_full_upgrade_tree(db, row_id)
    cooking_chain = _get_full_cooking_chain(db, row_id)

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
        repair_item=repair_item_response,
        repair_quantity_min=item.repair_quantity_min,
        repair_quantity_max=item.repair_quantity_max,
        salvage_row_id=item.salvage_row_id,
        weapon=weapon_response,
        equipment=item.equipment,
        consumable=consumable_response,
        deployable=item.deployable,
        recipes=enriched_recipes,
        salvage=salvage_response,
        upgrades=upgrades_response,
        used_in_recipes=used_in_recipes_response,
        used_in_upgrades=used_in_upgrades_response,
        upgraded_from=upgraded_from_response,
        upgrade_tree=upgrade_tree,
        cooking_chain=cooking_chain,
    )
