import { useNavigate } from "react-router-dom";
import type { CompendiumEntry } from "@/types";
import { Badge } from "@/components/ui/badge";

interface CompendiumHeaderProps {
  entry: CompendiumEntry;
}

const categoryLabels: Record<string, string> = {
  Entity: "Entité",
  IS: "Item Spécial",
  People: "Personnage",
  Location: "Lieu",
  Theories: "Théorie",
};

const categoryColors: Record<string, string> = {
  Entity: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  IS: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
  People: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  Location: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  Theories: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

export function CompendiumHeader({ entry }: CompendiumHeaderProps) {
  const navigate = useNavigate();
  const imageUrl = entry.image_path ? `/compendium/${entry.image_path}` : null;

  const handleCategoryClick = () => {
    navigate(`/compendium?category=${encodeURIComponent(entry.category)}`);
  };

  const handleNPCClick = () => {
    if (entry.npc_row_id) {
      navigate(`/npc/${encodeURIComponent(entry.npc_row_id)}`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {imageUrl && (
        <div className="flex-shrink-0 w-full md:w-64 lg:w-80 bg-muted rounded-lg overflow-hidden border">
          <img
            src={imageUrl}
            alt={entry.title || entry.row_id}
            className="w-full h-auto object-contain"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold">
          {entry.title || entry.row_id}
        </h1>

        {entry.subtitle && (
          <p className="text-lg text-muted-foreground mt-1">
            {entry.subtitle}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <Badge
            variant="outline"
            className={`cursor-pointer hover:opacity-80 transition-opacity ${categoryColors[entry.category] || ""}`}
            onClick={handleCategoryClick}
          >
            {categoryLabels[entry.category] || entry.category}
          </Badge>

          {entry.npc && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={handleNPCClick}
            >
              Voir le NPC
            </Badge>
          )}

          {entry.has_kill_requirement && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">
              {entry.kill_required_count} éliminations
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
