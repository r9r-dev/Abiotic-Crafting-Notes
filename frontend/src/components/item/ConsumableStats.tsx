import type { Consumable } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "lucide-react";

interface ConsumableStatsProps {
  consumable: Consumable;
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

function formatValue(val: number): { value: string; highlight: "positive" | "negative" | "neutral" } {
  if (val > 0) return { value: `+${val.toFixed(1)}`, highlight: "positive" };
  if (val < 0) return { value: val.toFixed(1), highlight: "negative" };
  return { value: "0", highlight: "neutral" };
}

function formatBuffName(buff: { row_id: string; name: string | null }): string {
  // Utilise le nom si disponible, sinon formatte le row_id
  if (buff.name) return buff.name;
  return buff.row_id
    .replace(/^Buff_/, "")
    .replace(/^Debuff_/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}

export function ConsumableStats({ consumable }: ConsumableStatsProps) {
  const hasNeeds =
    consumable.hunger_fill !== 0 ||
    consumable.thirst_fill !== 0 ||
    consumable.fatigue_fill !== 0 ||
    consumable.continence_fill !== 0 ||
    consumable.sanity_fill !== 0;

  const hasHealth =
    consumable.health_change !== 0 ||
    consumable.armor_change !== 0 ||
    consumable.temperature_change !== 0 ||
    consumable.radiation_change !== 0;

  const hasCooking =
    consumable.can_be_cooked || consumable.is_cookware;

  const hasDecay =
    consumable.can_item_decay;

  const hasLiquid = consumable.max_liquid > 0;

  const hasBuffs = consumable.buffs_to_add.length > 0 || consumable.buffs_to_remove.length > 0;

  // Parse consumable_tag (peut etre "None" ou un tag valide)
  const consumableTag = consumable.consumable_tag && consumable.consumable_tag !== "None"
    ? consumable.consumable_tag
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Temps de consommation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Consommation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatRow
            label="Temps"
            value={consumable.time_to_consume.toFixed(1)}
            unit="s"
          />
          {consumable.starting_portions > 1 && (
            <StatRow label="Portions" value={consumable.starting_portions} />
          )}
          {consumableTag && (
            <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="outline" className="text-xs">
                {consumableTag.replace(/^Item\./, "").replace(/\./g, " / ")}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Besoins */}
      {hasNeeds && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Besoins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {consumable.hunger_fill !== 0 && (
              <StatRow
                label="Faim"
                {...formatValue(consumable.hunger_fill)}
              />
            )}
            {consumable.thirst_fill !== 0 && (
              <StatRow
                label="Soif"
                {...formatValue(consumable.thirst_fill)}
              />
            )}
            {consumable.fatigue_fill !== 0 && (
              <StatRow
                label="Fatigue"
                {...formatValue(consumable.fatigue_fill)}
              />
            )}
            {consumable.continence_fill !== 0 && (
              <StatRow
                label="Continence"
                {...formatValue(consumable.continence_fill)}
              />
            )}
            {consumable.sanity_fill !== 0 && (
              <StatRow
                label="Santé mentale"
                {...formatValue(consumable.sanity_fill)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Santé */}
      {hasHealth && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Effets sur la santé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {consumable.health_change !== 0 && (
              <StatRow
                label="Santé"
                {...formatValue(consumable.health_change)}
              />
            )}
            {consumable.armor_change !== 0 && (
              <StatRow
                label="Armure"
                {...formatValue(consumable.armor_change)}
              />
            )}
            {consumable.temperature_change !== 0 && (
              <StatRow
                label="Température"
                {...formatValue(consumable.temperature_change)}
              />
            )}
            {consumable.radiation_change !== 0 && (
              <StatRow
                label="Radiation"
                value={consumable.radiation_change.toFixed(1)}
                highlight={consumable.radiation_change > 0 ? "negative" : "positive"}
              />
            )}
            {consumable.radioactivity > 0 && (
              <StatRow
                label="Radioactivité"
                value={consumable.radioactivity.toFixed(1)}
                highlight="negative"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Buffs */}
      {hasBuffs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Effets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {consumable.buffs_to_add.map((buff) => (
              <div key={buff.row_id} className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{formatBuffName(buff)}</span>
              </div>
            ))}
            {consumable.buffs_to_remove.map((buff) => (
              <div key={buff.row_id} className="flex items-center gap-2">
                <Minus className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm">{formatBuffName(buff)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cuisson */}
      {hasCooking && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Cuisson
              {consumable.is_cookware && <Badge variant="secondary">Ustensile</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {consumable.can_be_cooked && (
              <>
                <StatRow
                  label="Temps cuisson"
                  value={consumable.time_to_cook_baseline.toFixed(1)}
                  unit="s"
                />
                <StatRow
                  label="Temps avant brûlé"
                  value={consumable.time_to_burn_baseline.toFixed(1)}
                  unit="s"
                />
                {consumable.requires_baking && (
                  <StatRow label="Nécessite four" value="Oui" />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pourrissement */}
      {hasDecay && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pourrissement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {consumable.item_decay_temperature && (
              <StatRow
                label="Température"
                value={consumable.item_decay_temperature}
              />
            )}
            {consumable.decay_to_item_row_id && (
              <StatRow label="Devient" value={consumable.decay_to_item_row_id} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Liquides */}
      {hasLiquid && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Liquides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <StatRow label="Capacité max" value={consumable.max_liquid} unit="ml" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
