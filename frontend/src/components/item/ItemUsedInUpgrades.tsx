import { Link } from "react-router-dom";
import type { UsedInUpgrade } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ItemUsedInUpgradesProps {
  usedInUpgrades: UsedInUpgrade[];
}

export function ItemUsedInUpgrades({ usedInUpgrades }: ItemUsedInUpgradesProps) {
  if (usedInUpgrades.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {usedInUpgrades.map((upgrade) => {
        const sourceIconUrl = upgrade.source_item?.icon_path
          ? `/icons/${upgrade.source_item.icon_path}`
          : null;
        const outputIconUrl = upgrade.output_item?.icon_path
          ? `/icons/${upgrade.output_item.icon_path}`
          : null;

        return (
          <Card key={upgrade.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Source item */}
                <Link
                  to={`/item/${upgrade.source_item_row_id}`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {sourceIconUrl ? (
                    <img
                      src={sourceIconUrl}
                      alt={upgrade.source_item?.name || upgrade.source_item_row_id}
                      className="w-6 h-6 object-contain"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
                      ?
                    </div>
                  )}
                  <span className="text-sm">
                    {upgrade.source_item?.name || upgrade.source_item_row_id}
                  </span>
                </Link>

                <span className="text-muted-foreground">→</span>

                {/* Output item */}
                <Link
                  to={`/item/${upgrade.output_item_row_id}`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {outputIconUrl ? (
                    <img
                      src={outputIconUrl}
                      alt={upgrade.output_item?.name || upgrade.output_item_row_id}
                      className="w-6 h-6 object-contain"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
                      ?
                    </div>
                  )}
                  <CardTitle className="text-sm">
                    {upgrade.output_item?.name || upgrade.output_item_row_id}
                  </CardTitle>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground">
                Quantité requise :{" "}
                <Badge variant="outline" className="text-xs">
                  x{upgrade.quantity}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
