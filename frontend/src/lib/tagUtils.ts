/**
 * Parse le JSON des gameplay tags en tableau de strings.
 */
export function parseGameplayTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === "string" && t.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Formate un tag pour l'affichage.
 * Transforme "Item.Material.Cloth" en "Cloth"
 */
export function formatTag(tag: string): string {
  const parts = tag.split(".");
  return parts[parts.length - 1];
}

/**
 * Filtre les tags trop generiques (garde ceux avec plus de 2 niveaux).
 */
export function filterGenericTags(tags: string[]): string[] {
  return tags.filter(tag => !tag.startsWith("Item.") || tag.split(".").length > 2);
}
