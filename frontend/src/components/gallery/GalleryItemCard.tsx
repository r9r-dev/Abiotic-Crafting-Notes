import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { parseGameplayTags, formatTag, filterGenericTags } from "@/lib/tagUtils";
import type { ItemListResult } from "@/types";

interface GalleryItemCardProps {
  item: ItemListResult;
  onTagClick?: (tag: string) => void;
}

const categoryLabels: Record<string, string> = {
  weapon: "Arme",
  equipment: "Equipement",
  consumable: "Consommable",
  deployable: "Deployable",
  deployable_small: "Petit deployable",
  crafting_bench: "Etabli",
  pickup: "Ramassable",
  plant: "Plante",
  pet: "Familier",
};

export function GalleryItemCard({ item, onTagClick }: GalleryItemCardProps) {
  const iconUrl = item.icon_path ? `/icons/${item.icon_path}` : null;
  const tags = filterGenericTags(parseGameplayTags(item.gameplay_tags)).slice(0, 3);

  return (
    <div className="group relative bg-card border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
      <Link
        to={`/item/${item.row_id}`}
        className="block p-4"
      >
        {/* Icone et nom */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={item.name || item.row_id}
                className="w-12 h-12 object-contain"
              />
            ) : (
              <span className="text-2xl text-muted-foreground">?</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {item.name || item.row_id}
            </h3>
            <Badge variant="outline" className="text-xs mt-1">
              {categoryLabels[item.category] || item.category}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}
      </Link>

      {/* Tags cliquables */}
      {tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTagClick?.(tag);
              }}
            >
              {formatTag(tag)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
