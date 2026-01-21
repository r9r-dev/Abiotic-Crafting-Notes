import type { Equipment, EquipSlot } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EquipmentStatsProps {
  equipment: Equipment;
}

interface StatRowProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: "positive" | "negative" | "neutral";
}

function StatRow({ label, value, unit, highlight = "neutral" }: StatRowProps) {
  const valueClasses = {
    positive: "text-green-500",
    negative: "text-red-500",
    neutral: "",
  };

  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClasses[highlight]}`}>
        {value}
        {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

const slotLabels: Record<EquipSlot, string> = {
  Head: "Tête",
  Torso: "Torse",
  Legs: "Jambes",
  Feet: "Pieds",
  Hands: "Mains",
  Back: "Dos",
  Face: "Visage",
  Accessory: "Accessoire",
};

export function EquipmentStats({ equipment }: EquipmentStatsProps) {
  const hasProtection =
    equipment.armor_bonus > 0 ||
    equipment.heat_resist !== 0 ||
    equipment.cold_resist !== 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Emplacement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Emplacement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {equipment.equip_slot && (
            <StatRow
              label="Slot"
              value={slotLabels[equipment.equip_slot] || equipment.equip_slot}
            />
          )}
          <StatRow
            label="Auto-equip"
            value={equipment.can_auto_equip ? "Oui" : "Non"}
          />
        </CardContent>
      </Card>

      {/* Protection */}
      {hasProtection && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Protection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {equipment.armor_bonus > 0 && (
              <StatRow
                label="Armure"
                value={`+${equipment.armor_bonus}`}
                highlight="positive"
              />
            )}
            {equipment.heat_resist !== 0 && (
              <StatRow
                label="Résistance chaleur"
                value={equipment.heat_resist > 0 ? `+${equipment.heat_resist}` : equipment.heat_resist}
                highlight={equipment.heat_resist > 0 ? "positive" : "negative"}
              />
            )}
            {equipment.cold_resist !== 0 && (
              <StatRow
                label="Résistance froid"
                value={equipment.cold_resist > 0 ? `+${equipment.cold_resist}` : equipment.cold_resist}
                highlight={equipment.cold_resist > 0 ? "positive" : "negative"}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Conteneur (sac a dos) */}
      {equipment.is_container && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Stockage
              <Badge variant="secondary">Conteneur</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <StatRow
              label="Capacité"
              value={equipment.container_capacity}
              unit="slots"
            />
            {equipment.container_weight_reduction > 0 && (
              <StatRow
                label="Réduction poids"
                value={`${(equipment.container_weight_reduction * 100).toFixed(0)}%`}
                highlight="positive"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Set bonus */}
      {equipment.set_bonus_row_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Bonus de set</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {equipment.set_bonus_row_id}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
