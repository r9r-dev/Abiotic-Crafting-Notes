import { useState, useEffect, useCallback } from "react";
import type { Order, RecipeSearchResult } from "@/types";
import {
  getOrders,
  searchRecipes,
  acceptOrder,
  completeOrder,
  cancelOrder,
  createOrder,
} from "@/services/api";
import { OrderCard } from "@/components/OrderCard";
import { RecipeSearch } from "@/components/RecipeSearch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Send } from "lucide-react";

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [recipes, setRecipes] = useState<Map<string, RecipeSearchResult>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(
    new Map()
  );
  const [notes, setNotes] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders();
      setOrders(data);

      // Load recipe names for display
      const allRecipes = await searchRecipes();
      const recipeMap = new Map(allRecipes.map((r) => [r.id, r]));
      setRecipes(recipeMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleAccept = async (orderId: number) => {
    try {
      await acceptOrder(orderId);
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async (orderId: number) => {
    try {
      await completeOrder(orderId);
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (orderId: number) => {
    try {
      await cancelOrder(orderId);
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrder = async () => {
    const items = Array.from(selectedItems.entries())
      .filter(([, qty]) => qty > 0)
      .map(([item_id, quantity]) => ({ item_id, quantity }));

    if (items.length === 0) return;

    try {
      await createOrder({ items, notes: notes || undefined });
      setSelectedItems(new Map());
      setNotes("");
      setShowNewOrder(false);
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectItem = (recipe: RecipeSearchResult, quantity: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (quantity === 0) {
        next.delete(recipe.id);
      } else {
        next.set(recipe.id, quantity);
      }
      return next;
    });
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const activeOrders = orders.filter(
    (o) =>
      o.status === "accepted" ||
      o.status === "in_progress" ||
      o.status === "missing_resources"
  );
  const completedOrders = orders.filter(
    (o) => o.status === "completed" || o.status === "cancelled"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carnet de commandes</h1>
        <Button onClick={() => setShowNewOrder(!showNewOrder)}>
          <Plus className="h-4 w-4" />
          Nouvelle commande
        </Button>
      </div>

      {/* New order form */}
      {showNewOrder && (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle commande</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RecipeSearch
              onSelect={handleSelectItem}
              selectedItems={selectedItems}
            />

            {selectedItems.size > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Items selectionnes:</p>
                  <div className="space-y-1">
                    {Array.from(selectedItems.entries()).map(([id, qty]) => {
                      const recipe = recipes.get(id);
                      return (
                        <div
                          key={id}
                          className="flex justify-between text-sm"
                        >
                          <span>{recipe?.name || id}</span>
                          <span className="text-muted-foreground">x{qty}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Notes (optionnel)
                  </label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instructions speciales..."
                  />
                </div>

                <Button onClick={handleCreateOrder} className="w-full">
                  <Send className="h-4 w-4" />
                  Envoyer la commande
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            En attente ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            En cours ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Terminees ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground">Chargement...</p>
          ) : pendingOrders.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Aucune commande en attente
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  recipes={recipes}
                  onAccept={handleAccept}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeOrders.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Aucune commande en cours
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  recipes={recipes}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Aucune commande terminee
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedOrders.map((order) => (
                <OrderCard key={order.id} order={order} recipes={recipes} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
