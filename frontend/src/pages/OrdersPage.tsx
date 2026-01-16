import { useState, useEffect, useCallback } from "react";
import type { Order, RecipeSearchResult } from "@/types";
import {
  getOrders,
  searchRecipes,
  acceptOrder,
  completeOrder,
  cancelOrder,
} from "@/services/api";
import { OrderCard } from "@/components/OrderCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [recipes, setRecipes] = useState<Map<string, RecipeSearchResult>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

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
      <h1 className="text-xl font-bold sm:text-2xl">Carnet de commandes</h1>

      {/* Orders tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">En attente</span>
            <span className="sm:hidden">Attente</span>
            <span className="ml-1">({pendingOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">En cours</span>
            <span className="sm:hidden">Cours</span>
            <span className="ml-1">({activeOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Terminées</span>
            <span className="sm:hidden">Fini</span>
            <span className="ml-1">({completedOrders.length})</span>
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
              Aucune commande terminée
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
