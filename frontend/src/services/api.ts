import type { User, Item, ItemSearchResponse, ItemListResponse, NPC, UnifiedSearchResponse, NPCListResponse } from "@/types";

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

// Items
export async function getItem(rowId: string): Promise<Item> {
  return request<Item>(`/items/${encodeURIComponent(rowId)}`);
}

export async function searchItems(query: string): Promise<ItemSearchResponse> {
  return request<ItemSearchResponse>(`/items/search?q=${encodeURIComponent(query)}`);
}

// Gallery
export interface ListItemsParams {
  skip?: number;
  limit?: number;
  category?: string;
  tag?: string;
}

export async function listItems(params: ListItemsParams = {}): Promise<ItemListResponse> {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.set("skip", params.skip.toString());
  if (params.limit !== undefined) searchParams.set("limit", params.limit.toString());
  if (params.category) searchParams.set("category", params.category);
  if (params.tag) searchParams.set("tag", params.tag);

  const query = searchParams.toString();
  return request<ItemListResponse>(`/items/list${query ? `?${query}` : ""}`);
}

// NPCs
export async function getNPC(rowId: string): Promise<NPC> {
  return request<NPC>(`/npcs/${encodeURIComponent(rowId)}`);
}

export interface ListNPCsParams {
  skip?: number;
  limit?: number;
  category?: string;
}

export async function listNPCs(params: ListNPCsParams = {}): Promise<NPCListResponse> {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.set("skip", params.skip.toString());
  if (params.limit !== undefined) searchParams.set("limit", params.limit.toString());
  if (params.category) searchParams.set("category", params.category);

  const query = searchParams.toString();
  return request<NPCListResponse>(`/npcs/list${query ? `?${query}` : ""}`);
}

// Recherche unifiee
export async function unifiedSearch(query: string): Promise<UnifiedSearchResponse> {
  return request<UnifiedSearchResponse>(`/search?q=${encodeURIComponent(query)}`);
}

export { ApiError };
