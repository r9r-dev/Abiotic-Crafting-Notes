import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ResourceCalculation } from "@/types";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { getResources, createOrder } from "@/services/api";
import { getDisplayName, getIconUrl, getCategoryLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ShoppingCart,
  Trash2,
  Package,
  Send,
  Plus,
  Minus,
  X,
  ChefHat,
  Hammer,
} from "lucide-react";

interface CartSectionProps {
  title: string;
  icon: React.ElementType;
  items: CartItem[];
  itemCount: number;
  notes: string;
  onNotesChange: (notes: string) => void;
  onQuantityChange: (recipeId: string, quantity: number) => void;
  onAdd: (recipe: CartItem["recipe"]) => void;
  onRemove: (recipeId: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  submitting: boolean;
  resources: ResourceCalculation[];
  loadingResources: boolean;
}

function CartSection({
  title,
  icon: Icon,
  items,
  itemCount,
  notes,
  onNotesChange,
  onQuantityChange,
  onAdd,
  onRemove,
  onClear,
  onSubmit,
  submitting,
  resources,
  loadingResources,
}: CartSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon className="h-5 w-5" />
          {title}
          <span className="text-muted-foreground">({itemCount})</span>
        </h2>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Trash2 className="mr-2 h-4 w-4" />
          Vider
        </Button>
      </div>

      {/* Liste des items */}
      <div className="space-y-2">
        {items.map(({ recipe, quantity }) => {
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
                    {getCategoryLabel(recipe.category)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onRemove(recipe.id)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) =>
                      onQuantityChange(recipe.id, parseInt(e.target.value, 10) || 0)
                    }
                    className="h-8 w-16 text-center"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onAdd(recipe)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => onQuantityChange(recipe.id, 0)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Formulaire de commande */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Commander {title.toLowerCase()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Notes (optionnel)
            </label>
            <Textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onNotesChange(e.target.value)}
              placeholder="Instructions spéciales..."
              rows={2}
            />
          </div>

          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm font-medium">Récapitulatif</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>{items.length} type(s) d'item</p>
              <p>{itemCount} item(s) au total</p>
            </div>
          </div>

          <Button
            onClick={onSubmit}
            disabled={submitting || loadingResources}
            className="w-full"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Envoi en cours..." : "Envoyer la commande"}
          </Button>
        </CardContent>
      </Card>

      {/* Ressources nécessaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Ressources nécessaires
            {loadingResources && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (calcul...)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resources.length === 0 && !loadingResources ? (
            <p className="text-center text-sm text-muted-foreground">
              Aucune ressource de base requise
            </p>
          ) : (
            <div className="space-y-2">
              {resources.map((res) => (
                <div
                  key={res.item_id}
                  className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <img
                      src={`/api/icons/${res.item_id}.png`}
                      alt=""
                      className="h-5 w-5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {getDisplayName(res.item_name_fr, res.item_name)}
                  </span>
                  <span className="font-mono text-primary">
                    x{res.total_quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CartPage() {
  const navigate = useNavigate();
  const {
    bakingItems,
    craftingItems,
    bakingCount,
    craftingCount,
    totalCount,
    addItem,
    removeItem,
    setItemQuantity,
    clearBaking,
    clearCrafting,
  } = useCart();

  const [bakingNotes, setBakingNotes] = useState("");
  const [craftingNotes, setCraftingNotes] = useState("");
  const [bakingResources, setBakingResources] = useState<ResourceCalculation[]>([]);
  const [craftingResources, setCraftingResources] = useState<ResourceCalculation[]>([]);
  const [loadingBaking, setLoadingBaking] = useState(false);
  const [loadingCrafting, setLoadingCrafting] = useState(false);
  const [submittingBaking, setSubmittingBaking] = useState(false);
  const [submittingCrafting, setSubmittingCrafting] = useState(false);

  // Calculer les ressources pour Baking
  useEffect(() => {
    const calculate = async () => {
      if (bakingItems.length === 0) {
        setBakingResources([]);
        return;
      }

      setLoadingBaking(true);
      try {
        const allResources = new Map<string, ResourceCalculation>();

        for (const { recipe, quantity } of bakingItems) {
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

        setBakingResources(
          Array.from(allResources.values()).sort((a, b) => {
            const nameA = getDisplayName(a.item_name_fr, a.item_name);
            const nameB = getDisplayName(b.item_name_fr, b.item_name);
            return nameA.localeCompare(nameB, "fr");
          })
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingBaking(false);
      }
    };

    calculate();
  }, [bakingItems]);

  // Calculer les ressources pour Crafting
  useEffect(() => {
    const calculate = async () => {
      if (craftingItems.length === 0) {
        setCraftingResources([]);
        return;
      }

      setLoadingCrafting(true);
      try {
        const allResources = new Map<string, ResourceCalculation>();

        for (const { recipe, quantity } of craftingItems) {
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

        setCraftingResources(
          Array.from(allResources.values()).sort((a, b) => {
            const nameA = getDisplayName(a.item_name_fr, a.item_name);
            const nameB = getDisplayName(b.item_name_fr, b.item_name);
            return nameA.localeCompare(nameB, "fr");
          })
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCrafting(false);
      }
    };

    calculate();
  }, [craftingItems]);

  const handleSubmitBaking = async () => {
    const orderItems = bakingItems
      .filter(({ quantity }) => quantity > 0)
      .map(({ recipe, quantity }) => ({ item_id: recipe.id, quantity }));

    if (orderItems.length === 0) return;

    setSubmittingBaking(true);
    try {
      await createOrder({
        items: orderItems,
        notes: bakingNotes ? `[Cuisine] ${bakingNotes}` : "[Cuisine]",
      });
      clearBaking();
      setBakingNotes("");
      navigate("/");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingBaking(false);
    }
  };

  const handleSubmitCrafting = async () => {
    const orderItems = craftingItems
      .filter(({ quantity }) => quantity > 0)
      .map(({ recipe, quantity }) => ({ item_id: recipe.id, quantity }));

    if (orderItems.length === 0) return;

    setSubmittingCrafting(true);
    try {
      await createOrder({
        items: orderItems,
        notes: craftingNotes ? `[Assemblage] ${craftingNotes}` : "[Assemblage]",
      });
      clearCrafting();
      setCraftingNotes("");
      navigate("/");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCrafting(false);
    }
  };

  if (totalCount === 0) {
    return (
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <ShoppingCart className="h-6 w-6" />
          Panier
        </h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Votre panier est vide</p>
            <p className="mt-2 text-sm">
              Ajoutez des items depuis Cuisine ou Assemblage
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate("/kitchen")}>
                <ChefHat className="mr-2 h-4 w-4" />
                Cuisine
              </Button>
              <Button variant="outline" onClick={() => navigate("/workshop")}>
                <Hammer className="mr-2 h-4 w-4" />
                Assemblage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
        <ShoppingCart className="h-6 w-6" />
        Panier
        <span className="text-muted-foreground">({totalCount})</span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section Cuisine */}
        <CartSection
          title="Cuisine"
          icon={ChefHat}
          items={bakingItems}
          itemCount={bakingCount}
          notes={bakingNotes}
          onNotesChange={setBakingNotes}
          onQuantityChange={setItemQuantity}
          onAdd={addItem}
          onRemove={removeItem}
          onClear={clearBaking}
          onSubmit={handleSubmitBaking}
          submitting={submittingBaking}
          resources={bakingResources}
          loadingResources={loadingBaking}
        />

        {/* Section Assemblage */}
        <CartSection
          title="Assemblage"
          icon={Hammer}
          items={craftingItems}
          itemCount={craftingCount}
          notes={craftingNotes}
          onNotesChange={setCraftingNotes}
          onQuantityChange={setItemQuantity}
          onAdd={addItem}
          onRemove={removeItem}
          onClear={clearCrafting}
          onSubmit={handleSubmitCrafting}
          submitting={submittingCrafting}
          resources={craftingResources}
          loadingResources={loadingCrafting}
        />
      </div>
    </div>
  );
}
