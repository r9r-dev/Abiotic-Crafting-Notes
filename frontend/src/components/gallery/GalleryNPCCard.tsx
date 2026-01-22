import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { NPCListResult } from "@/types";

interface GalleryNPCCardProps {
  npc: NPCListResult;
  onCategoryClick?: (category: string) => void;
}

const categoryLabels: Record<string, string> = {
  alien: "Alien",
  human: "Humain",
  robot: "Robot",
  creature: "Creature",
  mutant: "Mutant",
};

export function GalleryNPCCard({ npc, onCategoryClick }: GalleryNPCCardProps) {
  return (
    <div className="group relative bg-card border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
      <Link
        to={`/npc/${npc.row_id}`}
        className="block p-4"
      >
        {/* Icone et nom */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            <span className="text-2xl text-muted-foreground">
              {npc.is_hostile ? "!" : npc.is_passive ? "~" : "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {npc.name || npc.row_id}
            </h3>
            <div className="flex gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">
                NPC
              </Badge>
              {npc.is_hostile && (
                <Badge variant="destructive" className="text-xs">
                  Hostile
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {npc.description && (
          <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
            {npc.description}
          </p>
        )}
      </Link>

      {/* Categorie cliquable */}
      {npc.category && (
        <div className="px-4 pb-3">
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCategoryClick?.(npc.category!);
            }}
          >
            {categoryLabels[npc.category] || npc.category}
          </Badge>
        </div>
      )}
    </div>
  );
}
