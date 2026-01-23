import { Link } from "react-router-dom";
import type { NPCLootTable } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useItemLink } from "@/hooks/useItemLink";

interface NPCLootTablesProps {
  lootTables: NPCLootTable[];
}

const damageTypeLabels: Record<string, string> = {
  blunt: "Mort par arme contondante",
  slash: "Mort par arme tranchante",
  pierce: "Mort par arme perçante",
  fire: "Mort par le feu",
  explosion: "Mort par explosion",
};

function getLootTypeLabel(lootType: string, salvageRowId?: string): string {
  if (lootType === "gib") {
    return "Découpe du cadavre";
  }

  if (lootType === "death" && salvageRowId) {
    // Chercher un suffixe de type de dégât dans le row_id
    for (const [damageType, label] of Object.entries(damageTypeLabels)) {
      if (salvageRowId.includes(`_${damageType}`)) {
        return label;
      }
    }
  }

  // Par défaut pour "death" sans suffixe
  if (lootType === "death") {
    return "Mort";
  }

  return lootType;
}

export function NPCLootTables({ lootTables }: NPCLootTablesProps) {
  const { getItemLink } = useItemLink();

  // Filtrer les loot tables sans salvage
  const validLootTables = lootTables.filter((lt) => lt.salvage);

  if (validLootTables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {validLootTables.map((lootTable, tableIdx) => (
        <Card key={`${lootTable.loot_type}-${tableIdx}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {getLootTypeLabel(lootTable.loot_type, lootTable.salvage?.row_id)}
              </CardTitle>
              {lootTable.salvage?.bench && lootTable.salvage.bench.tier > 1 && (
                <Badge variant="outline" className="text-xs">
                  Tier {lootTable.salvage.bench.tier}
                </Badge>
              )}
            </div>

            {lootTable.salvage && lootTable.salvage.salvage_time > 0 && (
              <div className="text-sm text-muted-foreground">
                Temps: {lootTable.salvage.salvage_time.toFixed(1)}s
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className="grid gap-2">
              {lootTable.salvage?.drops.map((drop, idx) => {
                const iconUrl = drop.item?.icon_path
                  ? `/icons/${drop.item.icon_path}`
                  : null;

                const quantityText =
                  drop.quantity_min === drop.quantity_max
                    ? `x${drop.quantity_min}`
                    : `x${drop.quantity_min}-${drop.quantity_max}`;

                const chancePercent = Math.round(drop.drop_chance * 100);

                return (
                  <Link
                    key={`${drop.item_row_id}-${idx}`}
                    to={getItemLink(drop.item_row_id)}
                    className="flex items-center gap-2 bg-muted/50 hover:bg-muted rounded-md px-2 py-1.5 transition-colors"
                  >
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={drop.item?.name || drop.item_row_id}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
                        ?
                      </div>
                    )}
                    <span className="text-sm">
                      {drop.item?.name || drop.item_row_id}
                    </span>
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
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
