#!/usr/bin/env python3
"""
Script d'import des données Abiotic Factor depuis les fichiers JSON.

Usage:
    python scripts/import_data.py [--reset]

Options:
    --reset     Supprime toutes les données avant l'import
"""

import json
import sys
import re
from pathlib import Path
from typing import Any

# Ajouter le dossier parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import engine, Base
from app.models import (
    Item, ItemCategory, ReleaseGroup,
    Weapon, Equipment, EquipSlot, Consumable, DecayTemperature, Deployable,
    Bench, BenchUpgrade, Recipe, RecipeIngredient, RecipeSubstitute, RecipeSubstituteItem,
    Salvage, SalvageDrop, NPC, NpcLootTable, Plant, Projectile,
    ItemUpgrade, ItemUpgradeIngredient,
    Buff,
    CompendiumEntry, CompendiumSection, CompendiumRecipeUnlock,
    CompendiumCategory, CompendiumUnlockType,
    NpcConversation, DialogueLine, DialogueUnlock,
    DialogueLineType, DialogueUnlockType,
)


# Chemins des données
DATA_DIR = Path(__file__).parent.parent.parent / "data"
ITEMS_DIR = DATA_DIR / "Items"
DATATABLES_DIR = DATA_DIR / "DataTables"
TRANSLATIONS_FR_FILE = DATA_DIR / "fr.json"
TRANSLATIONS_EN_FILE = DATA_DIR / "en.json"
DIALOGUE_MAPPING_FILE = DATA_DIR / "dialogue_mapping.json"


class DataImporter:
    """Classe principale pour l'import des données."""

    def __init__(self, session: Session):
        self.session = session
        self.translations_fr: dict = {}
        self.translations_en: dict = {}
        self.dialogue_mapping: dict = {}  # Mapping audio_asset_name -> texte
        self.items_cache: dict[str, dict] = {}  # Cache des items par row_id

    def load_translations(self) -> None:
        """Charge les traductions françaises et anglaises (fallback)."""
        print("Chargement des traductions...")

        # Charger les traductions françaises
        with open(TRANSLATIONS_FR_FILE, "r", encoding="utf-8") as f:
            self.translations_fr = json.load(f)
        fr_count = sum(len(v) for v in self.translations_fr.values())
        print(f"  {fr_count} traductions FR chargées")

        # Charger les traductions anglaises (fallback)
        with open(TRANSLATIONS_EN_FILE, "r", encoding="utf-8") as f:
            self.translations_en = json.load(f)
        en_count = sum(len(v) for v in self.translations_en.values())
        print(f"  {en_count} traductions EN chargées (fallback)")

        # Charger le mapping des dialogues
        if DIALOGUE_MAPPING_FILE.exists():
            with open(DIALOGUE_MAPPING_FILE, "r", encoding="utf-8") as f:
                self.dialogue_mapping = json.load(f)
            print(f"  {len(self.dialogue_mapping)} textes de dialogue chargés")

    def get_translation(self, table_name: str, row_id: str, field: str) -> str | None:
        """Récupère une traduction FR, avec fallback sur EN si absente."""
        key = f"{row_id}_{field}"

        # Essayer d'abord en français
        if table_name in self.translations_fr:
            value = self.translations_fr[table_name].get(key)
            if value:
                return value

        # Fallback sur l'anglais
        if table_name in self.translations_en:
            value = self.translations_en[table_name].get(key)
            if value:
                return value

        return None

    def load_json_file(self, filepath: Path) -> list[dict]:
        """Charge un fichier JSON Unreal Engine."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data

    def extract_rows(self, data: list[dict]) -> dict[str, dict]:
        """Extrait les rows d'une DataTable Unreal."""
        if not data or len(data) == 0:
            return {}
        return data[0].get("Rows", {})

    def find_property(self, obj: dict, prefix: str) -> Any:
        """Trouve une propriété par son préfixe (gère les suffixes Unreal)."""
        for key, value in obj.items():
            if key.startswith(prefix):
                return value
        return None

    def parse_data_table_ref(self, ref: dict | None) -> str | None:
        """Parse une référence DataTable pour extraire le RowName."""
        if not ref:
            return None
        row_name = ref.get("RowName")
        if row_name == "None" or row_name == "":
            return None
        return row_name

    def is_substitute_ref(self, ref: dict | None) -> bool:
        """Vérifie si la référence pointe vers ItemTable_RecipeSubstitutes."""
        if not ref:
            return False
        data_table = ref.get("DataTable", {})
        object_name = data_table.get("ObjectName", "")
        return "ItemTable_RecipeSubstitutes" in object_name

    def parse_asset_path(self, asset: dict | str | None) -> str | None:
        """Parse un chemin d'asset Unreal (peut être dict ou string)."""
        if not asset:
            return None
        if isinstance(asset, str):
            return asset
        if isinstance(asset, dict):
            return asset.get("AssetPathName") or asset.get("ObjectPath")
        return None

    def parse_icon_path(self, asset: dict | str | None) -> str | None:
        """Extrait le nom du fichier icône depuis un chemin Unreal.

        Ex: /Game/Textures/GUI/ItemIcons/itemicon_xxx.itemicon_xxx -> itemicon_xxx.png
        """
        path = self.parse_asset_path(asset)
        if not path:
            return None

        # Extraire le nom du fichier (dernière partie du chemin, avant le point)
        # Format: /Game/.../itemicon_xxx.itemicon_xxx
        parts = path.split("/")
        if parts:
            filename = parts[-1].split(".")[0]  # itemicon_xxx
            if filename and filename != "None":
                return f"{filename}.png"
        return None

    def safe_str(self, value: Any) -> str | None:
        """Convertit une valeur en string de manière sûre."""
        if value is None:
            return None
        if isinstance(value, str):
            if value == "" or value == "None":
                return None
            return value
        if isinstance(value, dict):
            # Pour les tags Unreal (TagName)
            if "TagName" in value:
                tag = value.get("TagName")
                return None if tag == "None" or tag == "" else tag
            # Pour les dictionnaires, essayer d'extraire le chemin d'asset
            return self.parse_asset_path(value)
        return str(value)

    def determine_item_category(self, table_name: str) -> ItemCategory:
        """Détermine la catégorie d'un item selon sa table source."""
        mapping = {
            "ItemTable_Weapons": ItemCategory.WEAPON,
            "ItemTable_Gear": ItemCategory.EQUIPMENT,
            "ItemTable_FoodAndGibs": ItemCategory.CONSUMABLE,
            "ItemTable_Deployables": ItemCategory.DEPLOYABLE,
            "ItemTable_Deployables_Small": ItemCategory.DEPLOYABLE_SMALL,
            "ItemTable_Deployables_CraftingBenches": ItemCategory.CRAFTING_BENCH,
            "ItemTable_Pickups": ItemCategory.PICKUP,
            "ItemTable_Craftables": ItemCategory.PICKUP,  # Craftables sont généralement des pickups
            "ItemTable_Plants": ItemCategory.PLANT,
            "ItemTable_Pets": ItemCategory.PET,
        }
        return mapping.get(table_name, ItemCategory.PICKUP)

    def parse_release_group(self, value: str | None) -> ReleaseGroup:
        """Parse le groupe de release."""
        if not value:
            return ReleaseGroup.CORE
        if "DarkEnergy" in value:
            return ReleaseGroup.DARK_ENERGY
        if "Community" in value:
            return ReleaseGroup.COMMUNITY
        return ReleaseGroup.CORE

    def parse_equip_slot(self, value: str | None) -> EquipSlot | None:
        """Parse le slot d'équipement depuis E_InventorySlotType::NewEnumeratorX."""
        if not value:
            return None
        # Mapping des valeurs Unreal Engine vers les slots
        mapping = {
            "NewEnumerator5": EquipSlot.HEAD,      # Casques
            "NewEnumerator6": EquipSlot.LEGS,      # Jambes
            "NewEnumerator7": EquipSlot.BACK,      # Sacs à dos
            "NewEnumerator12": EquipSlot.HANDS,    # Bras/Mains
            "NewEnumerator13": EquipSlot.SUIT,     # Combinaisons (corps entier)
            "NewEnumerator14": EquipSlot.TORSO,    # Torse (plastrons)
            "NewEnumerator15": EquipSlot.FACE,     # Visage (lampes, lunettes)
            "NewEnumerator16": EquipSlot.ACCESSORY,  # Accessoires/Gadgets
        }
        for key, slot in mapping.items():
            if key in value:
                return slot
        return None

    def parse_decay_temperature(self, value: str | None) -> DecayTemperature:
        """Parse la température de pourrissement."""
        if not value:
            return DecayTemperature.NONE
        value_upper = value.upper()
        if "COLD" in value_upper:
            return DecayTemperature.COLD
        if "WARM" in value_upper:
            return DecayTemperature.WARM
        if "HOT" in value_upper:
            return DecayTemperature.HOT
        return DecayTemperature.NONE

    def import_items_from_table(self, table_name: str, filepath: Path) -> int:
        """Importe les items d'une table spécifique."""
        print(f"  Import de {table_name}...")
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        count = 0
        category = self.determine_item_category(table_name)

        for row_id, row_data in rows.items():
            # Créer l'item de base
            item = Item(
                row_id=row_id,
                category=category,
                release_group=self.parse_release_group(
                    self.find_property(row_data, "ReleaseGroup")
                ),
                name=self.get_translation(table_name, row_id, "ItemName"),
                description=self.get_translation(table_name, row_id, "ItemDescription"),
                flavor_text=self.get_translation(table_name, row_id, "ItemFlavorText"),
                stack_size=self.find_property(row_data, "StackSize") or 1,
                weight=self.find_property(row_data, "Weight") or 0.0,
                max_durability=self.find_property(row_data, "MaxItemDurability") or 0.0,
                can_lose_durability=self.find_property(row_data, "CanLoseDurability") or False,
                chance_to_lose_durability=self.find_property(row_data, "ChanceToLoseDurability") or 0.0,
                icon_path=self.parse_icon_path(self.find_property(row_data, "InventoryIcon")),
                mesh_path=self.parse_asset_path(self.find_property(row_data, "WorldStaticMesh")),
                gameplay_tags=json.dumps(self.find_property(row_data, "GameplayTags") or []),
            )

            # Repair item
            repair_data = self.find_property(row_data, "RepairItem")
            if repair_data:
                item.repair_item_id = self.parse_data_table_ref(repair_data)
                item.repair_quantity_min = self.find_property(repair_data, "QuantityMin") or 0
                item.repair_quantity_max = self.find_property(repair_data, "QuantityMax") or 0

            # Salvage
            salvage_data = self.find_property(row_data, "SalvageData")
            if salvage_data:
                item.salvage_row_id = self.parse_data_table_ref(salvage_data)

            self.session.add(item)
            self.session.flush()  # Pour obtenir l'ID

            # Cache pour les références
            self.items_cache[row_id] = {"id": item.id, "data": row_data, "table": table_name}

            # Ajouter les données spécialisées selon la catégorie
            if category == ItemCategory.WEAPON:
                self._create_weapon(item, row_data)
            elif category == ItemCategory.EQUIPMENT:
                self._create_equipment(item, row_data)
            elif category == ItemCategory.CONSUMABLE:
                self._create_consumable(item, row_data)
            elif category in (ItemCategory.DEPLOYABLE, ItemCategory.DEPLOYABLE_SMALL, ItemCategory.CRAFTING_BENCH):
                self._create_deployable(item, row_data, category)

            count += 1

        return count

    def _create_weapon(self, item: Item, data: dict) -> None:
        """Crée les données d'arme associées."""
        weapon_data = self.find_property(data, "WeaponData") or {}

        # Extraire le type de dégâts (peut être dict ou string)
        damage_type_raw = self.find_property(weapon_data, "DamageType_Hitscan")
        damage_type = None
        if isinstance(damage_type_raw, dict):
            damage_type = damage_type_raw.get("ObjectName", "").split("'")[1] if "'" in str(damage_type_raw.get("ObjectName", "")) else None
        elif isinstance(damage_type_raw, str):
            damage_type = damage_type_raw

        # Extraire le projectile (peut être dict avec AssetPathName vide)
        projectile_raw = self.find_property(weapon_data, "OptionalProjectileToFire")
        projectile_row_id = self.parse_asset_path(projectile_raw)
        if projectile_row_id == "":
            projectile_row_id = None

        weapon = Weapon(
            item_id=item.id,
            is_melee=self.find_property(weapon_data, "Melee") or False,
            damage_per_hit=self.find_property(weapon_data, "DamagePerHit") or 0.0,
            damage_type=damage_type,
            time_between_shots=self.find_property(weapon_data, "TimeBetweenShots") or 0.0,
            burst_fire_count=self.find_property(weapon_data, "BurstFireCount") or 1,
            bullet_spread_min=self.find_property(weapon_data, "BulletSpread_Min") or 0.0,
            bullet_spread_max=self.find_property(weapon_data, "BulletSpread_Max") or 0.0,
            max_aim_correction=self.find_property(weapon_data, "MaxAimCorrection") or 0.0,
            recoil_amount=self.find_property(weapon_data, "RecoilAmount") or 0.0,
            maximum_hitscan_range=self.find_property(weapon_data, "MaximumHitscanRange") or 0.0,
            magazine_size=self.find_property(weapon_data, "MagazineSize") or 0,
            require_ammo=self.find_property(weapon_data, "RequireAmmo") or False,
            ammo_type_row_id=self.parse_data_table_ref(self.find_property(weapon_data, "AmmoType")),
            projectile_row_id=projectile_row_id,
            pellet_count=self.find_property(weapon_data, "PelletCount") or 1,
            tracer_per_shots=self.find_property(weapon_data, "TracerPerShots") or 1,
            loudness_primary=self.find_property(weapon_data, "LoudnessOnPrimaryUse") or 0.0,
            loudness_secondary=self.find_property(weapon_data, "LoudnessOnSecondaryUse") or 0.0,
            secondary_attack_type=self.safe_str(self.find_property(weapon_data, "SecondaryAttack")),
            underwater_state=self.safe_str(self.find_property(weapon_data, "UnderwaterState")),
        )
        self.session.add(weapon)

    def _create_equipment(self, item: Item, data: dict) -> None:
        """Crée les données d'équipement associées."""
        equip_data = self.find_property(data, "EquipmentData") or {}

        equipment = Equipment(
            item_id=item.id,
            equip_slot=self.parse_equip_slot(self.find_property(equip_data, "EquipSlot")),
            can_auto_equip=self.find_property(equip_data, "CanAutoEquip") or True,
            armor_bonus=self.find_property(equip_data, "ArmorBonus") or 0,
            heat_resist=self.find_property(equip_data, "HeatResist") or 0,
            cold_resist=self.find_property(equip_data, "ColdResist") or 0,
            damage_mitigation_types=json.dumps(self.find_property(equip_data, "DamageMitigationType") or []),
            is_container=self.find_property(equip_data, "IsContainer") or False,
            container_capacity=self.find_property(equip_data, "ContainerCapacity") or 0,
            container_weight_reduction=self.find_property(equip_data, "ContainerWeightReduction") or 0.0,
            set_bonus_row_id=self.parse_data_table_ref(self.find_property(equip_data, "SetBonus")),
        )
        self.session.add(equipment)

    def _create_consumable(self, item: Item, data: dict) -> None:
        """Crée les données de consommable associées."""
        consume_data = self.find_property(data, "ConsumableData") or {}
        cook_data = self.find_property(data, "CookableData") or {}
        liquid_data = self.find_property(data, "LiquidData") or {}

        consumable = Consumable(
            item_id=item.id,
            time_to_consume=self.find_property(consume_data, "TimeToConsume") or 1.0,
            hunger_fill=self.find_property(consume_data, "HungerFill") or 0.0,
            thirst_fill=self.find_property(consume_data, "ThirstFill") or 0.0,
            fatigue_fill=self.find_property(consume_data, "FatigueFill") or 0.0,
            continence_fill=self.find_property(consume_data, "ContinenceFill") or 0.0,
            sanity_fill=self.find_property(consume_data, "SanityFill") or 0.0,
            health_change=self.find_property(consume_data, "HealthChange") or 0.0,
            armor_change=self.find_property(consume_data, "ArmorChange") or 0.0,
            temperature_change=self.find_property(consume_data, "TemperatureChange") or 0.0,
            radiation_change=self.find_property(consume_data, "RadiationChange") or 0.0,
            radioactivity=self.find_property(consume_data, "Radioactivity") or 0.0,
            buffs_to_add=json.dumps(self.find_property(consume_data, "BuffsToAdd") or []),
            buffs_to_remove=json.dumps(self.find_property(consume_data, "BuffsToRemove") or []),
            consumable_tag=self.safe_str(self.find_property(consume_data, "ConsumableTag")),
            consumed_action=self.safe_str(self.find_property(consume_data, "ConsumedAction")),
            can_be_cooked=self.find_property(cook_data, "CanBeCooked") or False,
            is_cookware=self.find_property(cook_data, "IsCookware") or False,
            cooked_item_row_id=self.parse_data_table_ref(self.find_property(cook_data, "CookedItem")),
            burned_item_row_id=self.parse_data_table_ref(self.find_property(cook_data, "BurnedItem")),
            time_to_cook_baseline=self.find_property(cook_data, "TimeToCookBaseline") or 0.0,
            time_to_burn_baseline=self.find_property(cook_data, "TimeToBurnBaseline") or 0.0,
            requires_baking=self.find_property(cook_data, "RequiresBaking") or False,
            starting_portions=self.find_property(cook_data, "StartingPortions") or 1,
            can_item_decay=self.find_property(cook_data, "CanItemDecay") or False,
            item_decay_temperature=self.parse_decay_temperature(
                self.safe_str(self.find_property(cook_data, "ItemDecayTemperature"))
            ),
            decay_to_item_row_id=self.parse_data_table_ref(self.find_property(cook_data, "DecayToItem")),
            max_liquid=self.find_property(liquid_data, "MaxLiquid") or 0,
            allowed_liquids=json.dumps(self.find_property(liquid_data, "AllowedLiquids") or []),
        )
        self.session.add(consumable)

    def _create_deployable(self, item: Item, data: dict, category: ItemCategory) -> None:
        """Crée les données de déployable associées."""
        # Gérer placement_orientations qui peut être une string ou un array
        orientations = self.find_property(data, "PlacementOrientationsAllowed")
        if isinstance(orientations, str):
            orientations_json = json.dumps([orientations])
        elif isinstance(orientations, list):
            orientations_json = json.dumps(orientations)
        else:
            orientations_json = json.dumps([])

        deployable = Deployable(
            item_id=item.id,
            deployed_class_path=self.parse_asset_path(self.find_property(data, "DeployedItemClass")),
            placement_orientations=orientations_json,
            hologram_mesh_path=self.parse_asset_path(self.find_property(data, "DeployHologramMesh")),
            hologram_scale=self.find_property(data, "Scale_Hologram") or 1.0,
            is_small=category == ItemCategory.DEPLOYABLE_SMALL,
            is_crafting_bench=category == ItemCategory.CRAFTING_BENCH,
            texture_variant_row_id=self.parse_data_table_ref(self.find_property(data, "TextureVariant")),
        )
        self.session.add(deployable)

    def import_all_items(self) -> int:
        """Importe tous les items de toutes les tables."""
        print("\nImport des items...")
        total = 0

        # Liste des tables d'items à importer (dans l'ordre)
        tables = [
            "ItemTable_Pickups",
            "ItemTable_Craftables",
            "ItemTable_Weapons",
            "ItemTable_Gear",
            "ItemTable_FoodAndGibs",
            "ItemTable_Deployables",
            "ItemTable_Deployables_Small",
            "ItemTable_Deployables_CraftingBenches",
            "ItemTable_Plants",
            "ItemTable_Pets",
        ]

        for table_name in tables:
            filepath = ITEMS_DIR / f"{table_name}.json"
            if filepath.exists():
                count = self.import_items_from_table(table_name, filepath)
                total += count
                print(f"    {count} items importés")
            else:
                print(f"    [SKIP] Fichier non trouvé: {filepath}")

        return total

    def _import_recipes_from_file(self, filepath: Path) -> int:
        """Importe les recettes depuis un fichier."""
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        count = 0
        for row_id, row_data in rows.items():
            # Item créé
            item_to_create = self.find_property(row_data, "ItemToCreate")
            output_item_row_id = self.parse_data_table_ref(item_to_create)

            if not output_item_row_id:
                continue

            # Établi requis (BenchesRequired est une liste)
            benches_required = self.find_property(row_data, "BenchesRequired") or []
            bench_row_id = None
            if benches_required and len(benches_required) > 0:
                bench_row_id = self.parse_data_table_ref(benches_required[0])

            # Temps de craft
            craft_time = self.find_property(row_data, "CraftDuration") or 0.0

            # Tags de recette
            recipe_tags = self.find_property(row_data, "RecipeTags") or []

            recipe = Recipe(
                row_id=row_id,
                output_item_row_id=output_item_row_id,
                count_to_create=self.find_property(row_data, "CountToCreate") or 1,
                bench_row_id=bench_row_id,
                unlock_condition=json.dumps(self.find_property(row_data, "UnlockCondition")),
                is_default_unlocked=self.find_property(row_data, "IsDefaultUnlocked") or False,
                category=self.find_property(row_data, "Category"),
                subcategory=self.find_property(row_data, "Subcategory"),
                craft_time=craft_time,
                recipe_tags=json.dumps(recipe_tags) if recipe_tags else None,
            )
            self.session.add(recipe)
            self.session.flush()

            # Ingrédients
            recipe_items = self.find_property(row_data, "RecipeItems") or []
            for idx, ingredient in enumerate(recipe_items):
                item_ref = self.find_property(ingredient, "Item")
                item_row_id = self.parse_data_table_ref(item_ref)

                if item_row_id:
                    # Détecter si c'est un groupe de substitution (Any*)
                    is_substitute = self.is_substitute_ref(item_ref)

                    recipe_ingredient = RecipeIngredient(
                        recipe_id=recipe.id,
                        item_row_id=item_row_id,
                        quantity=self.find_property(ingredient, "Count") or 1,
                        position=idx,
                        is_substitute_group=is_substitute,
                        substitute_group_row_id=item_row_id if is_substitute else None,
                    )
                    self.session.add(recipe_ingredient)

            count += 1

        return count

    def import_recipes(self) -> int:
        """Importe les recettes de crafting et de cuisine."""
        print("\nImport des recettes...")
        total = 0

        # Recettes de crafting
        filepath = DATATABLES_DIR / "DT_Recipes.json"
        count = self._import_recipes_from_file(filepath)
        print(f"  {count} recettes de crafting importées")
        total += count

        # Recettes de cuisine (soupes)
        filepath = DATATABLES_DIR / "DT_SoupRecipes.json"
        if filepath.exists():
            count = self._import_recipes_from_file(filepath)
            print(f"  {count} recettes de cuisine importées")
            total += count

        print(f"  Total: {total} recettes")
        return total

    def import_salvage(self) -> int:
        """Importe les données de désassemblage."""
        print("\nImport du salvage...")
        filepath = DATATABLES_DIR / "DT_Salvage.json"
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        count = 0
        for row_id, row_data in rows.items():
            salvage = Salvage(
                row_id=row_id,
                source_item_row_id=row_id,  # Généralement le même que row_id
                salvage_time=self.find_property(row_data, "SalvageTime") or 0.0,
                bench_row_id=self.parse_data_table_ref(self.find_property(row_data, "RequiredBench")),
            )
            self.session.add(salvage)
            self.session.flush()

            # Drops - Note: la propriété s'appelle SalvageDropItems dans les données
            drops = self.find_property(row_data, "SalvageDropItems") or []
            for idx, drop in enumerate(drops):
                # La référence item est dans ItemDataTable, pas Item
                item_ref = self.find_property(drop, "ItemDataTable")
                item_row_id = self.parse_data_table_ref(item_ref)

                if item_row_id:
                    salvage_drop = SalvageDrop(
                        salvage_id=salvage.id,
                        item_row_id=item_row_id,
                        quantity_min=self.find_property(drop, "QuantityMin") or 1,
                        quantity_max=self.find_property(drop, "QuantityMax") or 1,
                        drop_chance=self.find_property(drop, "ChanceToDrop") or 1.0,
                        position=idx,
                    )
                    self.session.add(salvage_drop)

            count += 1

        print(f"  {count} profils de salvage importés")
        return count

    def _load_npc_icons_from_compendium(self) -> dict[str, str]:
        """Charge le mapping NPC row_id -> icon_path depuis le Compendium."""
        filepath = DATATABLES_DIR / "DT_Compendium.json"
        if not filepath.exists():
            return {}

        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        npc_icons = {}
        for entry_id, entry_data in rows.items():
            # Récupérer le row_id du NPC
            npc_row = entry_data.get("NPCRow", {})
            npc_row_id = npc_row.get("RowName")
            if not npc_row_id or npc_row_id == "None":
                continue

            # Récupérer l'image depuis la première section
            sections = entry_data.get("Sections", [])
            if sections:
                image_asset = sections[0].get("OptionalSectionImage", {})
                icon_path = self.parse_icon_path(image_asset)
                if icon_path:
                    npc_icons[npc_row_id] = icon_path

        return npc_icons

    def import_npcs(self) -> int:
        """Importe les NPCs."""
        print("\nImport des NPCs...")

        # Charger le mapping des icônes depuis le Compendium
        npc_icons = self._load_npc_icons_from_compendium()
        print(f"  {len(npc_icons)} icônes NPC trouvées dans le Compendium")

        filepath = DATATABLES_DIR / "DT_NPCList.json"
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        count = 0
        loot_table_count = 0
        for row_id, row_data in rows.items():
            # Collecter tous les loots à la mort (PotentialLootWhenKilled peut être une liste)
            death_loots = []
            loot_data = self.find_property(row_data, "PotentialLootWhenKilled")
            if loot_data:
                if isinstance(loot_data, list):
                    for item in loot_data:
                        loot_id = self.parse_data_table_ref(item)
                        if loot_id:
                            death_loots.append(loot_id)
                elif isinstance(loot_data, dict):
                    loot_id = self.parse_data_table_ref(loot_data)
                    if loot_id:
                        death_loots.append(loot_id)

            # Loot de découpe (GibInfo.GibSalvage)
            gib_salvage_row_id = None
            gib_info = self.find_property(row_data, "GibInfo")
            if gib_info:
                gib_salvage = self.find_property(gib_info, "GibSalvage")
                if gib_salvage:
                    gib_salvage_row_id = self.parse_data_table_ref(gib_salvage)

            # Utiliser le premier loot pour la colonne legacy
            loot_row_id = death_loots[0] if death_loots else None

            npc = NPC(
                row_id=row_id,
                name=self.get_translation("DT_NPCList", row_id, "DisplayName"),
                description=self.get_translation("DT_NPCList", row_id, "Description"),
                hp_head=self.find_property(row_data, "HP_Head") or 100.0,
                hp_body=self.find_property(row_data, "HP_Torso") or 100.0,  # Correction: HP_Torso dans les données
                hp_limbs=self.find_property(row_data, "HP_LeftArm") or 100.0,  # Approximation avec un membre
                melee_attack_damage=self.find_property(row_data, "MeleeAttackDamagePerHit") or 0.0,
                ranged_attack_damage=self.find_property(row_data, "RangedAttackDamage") or 0.0,
                attack_range=self.find_property(row_data, "AttackRange") or 0.0,
                default_walk_speed=self.find_property(row_data, "DefaultWalkSpeed") or 100.0,
                default_run_speed=self.find_property(row_data, "DefaultSprintSpeed") or 200.0,
                is_hostile=self.find_property(row_data, "IsHostile") or True,
                is_passive=self.find_property(row_data, "IsPassive") or False,
                aggro_range=self.find_property(row_data, "AggroRange") or 0.0,
                damage_resistances=json.dumps(self.find_property(row_data, "DamageResistances") or []),
                damage_weaknesses=json.dumps(self.find_property(row_data, "DamageWeaknesses") or []),
                loot_table_row_id=loot_row_id,
                gib_salvage_row_id=gib_salvage_row_id,
                spawn_weight=self.find_property(row_data, "SpawnWeight") or 1.0,
                category=self.safe_str(self.find_property(row_data, "DefaultFaction")),
                icon_path=npc_icons.get(row_id),
            )
            self.session.add(npc)
            self.session.flush()  # Pour obtenir l'ID du NPC

            # Ajouter tous les loots à la mort dans npc_loot_tables
            for idx, salvage_row_id in enumerate(death_loots):
                loot_entry = NpcLootTable(
                    npc_id=npc.id,
                    salvage_row_id=salvage_row_id,
                    loot_type="death",
                    position=idx,
                )
                self.session.add(loot_entry)
                loot_table_count += 1

            # Ajouter le loot de découpe dans npc_loot_tables
            if gib_salvage_row_id:
                loot_entry = NpcLootTable(
                    npc_id=npc.id,
                    salvage_row_id=gib_salvage_row_id,
                    loot_type="gib",
                    position=0,
                )
                self.session.add(loot_entry)
                loot_table_count += 1

            count += 1

        # Compter les NPCs avec icône
        npcs_with_icon = sum(1 for row_id in rows if row_id in npc_icons)
        print(f"  {count} NPCs importés ({npcs_with_icon} avec icône)")
        print(f"  {loot_table_count} tables de loot associées")
        return count

    def import_plants(self) -> int:
        """Importe les plantes."""
        print("\nImport des plantes...")
        filepath = DATATABLES_DIR / "DT_Plants.json"
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        count = 0
        for row_id, row_data in rows.items():
            plant = Plant(
                row_id=row_id,
                name=self.get_translation("DT_Plants", row_id, "DisplayName"),
                description=self.get_translation("DT_Plants", row_id, "Description"),
                seed_item_row_id=self.parse_data_table_ref(self.find_property(row_data, "SeedItem")),
                harvest_item_row_id=self.parse_data_table_ref(self.find_property(row_data, "HarvestItem")),
                grow_time=self.find_property(row_data, "GrowTime") or 0.0,
                harvest_quantity_min=self.find_property(row_data, "HarvestQuantityMin") or 1,
                harvest_quantity_max=self.find_property(row_data, "HarvestQuantityMax") or 1,
                water_requirement=self.find_property(row_data, "WaterRequirement") or 0.0,
                light_requirement=self.find_property(row_data, "LightRequirement") or 0.0,
                fertilizer_bonus=self.find_property(row_data, "FertilizerBonus") or 0.0,
                can_regrow=self.find_property(row_data, "CanRegrow") or False,
                regrow_time=self.find_property(row_data, "RegrowTime") or 0.0,
                growth_conditions=json.dumps(self.find_property(row_data, "GrowthConditions") or {}),
            )
            self.session.add(plant)
            count += 1

        print(f"  {count} plantes importées")
        return count

    def import_projectiles(self) -> int:
        """Importe les projectiles."""
        print("\nImport des projectiles...")
        filepath = DATATABLES_DIR / "DT_Projectiles.json"
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        count = 0
        for row_id, row_data in rows.items():
            projectile = Projectile(
                row_id=row_id,
                name=self.get_translation("DT_Projectiles", row_id, "ProjectileName"),
                description=self.get_translation("DT_Projectiles", row_id, "ProjectileDescription"),
                base_damage=self.find_property(row_data, "BaseDamage") or 0.0,
                damage_type=self.parse_asset_path(self.find_property(row_data, "DamageType")),
                initial_speed=self.find_property(row_data, "InitialSpeed") or 0.0,
                max_speed=self.find_property(row_data, "MaxSpeed") or 0.0,
                gravity_scale=self.find_property(row_data, "GravityScale") or 1.0,
                max_range=self.find_property(row_data, "MaxRange") or 0.0,
                lifetime=self.find_property(row_data, "Lifetime") or 0.0,
                has_explosion=self.find_property(row_data, "HasExplosion") or False,
                explosion_radius=self.find_property(row_data, "ExplosionRadius") or 0.0,
                explosion_damage=self.find_property(row_data, "ExplosionDamage") or 0.0,
                applies_status_effects=json.dumps(self.find_property(row_data, "AppliesStatusEffects") or []),
                mesh_path=self.parse_asset_path(self.find_property(row_data, "ProjectileMesh")),
                ammo_item_row_id=self.parse_data_table_ref(self.find_property(row_data, "AmmoItem")),
            )
            self.session.add(projectile)
            count += 1

        print(f"  {count} projectiles importés")
        return count

    def import_buffs(self) -> int:
        """Importe les buffs et debuffs."""
        print("\nImport des buffs...")

        # Les buffs sont dans les traductions, pas dans un fichier DataTable séparé
        # On extrait les row_id depuis les clés de traduction (format: {row_id}_DisplayName)
        buffs_data = {}

        # Parcourir les traductions FR pour extraire les buffs
        if "DT_BuffsDebuffs" in self.translations_fr:
            for key, value in self.translations_fr["DT_BuffsDebuffs"].items():
                if key.endswith("_DisplayName"):
                    row_id = key.replace("_DisplayName", "")
                    if row_id not in buffs_data:
                        buffs_data[row_id] = {"name": None, "description": None}
                    buffs_data[row_id]["name"] = value
                elif key.endswith("_DisplayDescription"):
                    row_id = key.replace("_DisplayDescription", "")
                    if row_id not in buffs_data:
                        buffs_data[row_id] = {"name": None, "description": None}
                    buffs_data[row_id]["description"] = value

        count = 0
        for row_id, data in buffs_data.items():
            buff = Buff(
                row_id=row_id,
                name=data["name"],
                description=data["description"],
            )
            self.session.add(buff)
            count += 1

        print(f"  {count} buffs importés")
        return count

    def import_recipe_substitutes(self) -> int:
        """Importe les groupes de substitution pour les recettes."""
        print("\nImport des substituts de recettes...")
        filepath = ITEMS_DIR / "ItemTable_RecipeSubstitutes.json"
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        count = 0
        for row_id, row_data in rows.items():
            substitute = RecipeSubstitute(
                row_id=row_id,
                name=self.get_translation("ItemTable_RecipeSubstitutes", row_id, "ItemTypeName"),
                description=self.get_translation("ItemTable_RecipeSubstitutes", row_id, "ItemTypeDescription"),
                icon_path=self.parse_icon_path(self.find_property(row_data, "ItemTypeIcon")),
            )
            self.session.add(substitute)
            self.session.flush()

            # Items du groupe
            items_of_type = self.find_property(row_data, "ItemsOfType") or []
            for item_ref in items_of_type:
                item_row_id = self.parse_data_table_ref(item_ref)
                if item_row_id:
                    sub_item = RecipeSubstituteItem(
                        substitute_id=substitute.id,
                        item_row_id=item_row_id,
                    )
                    self.session.add(sub_item)

            count += 1

        print(f"  {count} groupes de substitution importés")
        return count

    def import_benches(self) -> int:
        """Importe les établis et leurs upgrades."""
        print("\nImport des établis...")

        # Les établis sont des items dans ItemTable_Deployables_CraftingBenches
        # et ont des upgrades dans DT_BenchUpgrades
        filepath = DATATABLES_DIR / "DT_BenchUpgrades.json"
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        # D'abord, créer les établis de base depuis les items
        bench_items = self.session.query(Item).filter(
            Item.category == ItemCategory.CRAFTING_BENCH
        ).all()

        bench_count = 0
        for item in bench_items:
            bench = Bench(
                row_id=item.row_id,
                item_row_id=item.row_id,
                name=item.name,
                description=item.description,
                tier=1,
            )
            self.session.add(bench)
            bench_count += 1

        self.session.flush()

        # Ensuite, créer les upgrades
        upgrade_count = 0
        for row_id, row_data in rows.items():
            bench_row_id = self.parse_data_table_ref(self.find_property(row_data, "Bench"))

            # Trouver l'établi correspondant
            bench = self.session.query(Bench).filter(Bench.row_id == bench_row_id).first()

            upgrade = BenchUpgrade(
                row_id=row_id,
                bench_id=bench.id if bench else None,
                upgrade_from_row_id=self.parse_data_table_ref(self.find_property(row_data, "UpgradeFrom")),
                name=self.get_translation("DT_BenchUpgrades", row_id, "UpgradeName"),
                description=self.get_translation("DT_BenchUpgrades", row_id, "UpgradeDescription"),
                tier=self.find_property(row_data, "Tier") or 1,
                recipe_row_id=self.parse_data_table_ref(self.find_property(row_data, "UpgradeRecipe")),
            )
            self.session.add(upgrade)
            upgrade_count += 1

        print(f"  {bench_count} établis importés")
        print(f"  {upgrade_count} upgrades d'établis importés")
        return bench_count + upgrade_count

    def import_item_upgrades(self) -> int:
        """Importe les améliorations d'items (ex: Tournevis -> Chignole)."""
        print("\nImport des améliorations d'items...")
        filepath = DATATABLES_DIR / "DT_ItemUpgrades.json"
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        upgrade_count = 0
        ingredient_count = 0

        for source_item_row_id, row_data in rows.items():
            upgrades_list = row_data.get("Upgrades", [])

            for upgrade_idx, upgrade_data in enumerate(upgrades_list):
                # Item résultant
                output_ref = upgrade_data.get("OutputItem")
                output_item_row_id = self.parse_data_table_ref(output_ref)

                if not output_item_row_id:
                    continue

                # Créer l'upgrade
                upgrade = ItemUpgrade(
                    source_item_row_id=source_item_row_id,
                    output_item_row_id=output_item_row_id,
                    position=upgrade_idx,
                )
                self.session.add(upgrade)
                self.session.flush()

                # Ingrédients requis
                required_items = upgrade_data.get("RequiredItems", [])
                for ing_idx, ingredient in enumerate(required_items):
                    item_ref = ingredient.get("Item")
                    item_row_id = self.parse_data_table_ref(item_ref)
                    quantity = ingredient.get("Count", 1)

                    if item_row_id:
                        ing = ItemUpgradeIngredient(
                            upgrade_id=upgrade.id,
                            item_row_id=item_row_id,
                            quantity=quantity,
                            position=ing_idx,
                        )
                        self.session.add(ing)
                        ingredient_count += 1

                upgrade_count += 1

        print(f"  {upgrade_count} améliorations importées")
        print(f"  {ingredient_count} ingrédients d'amélioration importés")
        return upgrade_count

    def _parse_compendium_category(self, tags: list[str]) -> CompendiumCategory:
        """Détermine la catégorie du Compendium à partir des tags."""
        for tag in tags:
            if "Entity" in tag:
                return CompendiumCategory.ENTITY
            elif "IS" in tag:
                return CompendiumCategory.IS
            elif "People" in tag:
                return CompendiumCategory.PEOPLE
            elif "Location" in tag:
                return CompendiumCategory.LOCATION
            elif "Theories" in tag:
                return CompendiumCategory.THEORIES
        return CompendiumCategory.IS  # Default

    def _parse_unlock_type(self, unlock_str: str) -> CompendiumUnlockType:
        """Parse le type de déblocage."""
        if "Email" in unlock_str:
            return CompendiumUnlockType.EMAIL
        elif "NarrativeNPC" in unlock_str:
            return CompendiumUnlockType.NARRATIVE_NPC
        return CompendiumUnlockType.EXPLORATION

    def import_compendium(self) -> int:
        """Importe les entrées du Compendium."""
        print("\nImport du Compendium...")

        filepath = DATATABLES_DIR / "DT_Compendium.json"
        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        entry_count = 0
        section_count = 0
        recipe_unlock_count = 0

        for row_id, row_data in rows.items():
            # Récupérer les infos de base
            title_data = row_data.get("Title", {})
            title = title_data.get("SourceString") or title_data.get("LocalizedString")

            subtitle_data = row_data.get("Subtitle", {})
            subtitle = subtitle_data.get("SourceString") or subtitle_data.get("LocalizedString")

            # Traductions FR si disponibles
            title_fr = self.get_translation("DT_Compendium", row_id, "Title")
            subtitle_fr = self.get_translation("DT_Compendium", row_id, "Subtitle")
            if title_fr:
                title = title_fr
            if subtitle_fr:
                subtitle = subtitle_fr

            # Catégorie
            tags = row_data.get("Tags", [])
            category = self._parse_compendium_category(tags)

            # Lien NPC (optionnel)
            npc_row = row_data.get("NPCRow", {})
            npc_row_id = npc_row.get("RowName")
            if npc_row_id == "None":
                npc_row_id = None

            # Image principale (première section)
            sections = row_data.get("Sections", [])
            image_path = None
            if sections:
                first_image = sections[0].get("OptionalSectionImage", {})
                image_path = self.parse_icon_path(first_image)

            # Kill requirement
            has_kill = row_data.get("bHasKillRequirementSection", False)
            kill_count = 0
            kill_text = None
            kill_image = None
            if has_kill:
                kill_section = row_data.get("KillRequirementSection", {})
                kill_count = kill_section.get("RequiredCount", 0)
                kill_text_data = kill_section.get("SectionText", {})
                kill_text = kill_text_data.get("SourceString") or kill_text_data.get("LocalizedString")
                # Traduction FR
                kill_text_fr = self.get_translation("DT_Compendium", row_id, "KillRequirementSection_SectionText")
                if kill_text_fr:
                    kill_text = kill_text_fr
                kill_image_data = kill_section.get("OptionalSectionImage", {})
                kill_image = self.parse_icon_path(kill_image_data)

            # Créer l'entrée
            entry = CompendiumEntry(
                row_id=row_id,
                title=title,
                subtitle=subtitle,
                category=category,
                image_path=image_path,
                npc_row_id=npc_row_id,
                has_kill_requirement=has_kill,
                kill_required_count=kill_count,
                kill_section_text=kill_text,
                kill_section_image_path=kill_image,
            )
            self.session.add(entry)
            self.session.flush()  # Pour obtenir l'ID

            # Importer les sections
            for idx, section_data in enumerate(sections):
                unlock_type_str = section_data.get("UnlockRequirement", "")
                unlock_type = self._parse_unlock_type(unlock_type_str)

                text_data = section_data.get("SectionText", {})
                text = text_data.get("SourceString") or text_data.get("LocalizedString")
                # Traduction FR
                text_fr = self.get_translation("DT_Compendium", row_id, f"Sections_Index{idx}_SectionText")
                if text_fr:
                    text = text_fr

                image_data = section_data.get("OptionalSectionImage", {})
                section_image = self.parse_icon_path(image_data)

                section = CompendiumSection(
                    entry_id=entry.id,
                    position=idx,
                    unlock_type=unlock_type,
                    text=text or "",
                    image_path=section_image,
                )
                self.session.add(section)
                section_count += 1

                # Recettes à débloquer de la section
                recipes_to_unlock = section_data.get("RecipesToUnlock", [])
                for recipe_ref in recipes_to_unlock:
                    recipe_row_id = self.parse_data_table_ref(recipe_ref)
                    if recipe_row_id:
                        recipe_unlock = CompendiumRecipeUnlock(
                            entry_id=entry.id,
                            recipe_row_id=recipe_row_id,
                            from_kill_section=False,
                        )
                        self.session.add(recipe_unlock)
                        recipe_unlock_count += 1

            # Recettes à débloquer du kill requirement
            if has_kill:
                kill_section = row_data.get("KillRequirementSection", {})
                kill_recipes = kill_section.get("RecipesToUnlock", [])
                for recipe_ref in kill_recipes:
                    recipe_row_id = self.parse_data_table_ref(recipe_ref)
                    if recipe_row_id:
                        recipe_unlock = CompendiumRecipeUnlock(
                            entry_id=entry.id,
                            recipe_row_id=recipe_row_id,
                            from_kill_section=True,
                        )
                        self.session.add(recipe_unlock)
                        recipe_unlock_count += 1

            entry_count += 1

        print(f"  {entry_count} entrées importées")
        print(f"  {section_count} sections importées")
        print(f"  {recipe_unlock_count} recettes à débloquer importées")
        return entry_count

    def _parse_dialogue_line_type(self, type_key: str) -> DialogueLineType:
        """Parse le type de ligne de dialogue depuis la clé JSON."""
        mapping = {
            "BeckoningLines": DialogueLineType.BECKONING,
            "IdleLines": DialogueLineType.IDLE,
            "InitalContactMessages": DialogueLineType.INITIAL_CONTACT,  # Typo originale du jeu
            "ReturnMessages": DialogueLineType.RETURN,
            "VendorInteraction_Positive": DialogueLineType.VENDOR_POSITIVE,
            "VendorInteraction_Negative": DialogueLineType.VENDOR_NEGATIVE,
        }
        return mapping.get(type_key, DialogueLineType.BECKONING)

    def _parse_dialogue_unlock_type(self, type_str: str) -> DialogueUnlockType:
        """Parse le type de déblocage."""
        if "Recipe" in type_str or "DT_Recipes" in type_str:
            return DialogueUnlockType.RECIPE
        elif "Journal" in type_str or "DT_JournalEntries" in type_str:
            return DialogueUnlockType.JOURNAL
        elif "Compendium" in type_str or "DT_Compendium" in type_str:
            return DialogueUnlockType.COMPENDIUM
        else:
            return DialogueUnlockType.WORLD_FLAG

    def _extract_audio_asset_name(self, asset_path: str | None) -> str | None:
        """Extrait le nom de l'asset audio depuis le chemin complet."""
        if not asset_path:
            return None
        # Format: /Game/Audio/NarrativeNPCs/Warren/warren_beckon_01_Dialogue.warren_beckon_01_Dialogue
        parts = asset_path.split("/")
        if parts:
            return parts[-1].split(".")[0]
        return None

    def _get_journal_title(self, row_id: str) -> str | None:
        """Récupère le titre traduit d'une entrée de journal."""
        journal_entries = self.translations_fr.get("DT_JournalEntries", {})
        return journal_entries.get(f"{row_id}_Title")

    def _get_compendium_title(self, row_id: str) -> str | None:
        """Récupère le titre traduit d'une entrée de compendium."""
        compendium = self.translations_fr.get("DT_Compendium", {})
        return compendium.get(f"{row_id}_Title")

    def import_dialogues(self) -> int:
        """Importe les conversations des NPCs narratifs."""
        print("\nImport des dialogues...")

        filepath = DATATABLES_DIR / "DT_NPC_Conversations.json"
        if not filepath.exists():
            print("  [SKIP] Fichier DT_NPC_Conversations.json non trouvé")
            return 0

        data = self.load_json_file(filepath)
        rows = self.extract_rows(data)

        conversation_count = 0
        line_count = 0
        line_with_text_count = 0
        unlock_count = 0

        line_types = [
            "BeckoningLines",
            "IdleLines",
            "InitalContactMessages",  # Typo originale du jeu
            "ReturnMessages",
            "VendorInteraction_Positive",
            "VendorInteraction_Negative",
        ]

        for row_id, row_data in rows.items():
            # Nom du NPC
            npc_name_data = row_data.get("NPCName", {})
            npc_name = npc_name_data.get("LocalizedString") or npc_name_data.get("SourceString")

            # Traduction FR si disponible
            npc_name_fr = self.get_translation("DT_NPC_Conversations", row_id, "NPCName")
            if npc_name_fr:
                npc_name = npc_name_fr

            # Flag de completion
            world_flag = row_data.get("WorldFlagToComplete", {})
            world_flag_name = world_flag.get("RowName")
            if world_flag_name == "None":
                world_flag_name = None

            # Créer la conversation
            conversation = NpcConversation(
                row_id=row_id,
                npc_name=npc_name,
                npc_row_id=None,  # Sera lié manuellement si nécessaire
                world_flag_to_complete=world_flag_name,
            )
            self.session.add(conversation)
            self.session.flush()

            # Importer les lignes de dialogue par type
            for line_type_key in line_types:
                lines = row_data.get(line_type_key, [])
                line_type = self._parse_dialogue_line_type(line_type_key)

                for idx, line_data in enumerate(lines):
                    # Extraire le chemin audio
                    audio_data = line_data.get("DialogToSpeak", {})
                    audio_path = audio_data.get("AssetPathName")
                    audio_asset_name = self._extract_audio_asset_name(audio_path)

                    # Montage delay
                    montage_delay = line_data.get("MontageDelay", 0.0)

                    # Récupérer le texte depuis le mapping
                    dialogue_text = None
                    if audio_asset_name:
                        dialogue_text = self.dialogue_mapping.get(audio_asset_name)
                        # Essayer aussi avec _Dialogue suffix
                        if not dialogue_text:
                            dialogue_text = self.dialogue_mapping.get(f"{audio_asset_name}_Dialogue")

                    # Créer la ligne
                    dialogue_line = DialogueLine(
                        conversation_id=conversation.id,
                        line_type=line_type,
                        position=idx,
                        audio_asset_name=audio_asset_name,
                        text=dialogue_text,
                        montage_delay=montage_delay,
                    )
                    self.session.add(dialogue_line)
                    self.session.flush()
                    line_count += 1
                    if dialogue_text:
                        line_with_text_count += 1

                    # Déblocages (recettes)
                    recipes_to_unlock = line_data.get("RecipesToUnlock", [])
                    for recipe_ref in recipes_to_unlock:
                        recipe_row_id = self.parse_data_table_ref(recipe_ref)
                        if recipe_row_id:
                            # Chercher le nom de la recette
                            recipe = self.session.query(Recipe).filter(Recipe.row_id == recipe_row_id).first()
                            recipe_name = recipe.name if recipe else None
                            unlock = DialogueUnlock(
                                dialogue_line_id=dialogue_line.id,
                                unlock_type=DialogueUnlockType.RECIPE,
                                unlock_row_id=recipe_row_id,
                                unlock_name=recipe_name,
                            )
                            self.session.add(unlock)
                            unlock_count += 1

                    # Déblocages (journal)
                    journal_entries = line_data.get("JournalEntriesToAdd", [])
                    for journal_ref in journal_entries:
                        journal_row_id = self.parse_data_table_ref(journal_ref)
                        if journal_row_id:
                            # Chercher le titre traduit du journal
                            journal_title = self._get_journal_title(journal_row_id)
                            unlock = DialogueUnlock(
                                dialogue_line_id=dialogue_line.id,
                                unlock_type=DialogueUnlockType.JOURNAL,
                                unlock_row_id=journal_row_id,
                                unlock_name=journal_title,
                            )
                            self.session.add(unlock)
                            unlock_count += 1

                    # Déblocages (compendium)
                    compendium_entries = line_data.get("CompendiumEntriesToUnlock", [])
                    for compendium_ref in compendium_entries:
                        compendium_row_id = self.parse_data_table_ref(compendium_ref)
                        if compendium_row_id:
                            # Chercher le titre traduit du compendium
                            compendium_title = self._get_compendium_title(compendium_row_id)
                            unlock = DialogueUnlock(
                                dialogue_line_id=dialogue_line.id,
                                unlock_type=DialogueUnlockType.COMPENDIUM,
                                unlock_row_id=compendium_row_id,
                                unlock_name=compendium_title,
                            )
                            self.session.add(unlock)
                            unlock_count += 1

                    # Déblocages (world flags) - pas de nom traduit
                    world_flags = line_data.get("WorldFlagsToTrigger", [])
                    for flag_ref in world_flags:
                        flag_row_id = self.parse_data_table_ref(flag_ref)
                        if flag_row_id:
                            unlock = DialogueUnlock(
                                dialogue_line_id=dialogue_line.id,
                                unlock_type=DialogueUnlockType.WORLD_FLAG,
                                unlock_row_id=flag_row_id,
                                unlock_name=None,  # World flags n'ont pas de nom traduit
                            )
                            self.session.add(unlock)
                            unlock_count += 1

            conversation_count += 1

        print(f"  {conversation_count} conversations importées")
        print(f"  {line_count} lignes de dialogue importées ({line_with_text_count} avec texte)")
        print(f"  {unlock_count} déblocages importés")
        return conversation_count

    def run(self, reset: bool = False) -> None:
        """Exécute l'import complet."""
        print("=" * 60)
        print("IMPORT DES DONNÉES ABIOTIC FACTOR")
        print("=" * 60)

        if reset:
            print("\n[RESET] Suppression des données existantes...")
            # Supprimer dans l'ordre inverse des dépendances
            self.session.query(ItemUpgradeIngredient).delete()
            self.session.query(ItemUpgrade).delete()
            self.session.query(RecipeSubstituteItem).delete()
            self.session.query(RecipeSubstitute).delete()
            self.session.query(RecipeIngredient).delete()
            self.session.query(Recipe).delete()
            self.session.query(SalvageDrop).delete()
            self.session.query(Salvage).delete()
            self.session.query(BenchUpgrade).delete()
            self.session.query(Bench).delete()
            self.session.query(Weapon).delete()
            self.session.query(Equipment).delete()
            self.session.query(Consumable).delete()
            self.session.query(Deployable).delete()
            self.session.query(Item).delete()
            self.session.query(NpcLootTable).delete()
            self.session.query(NPC).delete()
            self.session.query(Plant).delete()
            self.session.query(Projectile).delete()
            self.session.query(Buff).delete()
            self.session.query(CompendiumRecipeUnlock).delete()
            self.session.query(CompendiumSection).delete()
            self.session.query(CompendiumEntry).delete()
            self.session.query(DialogueUnlock).delete()
            self.session.query(DialogueLine).delete()
            self.session.query(NpcConversation).delete()
            self.session.commit()
            print("  Données supprimées")

        # Charger les traductions
        self.load_translations()

        # Import des données
        self.import_all_items()
        self.import_recipe_substitutes()
        self.import_benches()
        self.import_recipes()
        self.import_salvage()
        self.import_item_upgrades()
        self.import_npcs()
        self.import_plants()
        self.import_projectiles()
        self.import_buffs()
        self.import_compendium()
        self.import_dialogues()

        # Commit final
        self.session.commit()

        print("\n" + "=" * 60)
        print("IMPORT TERMINÉ")
        print("=" * 60)


def main():
    """Point d'entrée principal."""
    reset = "--reset" in sys.argv

    # Créer les tables si elles n'existent pas
    Base.metadata.create_all(bind=engine)

    # Créer une session
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with SessionLocal() as session:
        importer = DataImporter(session)
        importer.run(reset=reset)


if __name__ == "__main__":
    main()
