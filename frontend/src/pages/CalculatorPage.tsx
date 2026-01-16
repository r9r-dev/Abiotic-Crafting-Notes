import { useState } from "react";
import type { RecipeSearchResult, ResourceCalculation } from "@/types";
import { getResources } from "@/services/api";
import { getDisplayName } from "@/lib/utils";
import { RecipeSearch } from "@/components/RecipeSearch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calculator, Trash2, Package } from "lucide-react";

interface SelectedItem {
  recipe: RecipeSearchResult;
  quantity: number;
}

export function CalculatorPage() {
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(
    new Map()
  );
  const [totalResources, setTotalResources] = useState<ResourceCalculation[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  const handleSelect = (recipe: RecipeSearchResult, quantity: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (quantity === 0) {
        next.delete(recipe.id);
      } else {
        next.set(recipe.id, { recipe, quantity });
      }
      return next;
    });
  };

  const handleCalculate = async () => {
    if (selectedItems.size === 0) return;

    setLoading(true);
    try {
      // Aggregate resources from all selected items
      const allResources = new Map<string, ResourceCalculation>();

      for (const { recipe, quantity } of selectedItems.values()) {
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
        Array.from(allResources.values()).sort((a, b) => {
          const nameA = getDisplayName(a.item_name_fr, a.item_name);
          const nameB = getDisplayName(b.item_name_fr, b.item_name);
          return nameA.localeCompare(nameB, 'fr');
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedItems(new Map());
    setTotalResources([]);
  };

  const selectedQuantities = new Map(
    Array.from(selectedItems.entries()).map(([id, item]) => [id, item.quantity])
  );

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      {/* Selection panel */}
      <div className="space-y-4">
        <h1 className="text-xl font-bold sm:text-2xl">Calculateur de ressources</h1>
        <RecipeSearch
          onSelect={handleSelect}
          selectedItems={selectedQuantities}
        />
      </div>

      {/* Result panel */}
      <div className="space-y-4">
        {/* Selected items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4" />
                Items à calculer
              </CardTitle>
              {selectedItems.size > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedItems.size === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Sélectionnez des items à gauche
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {Array.from(selectedItems.values())
                    .sort((a, b) => {
                      const nameA = getDisplayName(a.recipe.name_fr, a.recipe.name);
                      const nameB = getDisplayName(b.recipe.name_fr, b.recipe.name);
                      return nameA.localeCompare(nameB, 'fr');
                    })
                    .map(({ recipe, quantity }) => (
                      <div
                        key={recipe.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{getDisplayName(recipe.name_fr, recipe.name)}</span>
                        <span className="text-muted-foreground">
                          x{quantity}
                        </span>
                      </div>
                    )
                  )}
                </div>

                <Button
                  onClick={handleCalculate}
                  disabled={loading}
                  className="w-full"
                >
                  <Calculator className="h-4 w-4" />
                  {loading ? "Calcul en cours..." : "Calculer les ressources"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {totalResources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Ressources nécessaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {totalResources.map((res) => (
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
                          (e.target as HTMLImageElement).style.display = 'none';
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
