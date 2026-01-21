import type { Equipment, EquipSlot } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

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
  Suit: "Combinaison",
  Legs: "Jambes",
  Feet: "Pieds",
  Hands: "Mains",
  Back: "Dos",
  Face: "Visage",
  Accessory: "Accessoire",
};

const slotIcons: Record<EquipSlot, string> = {
  Head: "/icons/icon_helmet.png",
  Torso: "/icons/icon_armor.png",
  Suit: "/icons/icon_suit.png",
  Legs: "/icons/icon_pants.png",
  Feet: "/icons/icon_pants.png",
  Hands: "/icons/icon_arm.png",
  Back: "/icons/icon_backpack.png",
  Face: "/icons/icon_headlamp.png",
  Accessory: "/icons/icon_trinket.png",
};

const mitigationTypeLabels: Record<string, string> = {
  DamageType_Sharp: "Tranchant",
  DamageType_Blunt: "Contondant",
  DamageType_Radiation: "Radiation",
  DamageType_Explosive: "Explosif",
  DamageType_Fire: "Feu",
  DamageType_Electric: "Électrique",
  DamageType_Psychic_Holy: "Psychique",
  DamageType_Acid: "Acide",
  DamageType_Laser: "Laser",
};

interface DamageMitigation {
  type: string;
  label: string;
  value: number;
}

function parseMitigations(mitigationStr: string | null): DamageMitigation[] {
  if (!mitigationStr || mitigationStr === "[]") return [];

  try {
    const data = JSON.parse(mitigationStr) as Array<{ Key: string; Value: number }>;
    return data.map((item) => {
      // Extraire le type depuis le chemin complet
      const match = item.Key.match(/DamageType_([A-Za-z_]+)\./);
      const typeKey = match ? `DamageType_${match[1]}` : item.Key;
      return {
        type: typeKey,
        label: mitigationTypeLabels[typeKey] || typeKey,
        value: item.Value,
      };
    });
  } catch {
    return [];
  }
}

export function EquipmentStats({ equipment }: EquipmentStatsProps) {
  const mitigations = parseMitigations(equipment.damage_mitigation_types);

  const hasProtection =
    equipment.armor_bonus > 0 ||
    equipment.heat_resist !== 0 ||
    equipment.cold_resist !== 0 ||
    mitigations.length > 0;

  const hasSlotInfo = equipment.equip_slot;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Emplacement - seulement si slot défini */}
      {hasSlotInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Emplacement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <img
                  src={slotIcons[equipment.equip_slot!]}
                  alt={slotLabels[equipment.equip_slot!]}
                  className="w-8 h-8 object-contain invert dark:invert-0 opacity-70"
                />
              </div>
              <div>
                <div className="font-medium">
                  {slotLabels[equipment.equip_slot!] || equipment.equip_slot}
                </div>
                {equipment.can_auto_equip && (
                  <div className="text-sm text-muted-foreground">Auto-équip</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            {mitigations.map((mit) => (
              <div
                key={mit.type}
                className="flex justify-between py-1.5 border-b border-border/50 last:border-0"
              >
                <span className="text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {mit.label}
                </span>
                <span className="font-medium text-green-500">
                  {mit.value === 0 ? "Immunité" : `-${Math.round(mit.value * 100)}%`}
                </span>
              </div>
            ))}
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
