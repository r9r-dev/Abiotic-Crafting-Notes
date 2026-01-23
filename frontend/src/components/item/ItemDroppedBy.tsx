import { Link } from "react-router-dom";
import type { DroppedByNPC } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ItemDroppedByProps {
  droppedBy: DroppedByNPC[];
}

const damageTypeLabels: Record<string, string> = {
  blunt: "Mort par arme contondante",
  slash: "Mort par arme tranchante",
  pierce: "Mort par arme perçante",
  fire: "Mort par le feu",
  explosion: "Mort par explosion",
};

function getLootTypeLabel(lootType: string, salvageRowId: string): string {
  if (lootType === "gib") {
    return "Découpe du cadavre";
  }

  if (lootType === "death") {
    for (const [damageType, label] of Object.entries(damageTypeLabels)) {
      if (salvageRowId.includes(`_${damageType}`)) {
        return label;
      }
    }
    return "Mort";
  }

  return lootType;
}

export function ItemDroppedBy({ droppedBy }: ItemDroppedByProps) {
  if (droppedBy.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {droppedBy.map((drop, idx) => {
        const quantityText =
          drop.quantity_min === drop.quantity_max
            ? `x${drop.quantity_min}`
            : `x${drop.quantity_min}-${drop.quantity_max}`;

        const chancePercent = Math.round(drop.drop_chance * 100);
        const lootLabel = getLootTypeLabel(drop.loot_type, drop.salvage_row_id);

        return (
          <Card key={`${drop.npc_row_id}-${drop.salvage_row_id}-${idx}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Link
                  to={`/npc/${drop.npc_row_id}`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <CardTitle className="text-base">
                    {drop.npc_name || drop.npc_row_id}
                  </CardTitle>
                </Link>
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {quantityText}
                  </Badge>
                  {chancePercent < 100 && (
                    <Badge variant="secondary" className="text-xs">
                      {chancePercent}%
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground">
                {lootLabel}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
