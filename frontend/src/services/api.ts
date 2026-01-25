import type {
  User,
  Item,
  ItemSearchResponse,
  ItemListResponse,
  NPC,
  UnifiedSearchResponse,
  NPCListResponse,
  CompendiumEntry,
  CompendiumListResponse,
  CompendiumSearchResponse,
  NpcConversation,
  DialogueListResponse,
  DialogueSearchResponse,
} from "@/types";
import { analytics } from "./analytics";

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
  const startTime = performance.now();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Mesurer la latence API
  const duration = performance.now() - startTime;
  analytics.trackApiLatency(path, duration);

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

// Compendium
export async function getCompendiumEntry(rowId: string): Promise<CompendiumEntry> {
  return request<CompendiumEntry>(`/compendium/${encodeURIComponent(rowId)}`);
}

export async function getCompendiumByNPC(npcRowId: string): Promise<CompendiumEntry | null> {
  return request<CompendiumEntry | null>(`/compendium/by-npc/${encodeURIComponent(npcRowId)}`);
}

export async function searchCompendium(query: string, category?: string): Promise<CompendiumSearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (category) params.set("category", category);
  return request<CompendiumSearchResponse>(`/compendium/search?${params.toString()}`);
}

export interface ListCompendiumParams {
  skip?: number;
  limit?: number;
  category?: string;
}

export async function listCompendium(params: ListCompendiumParams = {}): Promise<CompendiumListResponse> {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.set("skip", params.skip.toString());
  if (params.limit !== undefined) searchParams.set("limit", params.limit.toString());
  if (params.category) searchParams.set("category", params.category);

  const query = searchParams.toString();
  return request<CompendiumListResponse>(`/compendium/list${query ? `?${query}` : ""}`);
}

export async function getCompendiumCategories(): Promise<Record<string, number>> {
  return request<Record<string, number>>("/compendium/categories");
}

// Dialogues
export async function getDialogue(rowId: string): Promise<NpcConversation> {
  return request<NpcConversation>(`/dialogues/${encodeURIComponent(rowId)}`);
}

export async function getDialogueByNPC(npcRowId: string): Promise<NpcConversation | null> {
  return request<NpcConversation | null>(`/dialogues/by-npc/${encodeURIComponent(npcRowId)}`);
}

export async function getDialogueByName(name: string): Promise<NpcConversation[]> {
  return request<NpcConversation[]>(`/dialogues/by-name/${encodeURIComponent(name)}`);
}

export async function searchDialogues(query: string): Promise<DialogueSearchResponse> {
  return request<DialogueSearchResponse>(`/dialogues/search?q=${encodeURIComponent(query)}`);
}

export interface ListDialoguesParams {
  skip?: number;
  limit?: number;
}

export async function listDialogues(params: ListDialoguesParams = {}): Promise<DialogueListResponse> {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.set("skip", params.skip.toString());
  if (params.limit !== undefined) searchParams.set("limit", params.limit.toString());

  const query = searchParams.toString();
  return request<DialogueListResponse>(`/dialogues/list${query ? `?${query}` : ""}`);
}

export { ApiError };
