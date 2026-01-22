import type { NPC } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NPCCombatStatsProps {
  npc: NPC;
}

interface StatRowProps {
  label: string;
  value: string | number;
  unit?: string;
}

function StatRow({ label, value, unit }: StatRowProps) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium">
        {value}
        {unit && <span className="text-muted-foreground text-sm ml-1">{unit}</span>}
      </span>
    </div>
  );
}

export function NPCCombatStats({ npc }: NPCCombatStatsProps) {
  const totalHP = npc.hp_zones.head + npc.hp_zones.body + npc.hp_zones.limbs;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Points de vie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Points de vie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <StatRow label="Total" value={totalHP.toFixed(0)} unit="HP" />
          <div className="border-t my-2" />
          <StatRow label="Tête" value={npc.hp_zones.head.toFixed(0)} unit="HP" />
          <StatRow label="Corps" value={npc.hp_zones.body.toFixed(0)} unit="HP" />
          <StatRow label="Membres" value={npc.hp_zones.limbs.toFixed(0)} unit="HP" />
        </CardContent>
      </Card>

      {/* Combat */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Combat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {npc.combat.melee_attack_damage > 0 && (
            <StatRow
              label="Dégâts de mêlée"
              value={npc.combat.melee_attack_damage.toFixed(1)}
            />
          )}
          {npc.combat.ranged_attack_damage > 0 && (
            <StatRow
              label="Dégâts à distance"
              value={npc.combat.ranged_attack_damage.toFixed(1)}
            />
          )}
          {npc.combat.attack_range > 0 && (
            <StatRow
              label="Portée d'attaque"
              value={npc.combat.attack_range.toFixed(1)}
              unit="m"
            />
          )}
        </CardContent>
      </Card>

      {/* Mouvement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mouvement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <StatRow
            label="Vitesse de marche"
            value={npc.movement.default_walk_speed.toFixed(0)}
          />
          <StatRow
            label="Vitesse de course"
            value={npc.movement.default_run_speed.toFixed(0)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
