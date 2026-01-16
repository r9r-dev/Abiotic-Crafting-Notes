#!/usr/bin/env python3
"""
Script de traduction de recipes.json vers recipes_fr.json
Utilise les fichiers de localisation en.json et fr.json du jeu.
"""
import json
import re
from pathlib import Path


# Traductions manuelles pour les termes non trouvés dans les fichiers de localisation
# (ne pas ajouter ici les traductions qui existent déjà dans en.json/fr.json)
MANUAL_TRANSLATIONS = {
    # Créatures (noms courts non présents dans la loc)
    "Snow Peccary": "Pécari des neiges",
    "Shield Trooper": "Soldat bouclier",
    # Factions
    "Order": "L'Ordre",
}

# Stations de cuisine (Baking) - les items craftés à ces stations doivent avoir source_type "Baking"
BAKING_STATIONS = {
    "Chef's Counter",
    "Convection Oven",
    "Cooking Pot",
    # Versions traduites (pour le post-traitement)
    "Comptoir du chef",
    "Four à convection",
    "Marmite",
}

# Items à forcer en Baking (sushis individuels sans station définie, ingrédients de plateaux)
FORCE_BAKING_ITEMS = {
    "fogiri",
    "icebergiri",
    "gutfish_unagi",
    "mushy_crab_sushi",
    "penumbra_nigiri",
    "single_colorful_maki",
    "single_penumbra_maki",
    "boiled_crab_sushi",
    "shadefish_nigiri",
    "simple_shadefish_maki",
}


def load_json(path: Path) -> dict:
    """Charge un fichier JSON."""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path: Path, data: dict) -> None:
    """Sauvegarde un fichier JSON."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def build_translation_index(en_loc: dict, fr_loc: dict) -> dict[str, str]:
    """
    Construit un dictionnaire de traduction : texte EN -> texte FR.
    Parcourt toutes les sections des fichiers de localisation.
    """
    translations = {}

    for section_name, section in en_loc.items():
        if not isinstance(section, dict):
            continue

        fr_section = fr_loc.get(section_name, {})
        if not isinstance(fr_section, dict):
            continue

        for key, en_value in section.items():
            if isinstance(en_value, str) and key in fr_section:
                fr_value = fr_section[key]
                if isinstance(fr_value, str) and en_value not in translations:
                    translations[en_value] = fr_value

    return translations


def get_acronym_variants(text: str) -> list[str]:
    """
    Génère les variantes d'un texte avec/sans point final après les acronymes.
    Ex: "A.E.G.I.S. Greaves" -> ["A.E.G.I.S Greaves"]
        "A.E.G.I.S Greaves" -> ["A.E.G.I.S. Greaves"]
    """
    variants = []

    # Variante 1: Enlever le point final des acronymes (X.X.X.X. -> X.X.X.X)
    without_dot = re.sub(r'(\b(?:[A-Z]\.){2,}[A-Z])\.\s', r'\1 ', text)
    if without_dot != text:
        variants.append(without_dot)

    # Variante 2: Ajouter le point final aux acronymes (X.X.X.X -> X.X.X.X.)
    with_dot = re.sub(r'(\b(?:[A-Z]\.){2,}[A-Z])(\s)', r'\1.\2', text)
    if with_dot != text:
        variants.append(with_dot)

    return variants


def translate_value(value: str, translations: dict[str, str]) -> str:
    """
    Traduit une valeur avec plusieurs stratégies :
    1. Traductions manuelles
    2. Recherche directe du texte complet
    3. Normalisation des acronymes (A.E.G.I.S vs A.E.G.I.S.)
    4. Recherche avec normalisation "and" <-> "&"
    5. Décomposition "X (Y)" -> traduit X et Y séparément
    6. Décomposition "X - Y"
    """
    # 1. Traductions manuelles (prioritaires)
    if value in MANUAL_TRANSLATIONS:
        return MANUAL_TRANSLATIONS[value]

    # 2. Recherche directe
    if value in translations:
        return translations[value]

    # 3. Normalisation des acronymes (ex: "A.E.G.I.S. Greaves" <-> "A.E.G.I.S Greaves")
    for variant in get_acronym_variants(value):
        if variant in translations:
            return translations[variant]

    # 4. Normalisation "and" <-> "&"
    if ' and ' in value:
        alt_value = value.replace(' and ', ' & ')
        if alt_value in translations:
            return translations[alt_value]
    if ' & ' in value:
        alt_value = value.replace(' & ', ' and ')
        if alt_value in translations:
            return translations[alt_value]

    # 5. Pattern "X (Y)" - ex: "Solder (Material)"
    match = re.match(r'^(.+?)\s*\((.+?)\)$', value)
    if match:
        part1, part2 = match.groups()
        tr1 = translate_value(part1, translations)  # Récursif pour appliquer toutes les stratégies
        tr2 = translate_value(part2, translations)
        if tr1 != part1 or tr2 != part2:
            return f"{tr1} ({tr2})"

    # 6. Pattern "X - Y" - ex: "Item - Variant"
    if ' - ' in value:
        parts = value.split(' - ', 1)
        tr_parts = [translate_value(p, translations) for p in parts]
        if tr_parts != parts:
            return ' - '.join(tr_parts)

    return value


# Clés à ne pas traduire (identifiants techniques)
SKIP_KEYS = {
    'id', 'item_id', 'result_id', 'type',
    'icon_url', 'icon_local', 'wiki_url',
    'research_category'
}


def translate_dict(obj: dict, translations: dict[str, str], stats: dict) -> dict:
    """Traduit récursivement tous les champs textuels d'un dictionnaire."""
    result = {}

    for key, value in obj.items():
        # Ne pas traduire les clés techniques
        if key in SKIP_KEYS:
            result[key] = value
            continue

        if isinstance(value, str):
            translated = translate_value(value, translations)
            if translated != value:
                stats['translated'] += 1
            else:
                stats['untranslated'].add(value)
            result[key] = translated
        elif isinstance(value, dict):
            result[key] = translate_dict(value, translations, stats)
        elif isinstance(value, list):
            result[key] = translate_list(value, translations, stats)
        else:
            result[key] = value

    return result


def translate_list(arr: list, translations: dict[str, str], stats: dict) -> list:
    """Traduit récursivement tous les éléments d'une liste."""
    result = []

    for item in arr:
        if isinstance(item, str):
            translated = translate_value(item, translations)
            if translated != item:
                stats['translated'] += 1
            else:
                stats['untranslated'].add(item)
            result.append(translated)
        elif isinstance(item, dict):
            result.append(translate_dict(item, translations, stats))
        elif isinstance(item, list):
            result.append(translate_list(item, translations, stats))
        else:
            result.append(item)

    return result


def post_process_items(recipes: dict) -> int:
    """
    Post-traitement des items pour corriger les source_types.
    Retourne le nombre d'items modifiés.

    Corrections appliquées :
    - Items avec station de cuisine (Comptoir du chef, Four, Marmite) :
      Crafting -> Baking
    - Items de la liste FORCE_BAKING_ITEMS (sushis individuels, etc.) :
      Crafting -> Baking
    """
    modified_count = 0

    for item_id, item in recipes.items():
        if not isinstance(item, dict):
            continue

        # Vérifier si l'item doit être forcé en Baking
        force_baking = item_id in FORCE_BAKING_ITEMS

        # Vérifier si l'item a une variante avec une station de cuisine
        has_baking_station = False
        for variant in item.get('variants', []):
            station = variant.get('station', '')
            if station in BAKING_STATIONS:
                has_baking_station = True
                break

        if has_baking_station or force_baking:
            # Changer Crafting en Baking dans source_types
            for source in item.get('source_types', []):
                if source.get('type') == 'Crafting':
                    source['type'] = 'Baking'
                    modified_count += 1

    return modified_count


def build_upgrade_from(recipes: dict) -> int:
    """
    Construit les recettes d'amélioration inversées.

    Pour chaque item A qui peut être amélioré en item B,
    ajoute dans B un champ 'upgrade_from' avec les infos pour obtenir B depuis A.

    Retourne le nombre d'items avec upgrade_from ajouté.
    """
    upgrade_count = 0

    # Collecter toutes les relations d'upgrade
    # upgrade_map[target_id] = [(source_id, source_name, ingredients, station), ...]
    upgrade_map: dict[str, list] = {}

    for item_id, item in recipes.items():
        if not isinstance(item, dict):
            continue

        for upgrade in item.get('upgrades', []):
            target_id = upgrade.get('result_id')
            if not target_id:
                continue

            if target_id not in upgrade_map:
                upgrade_map[target_id] = []

            upgrade_map[target_id].append({
                'source_id': item_id,
                'source_name': item.get('name', item_id),
                'ingredients': upgrade.get('ingredients', []),
                'station': upgrade.get('station'),
            })

    # Ajouter upgrade_from aux items cibles
    for target_id, sources in upgrade_map.items():
        if target_id in recipes:
            recipes[target_id]['upgrade_from'] = sources
            upgrade_count += 1

    return upgrade_count


def main():
    data_dir = Path(__file__).parent.parent.parent / 'data'

    recipes_path = data_dir / 'recipes.json'
    en_path = data_dir / 'en.json'
    fr_path = data_dir / 'fr.json'
    output_path = data_dir / 'recipes_fr.json'

    print("Chargement des fichiers...")
    recipes = load_json(recipes_path)
    en_loc = load_json(en_path)
    fr_loc = load_json(fr_path)

    print("Construction de l'index de traduction...")
    translations = build_translation_index(en_loc, fr_loc)
    print(f"  {len(translations)} traductions disponibles")

    print("Traduction des recettes...")
    stats = {'translated': 0, 'untranslated': set()}
    recipes_fr = translate_dict(recipes, translations, stats)

    print("Post-traitement des items...")
    modified = post_process_items(recipes_fr)
    print(f"  {modified} items corrigés (Crafting -> Baking pour stations de cuisine)")

    print("Construction des recettes d'amélioration inversées...")
    upgrade_count = build_upgrade_from(recipes_fr)
    print(f"  {upgrade_count} items avec upgrade_from ajouté")

    print("Sauvegarde de recipes_fr.json...")
    save_json(output_path, recipes_fr)

    print("\n=== Statistiques ===")
    print(f"Champs traduits: {stats['translated']}")
    print(f"Champs non traduits: {len(stats['untranslated'])}")

    if stats['untranslated']:
        # Filtrer les valeurs qui ressemblent à des textes traduisibles
        missing = [v for v in stats['untranslated']
                   if len(v) > 2 and not v.startswith('http') and not v.startswith('data/')]
        if missing:
            print(f"\nTextes non traduits (premiers 15):")
            for text in sorted(missing)[:15]:
                print(f"  - {text}")

    print(f"\nFichier créé: {output_path}")


if __name__ == '__main__':
    main()
