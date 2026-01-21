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

export function ItemHeader({ item }: ItemHeaderProps) {
  const iconUrl = item.icon_path ? `/icons/${item.icon_path}` : null;

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
