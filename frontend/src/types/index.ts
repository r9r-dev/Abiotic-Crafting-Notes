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
  name_fr: string | null;
  description_fr: string | null;
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
  | "Legs"
  | "Feet"
  | "Hands"
  | "Back"
  | "Face"
  | "Accessory";

export type DecayTemperature = "None" | "Cold" | "Warm" | "Hot";

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
  burned_item_row_id: string | null;
  time_to_cook_baseline: number;
  time_to_burn_baseline: number;
  requires_baking: boolean;
  starting_portions: number;
  can_item_decay: boolean;
  item_decay_temperature: DecayTemperature | null;
  decay_to_item_row_id: string | null;
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

// Recettes
export interface IngredientItem {
  row_id: string;
  name_fr: string | null;
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
  name_fr: string | null;
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
  name_fr: string | null;
  ingredients: RecipeIngredient[];
  bench: BenchMinimal | null;
}

// Item principal
export interface Item {
  id: number;
  row_id: string;
  category: ItemCategory;
  release_group: ReleaseGroup | null;
  name_fr: string | null;
  description_fr: string | null;
  flavor_text_fr: string | null;
  stack_size: number;
  weight: number;
  max_durability: number;
  can_lose_durability: boolean;
  chance_to_lose_durability: number;
  icon_path: string | null;
  mesh_path: string | null;
  gameplay_tags: string | null;
  repair_item_id: string | null;
  repair_quantity_min: number;
  repair_quantity_max: number;
  salvage_row_id: string | null;
  weapon: Weapon | null;
  equipment: Equipment | null;
  consumable: Consumable | null;
  deployable: Deployable | null;
  recipes: Recipe[];
}
