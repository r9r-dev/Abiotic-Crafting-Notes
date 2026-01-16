import type {
  User,
  Order,
  OrderStatus,
  Recipe,
  RecipeSearchResult,
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

// Recipes
export async function searchRecipes(
  query: string = "",
  category?: string,
  craftableOnly: boolean = true
): Promise<RecipeSearchResult[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (!craftableOnly) params.set("craftable_only", "false");
  return request<RecipeSearchResult[]>(`/recipes?${params}`);
}

export async function getCategories(): Promise<string[]> {
  return request<string[]>("/recipes/categories");
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
