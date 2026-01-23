import type { NPC } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NPCBehaviorProps {
  npc: NPC;
}

export function NPCBehavior({ npc }: NPCBehaviorProps) {
  const hasAggroRange = npc.aggro_range > 0;
  const hasSpawnWeight = npc.spawn_weight !== 1;

  // Ne pas afficher si aucune info utile (le tempérament est déjà dans le header)
  if (!hasAggroRange && !hasSpawnWeight) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comportement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Portee d'aggro */}
          {hasAggroRange && (
            <div>
              <span className="text-sm text-muted-foreground">Portée de détection</span>
              <p className="font-medium">{npc.aggro_range.toFixed(0)} unités</p>
            </div>
          )}

          {/* Spawn weight */}
          {hasSpawnWeight && (
            <div>
              <span className="text-sm text-muted-foreground">Poids de spawn</span>
              <p className="font-medium">{npc.spawn_weight.toFixed(2)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
