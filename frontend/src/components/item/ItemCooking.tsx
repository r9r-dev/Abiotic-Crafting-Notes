import { Link } from "react-router-dom";
import type { Consumable } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ItemCookingProps {
  consumable: Consumable;
}

interface LinkedItemDisplayProps {
  rowId: string;
  name: string | null;
  iconPath: string | null;
  label: string;
  time?: number;
}

function LinkedItemDisplay({
  rowId,
  name,
  iconPath,
  label,
  time,
}: LinkedItemDisplayProps) {
  const iconUrl = iconPath ? `/icons/${iconPath}` : null;

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm text-muted-foreground w-24">{label}</span>
      <Link
        to={`/item/${rowId}`}
        className="flex items-center gap-2 bg-muted/50 hover:bg-muted rounded-md px-2 py-1.5 transition-colors flex-1"
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={name || rowId}
            className="w-6 h-6 object-contain"
          />
        ) : (
          <div className="w-6 h-6 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
            ?
          </div>
        )}
        <span className="text-sm">{name || rowId}</span>
      </Link>
      {time !== undefined && time > 0 && (
        <Badge variant="outline" className="text-xs">
          {time.toFixed(1)}s
        </Badge>
      )}
    </div>
  );
}

export function ItemCooking({ consumable }: ItemCookingProps) {
  const hasCooking =
    consumable.can_be_cooked &&
    (consumable.cooked_item || consumable.burned_item);
  const hasDecay = consumable.can_item_decay && consumable.decay_to_item;

  if (!hasCooking && !hasDecay) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Transformation</CardTitle>
      </CardHeader>

      <CardContent className="space-y-1">
        {consumable.can_be_cooked && consumable.cooked_item && (
          <LinkedItemDisplay
            rowId={consumable.cooked_item.row_id}
            name={consumable.cooked_item.name}
            iconPath={consumable.cooked_item.icon_path}
            label="Cuit"
            time={consumable.time_to_cook_baseline}
          />
        )}

        {consumable.can_be_cooked && consumable.burned_item && (
          <LinkedItemDisplay
            rowId={consumable.burned_item.row_id}
            name={consumable.burned_item.name}
            iconPath={consumable.burned_item.icon_path}
            label="Brule"
            time={consumable.time_to_burn_baseline}
          />
        )}

        {consumable.can_item_decay && consumable.decay_to_item && (
          <LinkedItemDisplay
            rowId={consumable.decay_to_item.row_id}
            name={consumable.decay_to_item.name}
            iconPath={consumable.decay_to_item.icon_path}
            label="Pourri"
          />
        )}

        {consumable.requires_baking && (
          <div className="pt-2">
            <Badge variant="secondary">Necessite un four</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
