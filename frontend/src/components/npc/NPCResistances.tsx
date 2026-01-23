import type { NPC } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NPCResistancesProps {
  npc: NPC;
}

const damageTypeLabels: Record<string, string> = {
  Acid: "Acide",
  Blunt: "Contondants",
  "Blunt.DoorBash": "Contondants (portes)",
  Bullet: "Balles",
  "Bullet.Small": "Petites balles",
  "Bullet.ShotgunPellet": "Chevrotine",
  Cold: "Froid",
  Electric: "Électrique",
  Explosive: "Explosifs",
  Fire: "Feu",
  Holy: "Sacré",
  Laser: "Lasers",
  Sharp: "Tranchants",
  XRay: "Rayons X",
};

function formatDamageType(type: string): string {
  return damageTypeLabels[type] || type;
}

export function NPCResistances({ npc }: NPCResistancesProps) {
  const hasResistances = npc.damage_resistances.length > 0;
  const hasWeaknesses = npc.damage_weaknesses.length > 0;

  if (!hasResistances && !hasWeaknesses) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Résistances et faiblesses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Resistances */}
          {hasResistances && (
            <div>
              <span className="text-sm text-muted-foreground mb-2 block">
                Moins affecté par les dégâts 
              </span>
              <div className="flex flex-wrap gap-1">
                {npc.damage_resistances.map((resistance) => (
                  <Badge
                    key={resistance}
                    variant="outline"
                    className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                  >
                    {formatDamageType(resistance)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Faiblesses */}
          {hasWeaknesses && (
            <div>
              <span className="text-sm text-muted-foreground mb-2 block">
                Faible contre les dégats
              </span>
              <div className="flex flex-wrap gap-1">
                {npc.damage_weaknesses.map((weakness) => (
                  <Badge
                    key={weakness}
                    variant="outline"
                    className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                  >
                    {formatDamageType(weakness)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
