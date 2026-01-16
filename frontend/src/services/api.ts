import type {
  User,
  Order,
  OrderStatus,
  Recipe,
  RecipeSearchResult,
  ItemDetail,
  ItemSearchResult,
  DependencyNode,
  ResourceCalculation,
} from "@/types";

const API_BASE = "/api";

class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string = "UNKNOWN") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.detail || response.statusText,
      response.status,
      error.code
    );
  }

  return response.json();
}

// Auth
export async function getCurrentUser(): Promise<User> {
  return request<User>("/auth/me");
}

// Items (nouveau format)
export async function searchItems(
  query: string = "",
  category?: string,
  source?: string,
  limit: number = 100
): Promise<ItemSearchResult[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (source) params.set("source", source);
  if (limit !== 100) params.set("limit", String(limit));
  return request<ItemSearchResult[]>(`/items?${params}`);
}

export async function getItem(itemId: string): Promise<ItemDetail> {
  return request<ItemDetail>(`/items/${itemId}`);
}

export async function getBakingItems(
  query: string = "",
  category?: string
): Promise<ItemSearchResult[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  return request<ItemSearchResult[]>(`/items/baking?${params}`);
}

export async function getCraftingItems(
  query: string = "",
  category?: string
): Promise<ItemSearchResult[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  return request<ItemSearchResult[]>(`/items/crafting?${params}`);
}

export async function getItemCategories(source?: string): Promise<string[]> {
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  return request<string[]>(`/items/categories?${params}`);
}

// Recipes (compatibilité)
export async function searchRecipes(
  query: string = "",
  category?: string,
  craftableOnly: boolean = true,
  source?: string
): Promise<RecipeSearchResult[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (!craftableOnly) params.set("craftable_only", "false");
  if (source) params.set("source", source);
  return request<RecipeSearchResult[]>(`/recipes?${params}`);
}

export async function getCategories(source?: string): Promise<string[]> {
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  return request<string[]>(`/recipes/categories?${params}`);
}

export async function getRecipe(itemId: string): Promise<Recipe> {
  return request<Recipe>(`/recipes/${itemId}`);
}

export async function getDependencies(
  itemId: string,
  quantity: number = 1
): Promise<DependencyNode> {
  return request<DependencyNode>(
    `/recipes/${itemId}/dependencies?quantity=${quantity}`
  );
}

export async function getResources(
  itemId: string,
  quantity: number = 1
): Promise<ResourceCalculation[]> {
  return request<ResourceCalculation[]>(
    `/recipes/${itemId}/resources?quantity=${quantity}`
  );
}

// Orders
export async function getOrders(filters?: {
  status?: OrderStatus;
  mine?: boolean;
  assigned?: boolean;
}): Promise<Order[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.mine) params.set("mine", "true");
  if (filters?.assigned) params.set("assigned", "true");
  return request<Order[]>(`/orders?${params}`);
}

export async function getOrder(orderId: number): Promise<Order> {
  return request<Order>(`/orders/${orderId}`);
}

export async function createOrder(data: {
  items: { item_id: string; quantity: number }[];
  notes?: string;
}): Promise<Order> {
  return request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateOrder(
  orderId: number,
  data: {
    status?: OrderStatus;
    notes?: string;
    missing_resources?: { item_id: string; item_name: string; quantity_needed: number }[];
  }
): Promise<Order> {
  return request<Order>(`/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function acceptOrder(orderId: number): Promise<Order> {
  return request<Order>(`/orders/${orderId}/accept`, { method: "POST" });
}

export async function completeOrder(orderId: number): Promise<Order> {
  return request<Order>(`/orders/${orderId}/complete`, { method: "POST" });
}

export async function cancelOrder(orderId: number): Promise<Order> {
  return request<Order>(`/orders/${orderId}/cancel`, { method: "POST" });
}

export { ApiError };
