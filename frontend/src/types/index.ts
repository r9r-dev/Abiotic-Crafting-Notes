export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "missing_resources"
  | "completed"
  | "cancelled";

export interface OrderItem {
  id: number;
  item_id: string;
  quantity: number;
}

export interface MissingResource {
  item_id: string;
  item_name: string;
  quantity_needed: number;
}

export interface Order {
  id: number;
  requester_id: string;
  requester_name: string;
  crafter_id: string | null;
  crafter_name: string | null;
  status: OrderStatus;
  notes: string | null;
  missing_resources: MissingResource[] | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

// Types de sources d'obtention
export type SourceType =
  | "Baking"     // Cuisson
  | "Burning"    // Brûlage
  | "Crafting"   // Assemblage
  | "Fishing"    // Pêche
  | "Killing"    // Combat
  | "Salvaging"  // Récupération
  | "Trading"    // Commerce
  | "Upgrading"  // Amélioration
  | "World";     // Monde

export interface ItemSource {
  type: SourceType;
  target: string | null;    // Pour Killing
  npc: string | null;       // Pour Trading
  item: string | null;      // Pour Baking/Salvaging
  station: string | null;   // Station de craft
  location: string | null;
  bait: string | null;      // Pour Fishing
}

export interface ItemLocation {
  area: string;
  details: string | null;
}

export interface Ingredient {
  item_id: string;
  item_name: string;
  item_name_fr: string | null;  // Compat: égal à item_name
  quantity: number;
}

export interface RecipeVariant {
  ingredients: Ingredient[];
  station: string | null;
  result_quantity?: number;
}

export interface SalvageResult {
  item_id: string;
  item_name: string;
  min: number;
  max: number;
}

// Format de recette compatible avec l'ancien frontend
export interface Recipe {
  id: string;
  name: string;
  name_fr: string | null;  // Compat: égal à name
  description_fr: string | null;
  icon_url: string | null;
  icon_local: string | null;
  category: string;
  weight: number | null;
  stack_size: number | null;
  durability: number | null;
  variants: RecipeVariant[];
  repair_material: string | null;
  repair_quantity: number | null;
  wiki_url: string | null;
}

// Source d'amélioration (comment obtenir un item via upgrade)
export interface UpgradeFrom {
  source_id: string;
  source_name: string;
  ingredients: Ingredient[];
  station: string | null;
}

// Détail complet d'un item (nouveau format)
export interface ItemDetail {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  icon_local: string | null;
  wiki_url: string | null;
  category: string;
  weight: number | null;
  stack_size: number | null;
  durability: number | null;
  research_category: string | null;
  repair_item: string | null;
  repair_quantity: number | null;
  source_types: ItemSource[];
  variants: RecipeVariant[];
  locations: ItemLocation[];
  salvage: SalvageResult[];
  gear: Record<string, unknown> | null;
  loss_chance: number | null;
  see_also: string[] | null;
  upgrade_from: UpgradeFrom[] | null;
}

export interface RecipeSearchResult {
  id: string;
  name: string;
  name_fr: string | null;  // Compat: égal à name
  icon_url: string | null;
  icon_local: string | null;
  category: string;
  craftable: boolean;
  source_types?: string[];  // Nouveau: liste des types de sources
}

// Résultat de recherche pour les items (nouveau format)
export interface ItemSearchResult {
  id: string;
  name: string;
  icon_url: string | null;
  icon_local: string | null;
  category: string;
  source_types: string[];
}

export interface DependencyNode {
  item_id: string;
  item_name: string;
  item_name_fr: string | null;  // Compat: égal à item_name
  quantity: number;
  craftable: boolean;
  children: DependencyNode[];
}

export interface ResourceCalculation {
  item_id: string;
  item_name: string;
  item_name_fr: string | null;  // Compat: égal à item_name
  total_quantity: number;
  is_base_resource: boolean;
}
