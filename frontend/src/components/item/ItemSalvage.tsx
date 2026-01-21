import { Link } from "react-router-dom";
import type { Salvage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ItemSalvageProps {
  salvage: Salvage;
}

export function ItemSalvage({ salvage }: ItemSalvageProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {salvage.bench?.name || "Desassemblage"}
          </CardTitle>
          {salvage.bench && salvage.bench.tier > 1 && (
            <Badge variant="outline" className="text-xs">
              Tier {salvage.bench.tier}
            </Badge>
          )}
        </div>

        {salvage.salvage_time > 0 && (
          <div className="text-sm text-muted-foreground">
            Temps: {salvage.salvage_time.toFixed(1)}s
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid gap-2">
          {salvage.drops.map((drop, idx) => {
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
                to={`/item/${drop.item_row_id}`}
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
  );
}
