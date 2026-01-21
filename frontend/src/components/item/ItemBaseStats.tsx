import type { Item } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ItemBaseStatsProps {
  item: Item;
}

interface StatRowProps {
  label: string;
  value: string | number;
  unit?: string;
}

function StatRow({ label, value, unit }: StatRowProps) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {value}
        {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

export function ItemBaseStats({ item }: ItemBaseStatsProps) {
  const hasStats =
    item.weight > 0 ||
    item.stack_size > 1 ||
    item.max_durability > 0 ||
    item.repair_item_id;

  if (!hasStats) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Propriétés</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {item.weight > 0 && (
          <StatRow label="Poids" value={item.weight.toFixed(2)} />
        )}

        {item.stack_size > 1 && (
          <StatRow label="Empilable" value={item.stack_size} unit="max" />
        )}

        {item.max_durability > 0 && (
          <StatRow label="Durabilité" value={Math.round(item.max_durability)} />
        )}

        {item.can_lose_durability && item.chance_to_lose_durability > 0 && (
          <StatRow
            label="Perte durabilité"
            value={`${(item.chance_to_lose_durability * 100).toFixed(0)}%`}
          />
        )}

        {item.repair_item_id && (
          <StatRow
            label="Réparation"
            value={`${item.repair_quantity_min}-${item.repair_quantity_max}`}
            unit="items"
          />
        )}
      </CardContent>
    </Card>
  );
}
