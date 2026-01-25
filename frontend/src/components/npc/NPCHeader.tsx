import { useNavigate } from "react-router-dom";
import type { NPC } from "@/types";
import { Badge } from "@/components/ui/badge";
import { getCompendiumIconUrl } from "@/lib/icons";

interface NPCHeaderProps {
  npc: NPC;
}

const categoryLabels: Record<string, string> = {
  alien: "Alien",
  human: "Humain",
  robot: "Robot",
  creature: "Creature",
  mutant: "Mutant",
};

export function NPCHeader({ npc }: NPCHeaderProps) {
  const navigate = useNavigate();
  // lg:w-80 = 320px max
  const iconUrl = getCompendiumIconUrl(npc.icon_path, 320);

  const handleCategoryClick = () => {
    if (npc.category) {
      navigate(`/?view=gallery&type=npc&category=${encodeURIComponent(npc.category)}`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Image grande pour les NPCs */}
      {iconUrl && (
        <div className="flex-shrink-0 w-full md:w-64 lg:w-80 bg-muted rounded-lg overflow-hidden border">
          <img
            src={iconUrl}
            alt={npc.name || npc.row_id}
            className="w-full h-auto object-contain"
            width="320"
            height="320"
            fetchPriority="high"
          />
        </div>
      )}

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold truncate">
          {npc.name || npc.row_id}
        </h1>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary">NPC</Badge>
          {npc.category && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={handleCategoryClick}
            >
              {categoryLabels[npc.category] || npc.category}
            </Badge>
          )}
          {npc.is_hostile && (
            <Badge variant="destructive">Hostile</Badge>
          )}
          {npc.is_passive && (
            <Badge variant="outline">Passif</Badge>
          )}
        </div>

        {/* Description */}
        {npc.description && (
          <p className="mt-3 text-muted-foreground">{npc.description}</p>
        )}
      </div>
    </div>
  );
}
