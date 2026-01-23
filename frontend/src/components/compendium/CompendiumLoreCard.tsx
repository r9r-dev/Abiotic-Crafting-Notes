import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CompendiumEntry } from "@/types";
import { getCompendiumByNPC } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CompendiumLoreCardProps {
  npcRowId: string;
}

export function CompendiumLoreCard({ npcRowId }: CompendiumLoreCardProps) {
  const navigate = useNavigate();
  const [entry, setEntry] = useState<CompendiumEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCompendiumByNPC(npcRowId)
      .then(setEntry)
      .catch(() => setEntry(null))
      .finally(() => setLoading(false));
  }, [npcRowId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Compendium</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (!entry || entry.sections.length === 0) {
    return null;
  }

  const firstSection = entry.sections[0];
  const hasMoreContent = entry.sections.length > 1 || entry.has_kill_requirement;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Compendium</CardTitle>
          {entry.title && (
            <Badge variant="outline">{entry.title}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {firstSection.text.split("\n").slice(0, 3).map((paragraph, index) => (
            <p key={index} className={index > 0 ? "mt-2" : ""}>
              {paragraph}
            </p>
          ))}
        </div>

        {(hasMoreContent || firstSection.text.split("\n").length > 3) && (
          <Button
            variant="link"
            className="p-0 h-auto mt-3"
            onClick={() => navigate(`/compendium/${entry.row_id}`)}
          >
            Voir l'entrée complète
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
