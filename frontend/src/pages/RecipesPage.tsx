import { useState } from "react";
import type { Recipe, DependencyNode, ResourceCalculation } from "@/types";
import type { RecipeSearchResult } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { getRecipe, getDependencies, getResources } from "@/services/api";
import { getIconUrl, getDisplayName, getCategoryLabel } from "@/lib/utils";
import { RecipeSearch } from "@/components/RecipeSearch";
import { DependencyTree } from "@/components/DependencyTree";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Hammer, Gem, Package } from "lucide-react";

export function RecipesPage() {
  const { items: cartItems, addItem, removeItem } = useCart();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [dependencies, setDependencies] = useState<DependencyNode | null>(null);
  const [resources, setResources] = useState<ResourceCalculation[]>([]);
  const [loading, setLoading] = useState(false);

  const handleItemClick = async (recipe: RecipeSearchResult) => {
    setLoading(true);
    try {
      const [recipeData, deps, res] = await Promise.all([
        getRecipe(recipe.id),
        getDependencies(recipe.id),
        getResources(recipe.id),
      ]);
      setSelectedRecipe(recipeData);
      setDependencies(deps);
      setResources(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCartChange = (recipe: RecipeSearchResult, quantity: number) => {
    const currentQty = cartItems.get(recipe.id)?.quantity || 0;
    if (quantity > currentQty) {
      addItem(recipe);
    } else if (quantity < currentQty) {
      removeItem(recipe.id);
    }
  };

  const cartQuantities = new Map(
    Array.from(cartItems.entries()).map(([id, item]) => [id, item.quantity])
  );

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      {/* Search panel */}
      <div className="space-y-4">
        <h1 className="text-xl font-bold sm:text-2xl">Recherche de recettes</h1>
        <RecipeSearch
          onItemClick={handleItemClick}
          onSelect={handleCartChange}
          selectedItems={cartQuantities}
        />
      </div>

      {/* Detail panel */}
      <div className="space-y-4">
        {loading && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Chargement...
            </CardContent>
          </Card>
        )}

        {!loading && !selectedRecipe && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Sélectionnez une recette pour voir les détails
            </CardContent>
          </Card>
        )}

        {!loading && selectedRecipe && (
          <>
            {/* Recipe info */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  {getIconUrl(selectedRecipe.icon_local, selectedRecipe.icon_url) && (
                    <img
                      src={getIconUrl(selectedRecipe.icon_local, selectedRecipe.icon_url)!}
                      alt={getDisplayName(selectedRecipe.name_fr, selectedRecipe.name)}
                      className="h-16 w-16 object-contain"
                    />
                  )}
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {getDisplayName(selectedRecipe.name_fr, selectedRecipe.name)}
                      {selectedRecipe.wiki_url && (
                        <a
                          href={selectedRecipe.wiki_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {getCategoryLabel(selectedRecipe.category)}
                    </Badge>
                    {selectedRecipe.description_fr && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedRecipe.description_fr}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {selectedRecipe.weight && (
                    <div>
                      <p className="text-muted-foreground">Poids</p>
                      <p>{selectedRecipe.weight}</p>
                    </div>
                  )}
                  {selectedRecipe.stack_size && (
                    <div>
                      <p className="text-muted-foreground">Taille pile</p>
                      <p>{selectedRecipe.stack_size}</p>
                    </div>
                  )}
                  {selectedRecipe.durability && (
                    <div>
                      <p className="text-muted-foreground">Durabilité</p>
                      <p>{selectedRecipe.durability}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Crafting info */}
            {selectedRecipe.variants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Hammer className="h-4 w-4" />
                    Recette de craft
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="recipe">
                    <TabsList>
                      <TabsTrigger value="recipe">Ingrédients</TabsTrigger>
                      <TabsTrigger value="tree">Arbre</TabsTrigger>
                      <TabsTrigger value="total">Total</TabsTrigger>
                    </TabsList>

                    <TabsContent value="recipe" className="space-y-4">
                      {selectedRecipe.variants.map((variant, i) => (
                        <div key={i} className="space-y-2">
                          {variant.station && (
                            <p className="text-xs text-muted-foreground">
                              Station : {variant.station}
                            </p>
                          )}
                          <div className="space-y-2">
                            {variant.ingredients.map((ing, j) => (
                              <div
                                key={j}
                                className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
                              >
                                <span className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  {getDisplayName(ing.item_name_fr, ing.item_name)}
                                </span>
                                <span className="font-mono text-primary">
                                  x{ing.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                          {i < selectedRecipe.variants.length - 1 && (
                            <div className="text-center text-xs text-muted-foreground">
                              - ou -
                            </div>
                          )}
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="tree">
                      {dependencies && <DependencyTree node={dependencies} />}
                    </TabsContent>

                    <TabsContent value="total" className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Ressources de base nécessaires :
                      </p>
                      {resources.map((res) => (
                        <div
                          key={res.item_id}
                          className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <Gem className="h-4 w-4 text-muted-foreground" />
                            {getDisplayName(res.item_name_fr, res.item_name)}
                          </span>
                          <span className="font-mono text-primary">
                            x{res.total_quantity}
                          </span>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
