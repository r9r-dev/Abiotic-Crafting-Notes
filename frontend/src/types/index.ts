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

export interface Ingredient {
  item_id: string;
  item_name: string;
  item_name_fr: string | null;
  quantity: number;
}

export interface RecipeVariant {
  ingredients: Ingredient[];
  station: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  name_fr: string | null;
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

export interface RecipeSearchResult {
  id: string;
  name: string;
  name_fr: string | null;
  icon_url: string | null;
  icon_local: string | null;
  category: string;
  craftable: boolean;
}

export interface DependencyNode {
  item_id: string;
  item_name: string;
  item_name_fr: string | null;
  quantity: number;
  craftable: boolean;
  children: DependencyNode[];
}

export interface ResourceCalculation {
  item_id: string;
  item_name: string;
  item_name_fr: string | null;
  total_quantity: number;
  is_base_resource: boolean;
}
