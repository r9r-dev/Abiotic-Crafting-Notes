#!/usr/bin/env python3
"""
Script d'import des items depuis recipes_fr.json vers PostgreSQL JSONB.

Usage:
    python scripts/import_items.py

Nécessite les variables d'environnement PostgreSQL configurées.
"""

import json
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import Json


def get_connection():
    """Crée une connexion PostgreSQL depuis les variables d'environnement."""
    return psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=os.getenv("PGPORT", "5432"),
        database=os.getenv("POSTGRES_DB", "abiotic-factor"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
    )


def normalize_item(item_id: str, item_data: dict) -> dict:
    """Normalise les données d'un item pour l'import."""
    # S'assurer que l'ID est présent
    data = {"id": item_id, **item_data}

    # Nettoyer icon_local pour utiliser le format API
    if data.get("icon_local"):
        # Convertir "data/icons/xxx.png" en "/api/icons/xxx.png"
        icon_local = data["icon_local"]
        if icon_local.startswith("data/icons/"):
            data["icon_local"] = f"/api/icons/{icon_local.replace('data/icons/', '')}"

    return data


def import_items(json_path: Path, dry_run: bool = False):
    """Importe les items depuis le fichier JSON."""
    print(f"Lecture de {json_path}...")

    with open(json_path, "r", encoding="utf-8") as f:
        recipes = json.load(f)

    print(f"Trouvé {len(recipes)} items à importer")

    if dry_run:
        print("Mode dry-run: aucune modification en base")
        for item_id, item_data in list(recipes.items())[:5]:
            normalized = normalize_item(item_id, item_data)
            print(f"  - {item_id}: {normalized.get('name')}")
        return

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Vider la table existante
        cursor.execute("DELETE FROM items")
        print("Table items vidée")

        # Insérer les nouveaux items
        insert_sql = """
            INSERT INTO items (id, data)
            VALUES (%s, %s)
            ON CONFLICT (id) DO UPDATE SET
                data = EXCLUDED.data,
                updated_at = NOW()
        """

        count = 0
        for item_id, item_data in recipes.items():
            normalized = normalize_item(item_id, item_data)
            cursor.execute(insert_sql, (item_id, Json(normalized)))
            count += 1

            if count % 100 == 0:
                print(f"  Importé {count}/{len(recipes)} items...")

        conn.commit()
        print(f"Import terminé: {count} items importés")

        # Stats par catégorie
        cursor.execute("""
            SELECT category, COUNT(*)
            FROM items
            GROUP BY category
            ORDER BY COUNT(*) DESC
        """)
        print("\nRépartition par catégorie:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")

        # Stats par type de source
        cursor.execute("""
            SELECT
                source->>'type' as source_type,
                COUNT(DISTINCT id) as item_count
            FROM items,
                 jsonb_array_elements(data->'source_types') as source
            GROUP BY source->>'type'
            ORDER BY item_count DESC
        """)
        print("\nRépartition par type de source:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")

    except Exception as e:
        conn.rollback()
        print(f"Erreur: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def main():
    # Trouver le fichier recipes_fr.json
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent  # backend/scripts -> project root
    json_path = project_root / "data" / "recipes_fr.json"

    if not json_path.exists():
        print(f"Erreur: {json_path} non trouvé")
        sys.exit(1)

    dry_run = "--dry-run" in sys.argv

    import_items(json_path, dry_run=dry_run)


if __name__ == "__main__":
    main()
