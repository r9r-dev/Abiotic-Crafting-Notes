#!/usr/bin/env python3
"""
Script pour extraire le mapping des dialogues depuis les fichiers DialogueWave.
Utilise les traductions françaises depuis fr.json.

Usage:
    python scripts/extract_dialogue_mapping.py

Output:
    data/dialogue_mapping.json
"""

import json
from pathlib import Path


# Chemins
DATA_DIR = Path(__file__).parent.parent.parent / "data"
AUDIO_DIR = DATA_DIR / "Audio" / "NarrativeNPCs"
FR_JSON = DATA_DIR / "fr.json"
OUTPUT_FILE = DATA_DIR / "dialogue_mapping.json"

def load_french_translations() -> dict[str, str]:
    """Charge les traductions françaises depuis fr.json.

    Retourne un dictionnaire indexe par le prefix GUID (sans le suffixe).
    """
    if not FR_JSON.exists():
        print(f"Fichier de traduction non trouve: {FR_JSON}")
        return {}

    with open(FR_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Les dialogues sont dans la section "Dialogue"
    dialogues = data.get("Dialogue", {})

    # Creer un index par prefix GUID (partie avant le dernier underscore)
    guid_index = {}
    for key, text in dialogues.items():
        if "_" in key:
            # Extraire le GUID (partie avant le dernier underscore)
            guid_prefix = key.rsplit("_", 1)[0]
            guid_index[guid_prefix] = text

    return guid_index


def guid_to_prefix(guid: str) -> str:
    """Convertit un LocalizationGUID en prefix de cle de traduction.

    Ex: '8218F6DF-40902D38-63F968A5-596E3631' -> '8218F6DF40902D3863F968A5596E3631'
    """
    return guid.replace("-", "")


def extract_mapping(french_translations: dict[str, str]) -> dict[str, str]:
    """Extrait le mapping asset_name -> texte français depuis les fichiers DialogueWave."""
    mapping = {}
    found_count = 0
    fallback_count = 0

    if not AUDIO_DIR.exists():
        print(f"Dossier non trouve: {AUDIO_DIR}")
        return mapping

    # Parcourir tous les fichiers *_Dialogue.json
    dialogue_files = list(AUDIO_DIR.rglob("*_Dialogue.json"))
    print(f"Traitement de {len(dialogue_files)} fichiers...")

    for filepath in dialogue_files:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            if not data or not isinstance(data, list):
                continue

            for item in data:
                if item.get("Type") != "DialogueWave":
                    continue

                name = item.get("Name")
                properties = item.get("Properties", {})
                localization_guid = properties.get("LocalizationGUID")
                spoken_text = properties.get("SpokenText")

                if not name:
                    continue

                # Essayer de trouver la traduction française
                text = None
                if localization_guid:
                    guid_prefix = guid_to_prefix(localization_guid)
                    text = french_translations.get(guid_prefix)
                    if text:
                        found_count += 1

                # Fallback vers le texte anglais si pas de traduction
                if not text and spoken_text:
                    text = spoken_text
                    fallback_count += 1

                if text:
                    # Nettoyer le nom (enlever _Dialogue si present)
                    clean_name = name.replace("_Dialogue", "")
                    mapping[clean_name] = text

                    # Aussi garder avec _Dialogue pour compatibilite
                    mapping[name] = text

        except Exception as e:
            print(f"Erreur avec {filepath}: {e}")

    print(f"  - {found_count} traductions françaises trouvees")
    print(f"  - {fallback_count} fallbacks vers l'anglais")

    return mapping


def main():
    print("=" * 60)
    print("EXTRACTION DU MAPPING DES DIALOGUES (FRANÇAIS)")
    print("=" * 60)

    # Charger les traductions françaises
    print("\nChargement des traductions françaises...")
    french_translations = load_french_translations()
    print(f"{len(french_translations)} traductions disponibles")

    # Extraire le mapping
    print("\nExtraction du mapping...")
    mapping = extract_mapping(french_translations)

    print(f"\n{len(mapping)} entrees extraites")

    # Sauvegarder
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    print(f"Mapping sauvegarde dans: {OUTPUT_FILE}")

    # Afficher quelques exemples
    print("\nExemples:")
    for i, (key, value) in enumerate(list(mapping.items())[:5]):
        text_preview = value[:60] + "..." if len(value) > 60 else value
        print(f"  {key}: {text_preview}")


if __name__ == "__main__":
    main()
