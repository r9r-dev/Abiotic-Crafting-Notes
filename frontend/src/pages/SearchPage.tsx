import { useState, useEffect, useCallback } from "react";
import type { ItemDetail, ItemSearchResult, DependencyNode, ResourceCalculation } from "@/types";
import { getItem, searchItems, getDependencies, getResources, getItemCategories } from "@/services/api";
import { getIconUrl, getCategoryLabel } from "@/lib/utils";
import { DependencyTree } from "@/components/DependencyTree";
import { Input } from "@/components/ui/input";
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
  Search,
  ChefHat,
  Hammer,
  MapPin,
  Skull,
  ShoppingBag,
  Recycle,
  ArrowUpCircle,
  Fish,
  Flame,
  Globe,
  Package,
  Gem,
} from "lucide-react";

// Icônes pour les types de sources
const sourceIcons: Record<string, React.ElementType> = {
  Baking: ChefHat,
  Burning: Flame,
  Crafting: Hammer,
  Fishing: Fish,
  Killing: Skull,
  Salvaging: Recycle,
  Trading: ShoppingBag,
  Upgrading: ArrowUpCircle,
  World: Globe,
};

// Labels français pour les types de sources
const sourceLabels: Record<string, string> = {
  Baking: "Cuisson",
  Burning: "Combustion",
  Crafting: "Assemblage",
  Fishing: "Pêche",
  Killing: "Combat",
  Salvaging: "Démontage",
  Trading: "Commerce",
  Upgrading: "Amélioration",
  World: "Monde",
};

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);
  const [dependencies, setDependencies] = useState<DependencyNode | null>(null);
  const [resources, setResources] = useState<ResourceCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Charger les catégories
  useEffect(() => {
    getItemCategories().then(setCategories).catch(console.error);
  }, []);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const items = await searchItems(query, category || undefined);
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
      const [itemData, deps, res] = await Promise.all([
        getItem(item.id),
        getDependencies(item.id).catch(() => null),
        getResources(item.id).catch(() => []),
      ]);
      setSelectedItem(itemData);
      setDependencies(deps);
      setResources(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Grouper les sources par type
  const groupedSources = selectedItem?.source_types.reduce((acc, source) => {
    if (!acc[source.type]) {
      acc[source.type] = [];
    }
    acc[source.type].push(source);
    return acc;
  }, {} as Record<string, typeof selectedItem.source_types>) || {};

  const sourceTypes = Object.keys(groupedSources);

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      {/* Panneau de recherche */}
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Search className="h-6 w-6" />
          Recherche d'items
        </h1>

        <div className="flex gap-2">
          <Input
            placeholder="Rechercher un item..."
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
              {query ? "Aucun résultat" : "Entrez un terme de recherche"}
            </p>
          ) : (
            results.map((item) => (
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
                  <div className="flex gap-1">
                    {item.source_types.slice(0, 3).map((type) => {
                      const Icon = sourceIcons[type] || Globe;
                      return (
                        <Icon
                          key={type}
                          className="h-4 w-4 text-muted-foreground"
                          title={sourceLabels[type]}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
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
                      {selectedItem.name}
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
                    {selectedItem.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedItem.description}
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

            {/* Sources par onglets */}
            {sourceTypes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sources d'obtention</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={sourceTypes[0]} className="w-full">
                    <TabsList className="flex flex-wrap h-auto gap-1">
                      {sourceTypes.map((type) => {
                        const Icon = sourceIcons[type] || Globe;
                        return (
                          <TabsTrigger key={type} value={type} className="gap-1">
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{sourceLabels[type]}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {sourceTypes.map((type) => (
                      <TabsContent key={type} value={type} className="mt-4 space-y-2">
                        {groupedSources[type].map((source, i) => (
                          <div
                            key={i}
                            className="rounded-md bg-muted/50 p-3 text-sm"
                          >
                            {source.station && (
                              <p><span className="text-muted-foreground">Station:</span> {source.station}</p>
                            )}
                            {source.item && (
                              <p><span className="text-muted-foreground">Item:</span> {source.item}</p>
                            )}
                            {source.target && (
                              <p><span className="text-muted-foreground">Cible:</span> {source.target}</p>
                            )}
                            {source.npc && (
                              <p><span className="text-muted-foreground">PNJ:</span> {source.npc}</p>
                            )}
                            {source.bait && (
                              <p><span className="text-muted-foreground">Appât:</span> {source.bait}</p>
                            )}
                            {source.location && (
                              <p><span className="text-muted-foreground">Lieu:</span> {source.location}</p>
                            )}
                            {!source.station && !source.item && !source.target && !source.npc && !source.bait && !source.location && (
                              <p className="text-muted-foreground italic">Disponible via {sourceLabels[type]}</p>
                            )}
                          </div>
                        ))}

                        {/* Afficher les recettes si source avec variants */}
                        {["Crafting", "Baking", "Burning"].includes(type) && selectedItem.variants.length > 0 && (
                          <div className="mt-4 space-y-4">
                            <p className="font-medium">Recettes</p>
                            {selectedItem.variants.map((variant, i) => (
                              <div key={i} className="space-y-2">
                                {variant.station && (
                                  <p className="text-xs text-muted-foreground">
                                    Station : {variant.station}
                                  </p>
                                )}
                                <div className="space-y-1">
                                  {variant.ingredients.map((ing, j) => (
                                    <div
                                      key={j}
                                      className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        {ing.item_name}
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
                          </div>
                        )}

                        {/* Afficher les recettes d'amélioration */}
                        {type === "Upgrading" && selectedItem.upgrade_from && selectedItem.upgrade_from.length > 0 && (
                          <div className="mt-4 space-y-4">
                            <p className="font-medium">Obtenu en améliorant</p>
                            {selectedItem.upgrade_from.map((upgrade, i) => (
                              <div key={i} className="space-y-2">
                                <div className="rounded-md bg-primary/10 p-2 text-sm font-medium">
                                  <ArrowUpCircle className="mr-2 inline h-4 w-4" />
                                  {upgrade.source_name}
                                </div>
                                {upgrade.station && (
                                  <p className="text-xs text-muted-foreground">
                                    Station : {upgrade.station}
                                  </p>
                                )}
                                <div className="space-y-1">
                                  {upgrade.ingredients.map((ing, j) => (
                                    <div
                                      key={j}
                                      className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        {ing.item_name}
                                      </span>
                                      <span className="font-mono text-primary">
                                        x{ing.quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {i < (selectedItem.upgrade_from?.length ?? 0) - 1 && (
                                  <div className="text-center text-xs text-muted-foreground">
                                    - ou -
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Localisations */}
            {selectedItem.locations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Localisations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedItem.locations.slice(0, 5).map((loc, i) => (
                    <div key={i} className="rounded-md bg-muted/50 p-2 text-sm">
                      {loc.area}
                    </div>
                  ))}
                  {selectedItem.locations.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      Et {selectedItem.locations.length - 5} autres emplacements...
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Arbre de dépendances et ressources (si craftable) */}
            {selectedItem.variants.length > 0 && (dependencies || resources.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gem className="h-4 w-4" />
                    Calculateur de ressources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="tree">
                    <TabsList>
                      <TabsTrigger value="tree">Arbre</TabsTrigger>
                      <TabsTrigger value="total">Total</TabsTrigger>
                    </TabsList>

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
                            <img
                              src={`/api/icons/${res.item_id}.png`}
                              alt=""
                              className="h-5 w-5 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            {res.item_name}
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
