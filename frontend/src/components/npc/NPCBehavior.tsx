import type { NPC } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NPCBehaviorProps {
  npc: NPC;
}

export function NPCBehavior({ npc }: NPCBehaviorProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comportement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Agressivite */}
          <div>
            <span className="text-sm text-muted-foreground">Temperament</span>
            <div className="flex gap-2 mt-1">
              {npc.is_hostile && (
                <Badge variant="destructive">Hostile</Badge>
              )}
              {npc.is_passive && (
                <Badge variant="outline">Passif</Badge>
              )}
              {!npc.is_hostile && !npc.is_passive && (
                <Badge variant="secondary">Neutre</Badge>
              )}
            </div>
          </div>

          {/* Portee d'aggro */}
          {npc.aggro_range > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Portee de detection</span>
              <p className="font-medium">{npc.aggro_range.toFixed(1)} m</p>
            </div>
          )}

          {/* Spawn weight */}
          {npc.spawn_weight !== 1 && (
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
