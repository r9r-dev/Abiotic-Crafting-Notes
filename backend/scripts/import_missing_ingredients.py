#!/usr/bin/env python3
"""
Script pour importer les ingrédients manquants avec leurs traductions FR.

Ce script :
1. Extrait les ingrédients utilisés dans les variants mais absents de la table items
2. Cherche leurs traductions dans fr.json
3. Les insère dans la table items
"""

import json
import re
import os
import sys
from pathlib import Path

# Ajouter le dossier parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.database import SessionLocal, engine


def load_fr_translations(data_dir: Path) -> dict[str, str]:
    """Charge les traductions FR depuis fr.json."""
    fr_path = data_dir / "fr.json"
    with open(fr_path, encoding="utf-8") as f:
        data = json.load(f)

    # Extraire toutes les clés _ItemName et _ItemNameOverride
    translations = {}

    def extract_from_dict(d: dict, prefix: str = ""):
        for key, value in d.items():
            if isinstance(value, dict):
                extract_from_dict(value, key)
            elif isinstance(value, str):
                full_key = f"{prefix}.{key}" if prefix else key
                if "_ItemName" in key and "Override" not in key:
                    # Extraire l'item_id de la clé (ex: scrap_tech_ItemName -> scrap_tech)
                    item_key = key.replace("_ItemName", "")
                    translations[item_key.lower()] = value

    extract_from_dict(data)
    return translations


# Correspondances manuelles pour les cas difficiles
MANUAL_MAPPINGS = {
    # Armures carapace
    "carapace_gauntlets": "Gantelets carapace",
    "carapace_helm": "Casque carapace",
    "carapace_plackart": "Plaque carapace",
    "carapace_sabatons": "Solerets carapace",
    # A.E.G.I.S.
    "a_e_g_i_s_chestplate": "Plastron A.E.G.I.S.",
    "a_e_g_i_s_greaves": "Jambières A.E.G.I.S.",
    "a_e_g_i_s_helmet": "Casque A.E.G.I.S.",
    "a_e_g_i_s_pauldrons": "Épaulières A.E.G.I.S.",
    # F.O.R.G.E.
    "f_o_r_g_e_chestplate": "Plastron F.O.R.G.E.",
    # Nourriture
    "egg": "Œuf",
    "cooked_fried_egg": "Œuf au plat",
    "anteverse_cheese": "Fromage de l'Antévers",
    "anteverse_wheat": "Blé de l'Antévers",
    "antepasta": "Antépasta",
    "atypical_butter": "Beurre atypique",
    "canned_peas": "Petits pois en conserve",
    "ice_cream": "Glace",
    "melted_ice_cream": "Glace fondue",
    "nachos": "Nachos",
    "space_lettuce": "Laitue spatiale",
    "super_tomato": "Super tomate",
    "buttery_popcorn_kernels": "Grains de pop-corn beurrés",
    "raw_alien_drumstick": "Cuisse d'alien crue",
    "raw_carbuncle": "Escarboucle crue",
    "raw_carbuncle_casserole": "Casserole d'escarboucle crue",
    "raw_exor_heart": "Cœur d'exor cru",
    "raw_larva_meat": "Viande de larve crue",
    "raw_peccary_chop": "Côtelette de pécari crue",
    "raw_peccary_sausages": "Saucisses de pécari crues",
    "raw_penumbra_filet": "Filet de pénombre cru",
    "raw_pest_rump": "Croupe de nuisible crue",
    "raw_silken_betta_filet": "Filet de betta soyeux cru",
    "cooked_pest": "Nuisible cuit",
    "portal_fish_stew": "Ragoût de poisson de portail",
    "milk_sac": "Poche de lait",
    # Matériaux
    "test_tube": "Tube à essai",
    "wood_plank": "Planche de bois",
    "power_cell": "Cellule d'énergie",
    "steel_cable": "Câble en acier",
    "refined_carbon": "Carbone raffiné",
    "liquid_crystal": "Cristal liquide",
    "powdered_crystal": "Cristal en poudre",
    "glow_shard": "Éclat lumineux",
    "optic_lens": "Lentille optique",
    "pressure_gauge": "Manomètre",
    "power_supply_unit": "Bloc d'alimentation",
    "projection_matrix": "Matrice de projection",
    "solder_material": "Soudure",
    "rubber_band_ball": "Boule d'élastiques",
    "magazines": "Magazines",
    "military_electronics": "Électronique militaire",
    "security_bot_cpu": "CPU de robot de sécurité",
    "jailbroken_cpu": "CPU débridé",
    "transcendium": "Transcendium",
    "transuranic_superalloy": "Superalliage transuranique",
    "tarasque_ichor": "Ichor de tarasque",
    "petn": "PETN",
    # Équipement
    "behemoth_helmet": "Casque béhémoth",
    "bio_metric_armwraps": "Brassards biométriques",
    "bio_mimic_armwraps": "Brassards biomimétiques",
    "bionic_legs": "Jambes bioniques",
    "charge_shield": "Bouclier de charge",
    "core_companion": "Compagnon central",
    "crafting_bench": "Établi",
    "cushion_chestplate": "Plastron coussin",
    "electro_thrower": "Électro-lanceur",
    "gate_nvgs": "LVN du GATE",
    "makeshift_nvgs": "LVN de fortune",
    "smashed_gate_nvgs": "LVN du GATE cassées",
    "geiger_counter_keychain": "Porte-clés compteur Geiger",
    "hardlight_shield_generator": "Générateur de bouclier de lumière solide",
    "hazard_crate": "Caisse de danger",
    "hazardous_materials_suit": "Combinaison matières dangereuses",
    "horned_helmet": "Casque à cornes",
    "jotunhelm": "Heaume de Jotun",
    "lab_burner": "Brûleur de laboratoire",
    "lightning_spear": "Lance foudroyante",
    "long_jump_pack": "Pack de saut en longueur",
    "magbow": "Arc magnétique",
    "makeshift_armwraps": "Brassards de fortune",
    "makeshift_chestplate": "Plastron de fortune",
    "makeshift_crossbow": "Arbalète de fortune",
    "makeshift_headlamp": "Lampe frontale de fortune",
    "makeshift_helmet": "Casque de fortune",
    "makeshift_legwraps": "Jambières de fortune",
    "maestro_adornments": "Ornements de maestro",
    "maestro_casque": "Casque de maestro",
    "maestro_greaves": "Jambières de maestro",
    "maestro_vambraces": "Brassards de maestro",
    "patois_rifle": "Fusil patois",
    "repair_and_salvage_station": "Station de réparation et récupération",
    "research_pack": "Pack de recherche",
    "romag_shotgun": "Fusil à pompe Romag",
    "talagi_magnum": "Talagi Magnum",
    "thermal_mallet": "Maillet thermique",
    "toroidal_power_transformer": "Transformateur toroïdal",
    "welding_spear": "Lance de soudure",
    "frying_pan_makeshift": "Poêle de fortune",
    "full_pot_of_water": "Marmite d'eau pleine",
    # Créatures
    "carbuncle_balloon": "Ballon d'escarboucle",
    "carbuncle_mushroom": "Champignon d'escarboucle",
    "dangling_gravity_cube": "Cube de gravité suspendu",
    "mystagogue_s_head": "Tête de mystagogue",
    "symphonist_head": "Tête de symphoniste",
    "peccary_alpha_skull": "Crâne de pécari alpha",
    "polished_human_skull": "Crâne humain poli",
    "purported_grimoire": "Grimoire présumé",
    "skip": "Skip",
}


def normalize_item_id(item_id: str) -> list[str]:
    """Génère des variantes possibles d'un item_id pour le matching."""
    variants = [item_id]

    # Inverser les mots séparés par _
    parts = item_id.split("_")
    if len(parts) >= 2:
        # Inverser tout
        variants.append("_".join(reversed(parts)))
        # Inverser les 2 premiers
        variants.append("_".join([parts[1], parts[0]] + parts[2:]))
        # Inverser les 2 derniers
        variants.append("_".join(parts[:-2] + [parts[-1], parts[-2]]))

    # Ajouter des préfixes courants
    prefixes = ["food_", "scrap_", "item_", "resource_", "mat_", "craft_", "tool_", "weapon_", "armor_"]
    for prefix in prefixes:
        variants.append(prefix + item_id)
        if item_id.startswith(prefix):
            variants.append(item_id[len(prefix):])

    return variants


def find_translation(item_id: str, item_name: str, translations: dict[str, str]) -> str | None:
    """Trouve la traduction FR pour un item."""
    # 1. Vérifier les correspondances manuelles en priorité
    if item_id in MANUAL_MAPPINGS:
        return MANUAL_MAPPINGS[item_id]

    # 2. Essayer les variantes de l'item_id
    for variant in normalize_item_id(item_id):
        if variant in translations:
            return translations[variant]

    # Essayer avec le nom anglais normalisé
    normalized_name = item_name.lower().replace(" ", "_").replace("-", "_").replace("'", "")
    for variant in normalize_item_id(normalized_name):
        if variant in translations:
            return translations[variant]

    # Recherche partielle stricte : la clé doit correspondre exactement à l'item_id
    # ou l'item_id doit être un suffixe/préfixe significatif (>50% de la longueur)
    for key, value in translations.items():
        # Correspondance exacte avec préfixe/suffixe
        if key.endswith("_" + item_id) or key.startswith(item_id + "_"):
            return value
        # L'item_id est la clé avec un préfixe court (ex: food_anteburger -> anteburger)
        if "_" in key:
            key_parts = key.split("_", 1)
            if len(key_parts) == 2 and key_parts[1] == item_id:
                return value

    return None


def get_missing_ingredients(session) -> list[tuple[str, str]]:
    """Récupère les ingrédients manquants de la base."""
    query = text("""
        WITH all_ingredients AS (
            SELECT DISTINCT
                ingredient->>'item_id' AS item_id,
                ingredient->>'item_name' AS item_name
            FROM items,
                jsonb_array_elements(variants) AS variant,
                jsonb_array_elements(variant->'ingredients') AS ingredient
        )
        SELECT ai.item_id, ai.item_name
        FROM all_ingredients ai
        LEFT JOIN items i ON ai.item_id = i.id
        WHERE i.id IS NULL
        ORDER BY ai.item_name
    """)
    result = session.execute(query)
    return [(row[0], row[1]) for row in result]


def insert_missing_items(session, items: list[dict]):
    """Insère les items manquants dans la table."""
    for item in items:
        query = text("""
            INSERT INTO items (id, name, name_fr, category, variants)
            VALUES (:id, :name, :name_fr, :category, '[]'::jsonb)
            ON CONFLICT (id) DO UPDATE SET name_fr = :name_fr
        """)
        session.execute(query, {
            "id": item["id"],
            "name": item["name"],
            "name_fr": item["name_fr"],
            "category": "Base Resource"
        })
    session.commit()


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Import des ingrédients manquants avec traductions FR")
    parser.add_argument("--yes", "-y", action="store_true", help="Confirmer automatiquement l'insertion")
    parser.add_argument("--dry-run", action="store_true", help="Afficher sans insérer")
    args = parser.parse_args()

    # Chemins
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent.parent / "data"

    print(f"Chargement des traductions depuis {data_dir / 'fr.json'}...")
    translations = load_fr_translations(data_dir)
    print(f"  {len(translations)} traductions chargées")

    print("\nConnexion à la base de données...")
    session = SessionLocal()

    try:
        print("Récupération des ingrédients manquants...")
        missing = get_missing_ingredients(session)
        print(f"  {len(missing)} ingrédients manquants")

        # Trouver les traductions
        items_to_insert = []
        not_found = []

        for item_id, item_name in missing:
            name_fr = find_translation(item_id, item_name, translations)
            if name_fr:
                items_to_insert.append({
                    "id": item_id,
                    "name": item_name,
                    "name_fr": name_fr
                })
            else:
                not_found.append((item_id, item_name))

        print(f"\nTraductions trouvées : {len(items_to_insert)}")
        print(f"Non trouvées : {len(not_found)}")

        if items_to_insert:
            print("\nTraductions trouvées :")
            for item in items_to_insert:
                print(f"  {item['id']}: {item['name']} -> {item['name_fr']}")

        if not_found:
            print("\nIngrédients sans traduction (resteront en anglais) :")
            for item_id, item_name in not_found:
                print(f"  {item_id}: {item_name}")

        # Insérer
        if args.dry_run:
            print("\n[DRY-RUN] Aucune modification effectuée.")
        elif items_to_insert:
            if args.yes:
                insert_missing_items(session, items_to_insert)
                print(f"\n{len(items_to_insert)} items insérés avec succès !")
            else:
                response = input(f"\nInsérer {len(items_to_insert)} items ? (o/n) ")
                if response.lower() == "o":
                    insert_missing_items(session, items_to_insert)
                    print("Items insérés avec succès !")
                else:
                    print("Annulé.")

    finally:
        session.close()


if __name__ == "__main__":
    main()
