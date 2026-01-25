import { Link } from "react-router-dom";
import type { UpgradedFrom } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useItemLink } from "@/hooks/useItemLink";
import { getIconUrl } from "@/lib/icons";

interface ItemUpgradedFromProps {
  upgradedFrom: UpgradedFrom[];
}

export function ItemUpgradedFrom({ upgradedFrom }: ItemUpgradedFromProps) {
  const { getItemLink } = useItemLink();

  if (upgradedFrom.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {upgradedFrom.map((upgrade) => {
        const sourceIconUrl = upgrade.source_item?.icon_path
          ? getIconUrl(upgrade.source_item.icon_path, 32)
          : null;

        return (
          <Card key={upgrade.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm">Depuis</span>
                <Link
                  to={getItemLink(upgrade.source_item_row_id)}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {sourceIconUrl ? (
                    <img
                      src={sourceIconUrl}
                      alt={upgrade.source_item?.name || upgrade.source_item_row_id}
                      className="w-8 h-8 object-contain" loading="lazy" width="32" height="32"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
                      ?
                    </div>
                  )}
                  <CardTitle className="text-base">
                    {upgrade.source_item?.name || upgrade.source_item_row_id}
                  </CardTitle>
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-2">
                {upgrade.ingredients.map((ing, idx) => {
                  const iconUrl = getIconUrl(ing.item?.icon_path, 24);

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
                          className="w-6 h-6 object-contain" loading="lazy" width="24" height="24"
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
