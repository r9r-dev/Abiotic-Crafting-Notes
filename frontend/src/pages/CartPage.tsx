import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ResourceCalculation } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { getResources, createOrder } from "@/services/api";
import { getDisplayName, getIconUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingCart, Trash2, Package, Send, Plus, Minus, X } from "lucide-react";

export function CartPage() {
  const navigate = useNavigate();
  const { items, addItem, removeItem, setItemQuantity, clearCart } = useCart();
  const [totalResources, setTotalResources] = useState<ResourceCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  // Calculate resources when cart changes
  useEffect(() => {
    const calculateResources = async () => {
      if (items.size === 0) {
        setTotalResources([]);
        return;
      }

      setLoading(true);
      try {
        const allResources = new Map<string, ResourceCalculation>();

        for (const { recipe, quantity } of items.values()) {
          const resources = await getResources(recipe.id, quantity);
          for (const res of resources) {
            const existing = allResources.get(res.item_id);
            if (existing) {
              existing.total_quantity += res.total_quantity;
            } else {
              allResources.set(res.item_id, { ...res });
            }
          }
        }

        setTotalResources(
          Array.from(allResources.values()).sort(
            (a, b) => b.total_quantity - a.total_quantity
          )
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    calculateResources();
  }, [items]);

  const handleSubmitOrder = async () => {
    const orderItems = Array.from(items.entries())
      .filter(([, item]) => item.quantity > 0)
      .map(([itemId, item]) => ({ item_id: itemId, quantity: item.quantity }));

    if (orderItems.length === 0) return;

    setSubmitting(true);
    try {
      await createOrder({ items: orderItems, notes: notes || undefined });
      clearCart();
      navigate("/");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuantityInput = (recipeId: string, value: string) => {
    const quantity = parseInt(value, 10);
    if (!isNaN(quantity) && quantity >= 0) {
      setItemQuantity(recipeId, quantity);
    }
  };

  const totalCount = Array.from(items.values()).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      {/* Cart items panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <ShoppingCart className="h-6 w-6" />
            Panier
            {totalCount > 0 && (
              <span className="text-muted-foreground">({totalCount})</span>
            )}
          </h1>
          {items.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart}>
              <Trash2 className="mr-2 h-4 w-4" />
              Vider
            </Button>
          )}
        </div>

        {items.size === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <ShoppingCart className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Votre panier est vide</p>
              <p className="mt-2 text-sm">
                Ajoutez des items depuis la page Recettes
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/recipes")}
              >
                Voir les recettes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {Array.from(items.values()).map(({ recipe, quantity }) => {
              const iconUrl = getIconUrl(recipe.icon_local, recipe.icon_url);
              const displayName = getDisplayName(recipe.name_fr, recipe.name);
              return (
                <Card key={recipe.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    {iconUrl && (
                      <img
                        src={iconUrl}
                        alt={displayName}
                        className="h-10 w-10 flex-shrink-0 object-contain"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {recipe.category}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => removeItem(recipe.id)}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) =>
                          handleQuantityInput(recipe.id, e.target.value)
                        }
                        className="h-8 w-16 text-center"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => addItem(recipe)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setItemQuantity(recipe.id, 0)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary panel */}
      <div className="space-y-4">
        {/* Resources needed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Ressources nécessaires
              {loading && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (calcul...)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.size === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Ajoutez des items au panier
              </p>
            ) : totalResources.length === 0 && !loading ? (
              <p className="text-center text-sm text-muted-foreground">
                Aucune ressource de base requise
              </p>
            ) : (
              <div className="space-y-2">
                {totalResources.map((res) => (
                  <div
                    key={res.item_id}
                    className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
                  >
                    <span>{getDisplayName(res.item_name_fr, res.item_name)}</span>
                    <span className="font-mono text-primary">
                      x{res.total_quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order form */}
        {items.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4" />
                Valider la commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Notes (optionnel)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instructions spéciales..."
                />
              </div>

              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm font-medium">Récapitulatif</p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>{items.size} type(s) d'item</p>
                  <p>{totalCount} item(s) au total</p>
                </div>
              </div>

              <Button
                onClick={handleSubmitOrder}
                disabled={submitting || loading}
                className="w-full"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Envoi en cours..." : "Envoyer la commande"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
