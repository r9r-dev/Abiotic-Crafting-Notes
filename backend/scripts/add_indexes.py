#!/usr/bin/env python3
"""
Script pour ajouter les index de performance à la base de données.

Usage:
    python scripts/add_indexes.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.database import engine


# Index à créer
INDEXES = [
    # ============================================
    # RECHERCHE TEXTUELLE (Full-Text Search)
    # ============================================

    # Extension pg_trgm pour recherche fuzzy (LIKE '%xxx%')
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",

    # Index trigram sur items.name pour recherche partielle
    """CREATE INDEX IF NOT EXISTS ix_items_name_trgm
       ON items USING gin (name gin_trgm_ops)""",

    # Index trigram sur npcs.name
    """CREATE INDEX IF NOT EXISTS ix_npcs_name_trgm
       ON npcs USING gin (name gin_trgm_ops)""",

    # ============================================
    # INDEX COMPOSITES pour requêtes fréquentes
    # ============================================

    # Items par catégorie + nom (pour listing triés)
    """CREATE INDEX IF NOT EXISTS ix_items_category_name
       ON items (category, name)""",

    # Recettes par établi + output (pour afficher recettes d'un bench)
    """CREATE INDEX IF NOT EXISTS ix_recipes_bench_output
       ON recipes (bench_row_id, output_item_row_id)""",

    # ============================================
    # INDEX SUR FK pour jointures
    # ============================================

    # recipe_ingredients.recipe_id (FK sans index explicite)
    """CREATE INDEX IF NOT EXISTS ix_recipe_ingredients_recipe_id
       ON recipe_ingredients (recipe_id)""",

    # salvage_drops.salvage_id (FK sans index explicite)
    """CREATE INDEX IF NOT EXISTS ix_salvage_drops_salvage_id
       ON salvage_drops (salvage_id)""",

    # recipe_substitute_items.substitute_id (FK sans index explicite)
    """CREATE INDEX IF NOT EXISTS ix_recipe_substitute_items_substitute_id
       ON recipe_substitute_items (substitute_id)""",

    # bench_upgrades.bench_id (FK sans index explicite)
    """CREATE INDEX IF NOT EXISTS ix_bench_upgrades_bench_id
       ON bench_upgrades (bench_id)""",

    # ============================================
    # INDEX pour "où trouver" un item
    # ============================================

    # Consumables: trouver items qui cuisent vers un autre
    """CREATE INDEX IF NOT EXISTS ix_consumables_cooked_item
       ON consumables (cooked_item_row_id) WHERE cooked_item_row_id IS NOT NULL""",

    # Consumables: trouver items qui pourrissent vers un autre
    """CREATE INDEX IF NOT EXISTS ix_consumables_decay_item
       ON consumables (decay_to_item_row_id) WHERE decay_to_item_row_id IS NOT NULL""",

    # ============================================
    # INDEX pour filtres courants
    # ============================================

    # Weapons: filtrer par type de dégâts
    """CREATE INDEX IF NOT EXISTS ix_weapons_damage_type
       ON weapons (damage_type) WHERE damage_type IS NOT NULL""",

    # Equipment: filtrer par slot
    """CREATE INDEX IF NOT EXISTS ix_equipment_slot
       ON equipment (equip_slot) WHERE equip_slot IS NOT NULL""",

    # Items: filtrer par release_group (DLC)
    """CREATE INDEX IF NOT EXISTS ix_items_release_group
       ON items (release_group)""",
]


def main():
    print("=" * 60)
    print("AJOUT DES INDEX DE PERFORMANCE")
    print("=" * 60)

    with engine.connect() as conn:
        for idx_sql in INDEXES:
            # Extraire le nom de l'index pour l'affichage
            if "CREATE INDEX" in idx_sql:
                idx_name = idx_sql.split("IF NOT EXISTS")[1].split("ON")[0].strip()
            elif "CREATE EXTENSION" in idx_sql:
                idx_name = idx_sql.split("IF NOT EXISTS")[1].strip()
            else:
                idx_name = idx_sql[:50]

            print(f"  Création: {idx_name}...")
            try:
                conn.execute(text(idx_sql))
                conn.commit()
                print(f"    OK")
            except Exception as e:
                print(f"    ERREUR: {e}")

    print("\n" + "=" * 60)
    print("INDEX CRÉÉS")
    print("=" * 60)


if __name__ == "__main__":
    main()
