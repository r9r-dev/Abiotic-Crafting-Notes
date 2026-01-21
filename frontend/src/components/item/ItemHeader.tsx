import type { Item, ItemCategory, ReleaseGroup } from "@/types";
import { Badge } from "@/components/ui/badge";

interface ItemHeaderProps {
  item: Item;
}

const categoryLabels: Record<ItemCategory, string> = {
  weapon: "Arme",
  equipment: "Équipement",
  consumable: "Consommable",
  deployable: "Déployable",
  deployable_small: "Petit déployable",
  crafting_bench: "Établi",
  pickup: "Ramassable",
  plant: "Plante",
  pet: "Familier",
};

const releaseGroupLabels: Record<ReleaseGroup, string> = {
  Core: "Base",
  DarkEnergy: "Dark Energy",
  Community: "Communauté",
};

function parseGameplayTags(tagsJson: string | null): string[] {
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

function formatTag(tag: string): string {
  // Transforme "Item.Material.Cloth" en "Cloth"
  // Garde seulement la derniere partie significative
  const parts = tag.split(".");
  return parts[parts.length - 1];
}

export function ItemHeader({ item }: ItemHeaderProps) {
  const iconUrl = item.icon_path ? `/icons/${item.icon_path}` : null;
  const gameplayTags = parseGameplayTags(item.gameplay_tags)
    .filter(tag => !tag.startsWith("Item.") || tag.split(".").length > 2); // Filtre les tags trop generiques

  return (
    <div className="flex gap-6 items-start">
      {/* Icone */}
      <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={item.name || item.row_id}
            className="w-20 h-20 object-contain"
          />
        ) : (
          <span className="text-4xl text-muted-foreground">?</span>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold truncate">
          {item.name || item.row_id}
        </h1>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary">
            {categoryLabels[item.category] || item.category}
          </Badge>
          {item.release_group && item.release_group !== "Core" && (
            <Badge variant="warning">
              {releaseGroupLabels[item.release_group]}
            </Badge>
          )}
          {gameplayTags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {formatTag(tag)}
            </Badge>
          ))}
        </div>

        {/* Description */}
        {item.description && (
          <p className="mt-3 text-muted-foreground">{item.description}</p>
        )}

        {/* Flavor text */}
        {item.flavor_text && (
          <p className="mt-2 text-sm italic text-muted-foreground/70">
            "{item.flavor_text}"
          </p>
        )}
      </div>
    </div>
  );
}
