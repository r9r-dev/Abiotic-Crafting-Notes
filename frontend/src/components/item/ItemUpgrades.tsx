import { Link } from "react-router-dom";
import type { ItemUpgrade } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useItemLink } from "@/hooks/useItemLink";

interface ItemUpgradesProps {
  upgrades: ItemUpgrade[];
}

export function ItemUpgrades({ upgrades }: ItemUpgradesProps) {
  const { getItemLink } = useItemLink();

  if (upgrades.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {upgrades.map((upgrade) => {
        const outputIconUrl = upgrade.output_item?.icon_path
          ? `/icons/${upgrade.output_item.icon_path}`
          : null;

        return (
          <Card key={upgrade.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm">Améliorer en</span>
                <Link
                  to={getItemLink(upgrade.output_item_row_id)}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {outputIconUrl ? (
                    <img
                      src={outputIconUrl}
                      alt={upgrade.output_item?.name || upgrade.output_item_row_id}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
                      ?
                    </div>
                  )}
                  <CardTitle className="text-base">
                    {upgrade.output_item?.name || upgrade.output_item_row_id}
                  </CardTitle>
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-2">
                {upgrade.ingredients.map((ing, idx) => {
                  const iconUrl = ing.item?.icon_path
                    ? `/icons/${ing.item.icon_path}`
                    : null;

                  return (
                    <Link
                      key={`${ing.item_row_id}-${idx}`}
                      to={getItemLink(ing.item_row_id)}
                      className="flex items-center gap-2 bg-muted/50 hover:bg-muted rounded-md px-2 py-1.5 transition-colors"
                    >
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={ing.item?.name || ing.item_row_id}
                          className="w-6 h-6 object-contain"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
                          ?
                        </div>
                      )}
                      <span className="text-sm">
                        {ing.item?.name || ing.item_row_id}
                      </span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        x{ing.quantity}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
