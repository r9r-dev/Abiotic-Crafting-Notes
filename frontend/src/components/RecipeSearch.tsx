import { useState, useEffect } from "react";
import type { RecipeSearchResult } from "@/types";
import { searchRecipes, getCategories } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus } from "lucide-react";

interface RecipeSearchProps {
  onSelect?: (recipe: RecipeSearchResult, quantity: number) => void;
  selectedItems?: Map<string, number>;
}

export function RecipeSearch({ onSelect, selectedItems }: RecipeSearchProps) {
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
        setResults(data);
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
      <div className="flex flex-wrap gap-2">
        <Button
          variant={category === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => setCategory(undefined)}
        >
          Toutes
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(cat)}
          >
            {cat}
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
            Aucune recette trouvee
          </p>
        )}

        {results.map((recipe) => {
          const quantity = selectedItems?.get(recipe.id) || 0;
          return (
            <div
              key={recipe.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                {recipe.icon_url && (
                  <img
                    src={recipe.icon_url}
                    alt={recipe.name}
                    className="h-8 w-8 object-contain"
                  />
                )}
                <div>
                  <p className="text-sm font-medium">{recipe.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {recipe.category}
                    </span>
                    {recipe.craftable && (
                      <Badge variant="secondary" className="text-xs">
                        Craftable
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {onSelect && (
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => handleQuantityChange(recipe, -1)}
                    disabled={quantity === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
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
