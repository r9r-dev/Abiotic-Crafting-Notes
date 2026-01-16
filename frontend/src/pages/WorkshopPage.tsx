import { useState, useEffect, useCallback } from "react";
import type { ItemSearchResult, Recipe, DependencyNode, ResourceCalculation } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { getCraftingItems, getRecipe, getDependencies, getResources, getCategories } from "@/services/api";
import { getIconUrl, getCategoryLabel } from "@/lib/utils";
import { DependencyTree } from "@/components/DependencyTree";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExternalLink,
  Hammer,
  Package,
  Gem,
  Plus,
  Minus,
  ShoppingCart,
} from "lucide-react";

export function WorkshopPage() {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<Recipe | null>(null);
  const [dependencies, setDependencies] = useState<DependencyNode | null>(null);
  const [resources, setResources] = useState<ResourceCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Charger les catégories filtrées pour Crafting
  useEffect(() => {
    getCategories("Crafting").then(setCategories).catch(console.error);
  }, []);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const items = await getCraftingItems(query, category || undefined);
        setResults(items);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category]);

  const handleItemClick = useCallback(async (item: ItemSearchResult) => {
    setLoading(true);
    try {
      const [recipeData, deps, res] = await Promise.all([
        getRecipe(item.id),
        getDependencies(item.id).catch(() => null),
        getResources(item.id).catch(() => []),
      ]);
      setSelectedItem(recipeData);
      setDependencies(deps);
      setResources(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddToCart = (item: ItemSearchResult) => {
    // Convertir en RecipeSearchResult pour le panier
    addItem({
      id: item.id,
      name: item.name,
      name_fr: item.name,
      icon_url: item.icon_url,
      icon_local: item.icon_local,
      category: item.category,
      craftable: true,
      source_types: item.source_types,
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    removeItem(itemId);
  };

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      {/* Panneau de recherche */}
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Hammer className="h-6 w-6" />
          Assemblage
        </h1>
        <p className="text-sm text-muted-foreground">
          Items craftables sur les établis
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Rechercher..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Liste des résultats */}
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {searchLoading ? (
            <p className="text-center text-muted-foreground">Recherche...</p>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Aucun résultat
            </p>
          ) : (
            results.map((item) => {
              const qty = getItemQuantity(item.id);
              return (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedItem?.id === item.id ? "border-primary" : ""
                  }`}
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    {getIconUrl(item.icon_local, item.icon_url) && (
                      <img
                        src={getIconUrl(item.icon_local, item.icon_url)!}
                        alt={item.name}
                        className="h-10 w-10 flex-shrink-0 object-contain"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getCategoryLabel(item.category)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {qty > 0 ? (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleRemoveFromCart(item.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-mono">{qty}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleAddToCart(item)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddToCart(item)}
                        >
                          <ShoppingCart className="mr-1 h-4 w-4" />
                          Ajouter
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Panneau de détails */}
      <div className="space-y-4">
        {loading && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Chargement...
            </CardContent>
          </Card>
        )}

        {!loading && !selectedItem && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Sélectionnez un item pour voir les détails
            </CardContent>
          </Card>
        )}

        {!loading && selectedItem && (
          <>
            {/* Info de l'item */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  {getIconUrl(selectedItem.icon_local, selectedItem.icon_url) && (
                    <img
                      src={getIconUrl(selectedItem.icon_local, selectedItem.icon_url)!}
                      alt={selectedItem.name}
                      className="h-16 w-16 object-contain"
                    />
                  )}
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {selectedItem.name_fr || selectedItem.name}
                      {selectedItem.wiki_url && (
                        <a
                          href={selectedItem.wiki_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {getCategoryLabel(selectedItem.category)}
                    </Badge>
                    {selectedItem.description_fr && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedItem.description_fr}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {selectedItem.weight && (
                    <div>
                      <p className="text-muted-foreground">Poids</p>
                      <p>{selectedItem.weight}</p>
                    </div>
                  )}
                  {selectedItem.stack_size && (
                    <div>
                      <p className="text-muted-foreground">Taille pile</p>
                      <p>{selectedItem.stack_size}</p>
                    </div>
                  )}
                  {selectedItem.durability && (
                    <div>
                      <p className="text-muted-foreground">Durabilité</p>
                      <p>{selectedItem.durability}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recette */}
            {selectedItem.variants.length > 0 && (
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
                      {selectedItem.variants.map((variant, i) => (
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
                                  {ing.item_name_fr || ing.item_name}
                                </span>
                                <span className="font-mono text-primary">
                                  x{ing.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                          {i < selectedItem.variants.length - 1 && (
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
                            {res.item_name_fr || res.item_name}
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
