import type { Order, RecipeSearchResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getStatusLabel } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, AlertTriangle, Clock } from "lucide-react";

interface OrderCardProps {
  order: Order;
  recipes: Map<string, RecipeSearchResult>;
  onAccept?: (orderId: number) => void;
  onComplete?: (orderId: number) => void;
  onCancel?: (orderId: number) => void;
  onMissingResources?: (orderId: number) => void;
}

function getStatusVariant(status: string) {
  switch (status) {
    case "pending":
      return "warning";
    case "completed":
      return "success";
    case "cancelled":
    case "missing_resources":
      return "destructive";
    default:
      return "secondary";
  }
}

export function OrderCard({
  order,
  recipes,
  onAccept,
  onComplete,
  onCancel,
  onMissingResources,
}: OrderCardProps) {
  const { user } = useAuth();
  const isRequester = user?.id === order.requester_id;
  const isCrafter = user?.id === order.crafter_id;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Commande #{order.id}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {order.requester_name} - {formatDate(order.created_at)}
            </p>
          </div>
          <Badge variant={getStatusVariant(order.status)}>
            {getStatusLabel(order.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Items */}
          <div className="space-y-1">
            {order.items.map((item) => {
              const recipe = recipes.get(item.item_id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{recipe?.name || item.item_id}</span>
                  <span className="text-muted-foreground">x{item.quantity}</span>
                </div>
              );
            })}
          </div>

          {/* Missing resources */}
          {order.missing_resources && order.missing_resources.length > 0 && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs">
              <p className="mb-1 flex items-center gap-1 font-medium text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Ressources manquantes
              </p>
              {order.missing_resources.map((res) => (
                <div key={res.item_id} className="flex justify-between">
                  <span>{res.item_name}</span>
                  <span>x{res.quantity_needed}</span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <p className="text-xs text-muted-foreground italic">
              {order.notes}
            </p>
          )}

          {/* Crafter info */}
          {order.crafter_name && (
            <p className="text-xs text-muted-foreground">
              Crafter: {order.crafter_name}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {order.status === "pending" && !isRequester && onAccept && (
              <Button size="sm" onClick={() => onAccept(order.id)}>
                <Check className="h-3 w-3" />
                Accepter
              </Button>
            )}

            {(order.status === "accepted" || order.status === "in_progress") &&
              isCrafter && (
                <>
                  {onComplete && (
                    <Button size="sm" onClick={() => onComplete(order.id)}>
                      <Check className="h-3 w-3" />
                      Terminer
                    </Button>
                  )}
                  {onMissingResources && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMissingResources(order.id)}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Ressources manquantes
                    </Button>
                  )}
                </>
              )}

            {order.status === "pending" && isRequester && onCancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onCancel(order.id)}
              >
                <X className="h-3 w-3" />
                Annuler
              </Button>
            )}

            {order.status === "missing_resources" && (
              <div className="flex items-center gap-1 text-xs text-orange-500">
                <Clock className="h-3 w-3" />
                En attente de ressources
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
