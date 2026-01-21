export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

// Recherche
export interface ItemSearchResult {
  row_id: string;
  category: string;
  name: string | null;
  description: string | null;
  icon_path: string | null;
}

export interface ItemSearchResponse {
  query: string;
  count: number;
  results: ItemSearchResult[];
}

// Enums
export type ItemCategory =
  | "weapon"
  | "equipment"
  | "consumable"
  | "deployable"
  | "deployable_small"
  | "crafting_bench"
  | "pickup"
  | "plant"
  | "pet";

export type ReleaseGroup = "Core" | "DarkEnergy" | "Community";

export type EquipSlot =
  | "Head"
  | "Torso"
  | "Suit"
  | "Legs"
  | "Feet"
  | "Hands"
  | "Back"
  | "Face"
  | "Accessory";

export type DecayTemperature = "None" | "Cold" | "Warm" | "Hot";

// Item minimal pour les liens
export interface LinkedItem {
  row_id: string;
  name: string | null;
  icon_path: string | null;
}

// Sous-types
export interface Weapon {
  is_melee: boolean;
  damage_per_hit: number;
  damage_type: string | null;
  time_between_shots: number;
  burst_fire_count: number;
  bullet_spread_min: number;
  bullet_spread_max: number;
  max_aim_correction: number;
  recoil_amount: number;
  maximum_hitscan_range: number;
  magazine_size: number;
  require_ammo: boolean;
  ammo_type_row_id: string | null;
  ammo_item: LinkedItem | null;
  projectile_row_id: string | null;
  pellet_count: number;
  tracer_per_shots: number;
  loudness_primary: number;
  loudness_secondary: number;
  secondary_attack_type: string | null;
  underwater_state: string | null;
}

export interface Equipment {
  equip_slot: EquipSlot | null;
  can_auto_equip: boolean;
  armor_bonus: number;
  heat_resist: number;
  cold_resist: number;
  damage_mitigation_types: string | null;
  is_container: boolean;
  container_capacity: number;
  container_weight_reduction: number;
  set_bonus_row_id: string | null;
}

export interface Consumable {
  time_to_consume: number;
  hunger_fill: number;
  thirst_fill: number;
  fatigue_fill: number;
  continence_fill: number;
  sanity_fill: number;
  health_change: number;
  armor_change: number;
  temperature_change: number;
  radiation_change: number;
  radioactivity: number;
  buffs_to_add: string | null;
  buffs_to_remove: string | null;
  consumable_tag: string | null;
  consumed_action: string | null;
  can_be_cooked: boolean;
  is_cookware: boolean;
  cooked_item_row_id: string | null;
  cooked_item: LinkedItem | null;
  burned_item_row_id: string | null;
  burned_item: LinkedItem | null;
  time_to_cook_baseline: number;
  time_to_burn_baseline: number;
  requires_baking: boolean;
  starting_portions: number;
  can_item_decay: boolean;
  item_decay_temperature: DecayTemperature | null;
  decay_to_item_row_id: string | null;
  decay_to_item: LinkedItem | null;
  max_liquid: number;
  allowed_liquids: string | null;
}

export interface Deployable {
  deployed_class_path: string | null;
  placement_orientations: string | null;
  hologram_mesh_path: string | null;
  hologram_scale: number;
  is_small: boolean;
  is_crafting_bench: boolean;
  texture_variant_row_id: string | null;
}

// Salvage (desassemblage)
export interface SalvageDrop {
  item_row_id: string;
  quantity_min: number;
  quantity_max: number;
  drop_chance: number;
  position: number;
  item: LinkedItem | null;
}

export interface Salvage {
  row_id: string;
  salvage_time: number;
  bench_row_id: string | null;
  bench: BenchMinimal | null;
  drops: SalvageDrop[];
}

// Item Upgrades (ameliorations)
export interface ItemUpgradeIngredient {
  item_row_id: string;
  quantity: number;
  position: number;
  item: LinkedItem | null;
}

export interface ItemUpgrade {
  id: number;
  source_item_row_id: string;
  output_item_row_id: string;
  output_item: LinkedItem | null;
  position: number;
  ingredients: ItemUpgradeIngredient[];
}

// Relations inversees
export interface UsedInRecipe {
  row_id: string;
  output_item_row_id: string;
  output_item: LinkedItem | null;
  quantity: number;
  bench: BenchMinimal | null;
}

export interface UsedInUpgrade {
  id: number;
  source_item_row_id: string;
  source_item: LinkedItem | null;
  output_item_row_id: string;
  output_item: LinkedItem | null;
  quantity: number;
}

export interface UpgradedFrom {
  id: number;
  source_item_row_id: string;
  source_item: LinkedItem | null;
  ingredients: ItemUpgradeIngredient[];
}

// Recettes
export interface IngredientItem {
  row_id: string;
  name: string | null;
  icon_path: string | null;
}

export interface RecipeIngredient {
  item_row_id: string;
  quantity: number;
  is_substitute_group: boolean;
  substitute_group_row_id: string | null;
  position: number;
  item: IngredientItem | null;
}

export interface BenchMinimal {
  row_id: string;
  name: string | null;
  item_row_id: string | null;
  tier: number;
}

export interface Recipe {
  row_id: string;
  output_item_row_id: string;
  count_to_create: number;
  bench_row_id: string | null;
  unlock_condition: string | null;
  is_default_unlocked: boolean;
  category: string | null;
  subcategory: string | null;
  craft_time: number;
  recipe_tags: string[] | null;
  name: string | null;
  ingredients: RecipeIngredient[];
  bench: BenchMinimal | null;
}

// Item principal
export interface Item {
  id: number;
  row_id: string;
  category: ItemCategory;
  release_group: ReleaseGroup | null;
  name: string | null;
  description: string | null;
  flavor_text: string | null;
  stack_size: number;
  weight: number;
  max_durability: number;
  can_lose_durability: boolean;
  chance_to_lose_durability: number;
  icon_path: string | null;
  mesh_path: string | null;
  gameplay_tags: string | null;
  repair_item_id: string | null;
  repair_item: LinkedItem | null;
  repair_quantity_min: number;
  repair_quantity_max: number;
  salvage_row_id: string | null;
  weapon: Weapon | null;
  equipment: Equipment | null;
  consumable: Consumable | null;
  deployable: Deployable | null;
  recipes: Recipe[];
  salvage: Salvage | null;
  upgrades: ItemUpgrade[];
  used_in_recipes: UsedInRecipe[];
  used_in_upgrades: UsedInUpgrade[];
  upgraded_from: UpgradedFrom[];
}
