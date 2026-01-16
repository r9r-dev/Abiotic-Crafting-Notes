import { useState, useEffect } from "react";
import type { RecipeSearchResult } from "@/types";
import { searchRecipes, getCategories } from "@/services/api";
import { getIconUrl, getDisplayName, getCategoryLabel } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Minus } from "lucide-react";

interface RecipeSearchProps {
  onSelect?: (recipe: RecipeSearchResult, quantity: number) => void;
  onItemClick?: (recipe: RecipeSearchResult) => void;
  selectedItems?: Map<string, number>;
}

export function RecipeSearch({ onSelect, onItemClick, selectedItems }: RecipeSearchProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [categories, setCategories] = useState<string[]>([]);
  const [results, setResults] = useState<RecipeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      try {
        const data = await searchRecipes(query, category);
        // Trier par ordre alphabétique (nom FR si dispo, sinon EN)
        const sorted = data.sort((a, b) => {
          const nameA = getDisplayName(a.name_fr, a.name);
          const nameB = getDisplayName(b.name_fr, b.name);
          return nameA.localeCompare(nameB, 'fr');
        });
        setResults(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query, category]);

  const handleQuantityChange = (recipe: RecipeSearchResult, delta: number) => {
    if (!onSelect) return;
    const current = selectedItems?.get(recipe.id) || 0;
    const newQty = Math.max(0, current + delta);
    onSelect(recipe, newQty);
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une recette..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <Button
          variant={category === undefined ? "default" : "outline"}
          size="sm"
          className="text-xs sm:text-sm"
          onClick={() => setCategory(undefined)}
        >
          Toutes
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? "default" : "outline"}
            size="sm"
            className="text-xs sm:text-sm"
            onClick={() => setCategory(cat)}
          >
            {getCategoryLabel(cat)}
          </Button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {loading && (
          <p className="text-center text-sm text-muted-foreground">
            Chargement...
          </p>
        )}

        {!loading && results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Aucune recette trouvée
          </p>
        )}

        {results.map((recipe) => {
          const quantity = selectedItems?.get(recipe.id) || 0;
          const iconUrl = getIconUrl(recipe.icon_local, recipe.icon_url);
          const displayName = getDisplayName(recipe.name_fr, recipe.name);
          return (
            <div
              key={recipe.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2 sm:p-3"
            >
              <div
                className={`flex min-w-0 flex-1 items-center gap-2 sm:gap-3 ${
                  onItemClick ? "cursor-pointer rounded-md p-1 -m-1 hover:bg-accent/50" : ""
                }`}
                onClick={() => onItemClick?.(recipe)}
              >
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={displayName}
                    className="h-6 w-6 flex-shrink-0 object-contain sm:h-8 sm:w-8"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium sm:text-sm">{displayName}</p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {getCategoryLabel(recipe.category)}
                    </span>
                  </div>
                </div>
              </div>

              {onSelect && (
                <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => handleQuantityChange(recipe, -1)}
                    disabled={quantity === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-xs sm:w-8 sm:text-sm">{quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => handleQuantityChange(recipe, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
