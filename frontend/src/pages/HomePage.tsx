import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchItems } from "@/services/api";
import type { ItemSearchResult } from "@/types";
import { Badge } from "@/components/ui/badge";

const categoryLabels: Record<string, string> = {
  weapon: "Arme",
  equipment: "Équipement",
  consumable: "Consommable",
  deployable: "Déployable",
  deployable_small: "Petit déployable",
  crafting_bench: "Établi",
  pickup: "Ramassable",
  plant: "Plante",
  pet: "Familier",
};

function SearchResult({ item }: { item: ItemSearchResult }) {
  const iconUrl = item.icon_path ? `/icons/${item.icon_path}` : null;

  return (
    <Link
      to={`/item/${item.row_id}`}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors"
    >
      <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={item.name_fr || item.row_id}
            className="w-10 h-10 object-contain"
          />
        ) : (
          <span className="text-xl text-muted-foreground">?</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {item.name_fr || item.row_id}
          </span>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {categoryLabels[item.category] || item.category}
          </Badge>
        </div>
        {item.description_fr && (
          <p className="text-sm text-muted-foreground truncate">
            {item.description_fr}
          </p>
        )}
      </div>
    </Link>
  );
}

export function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await searchItems(query.trim());
        setResults(response.results);
        setHasSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const showResults = hasSearched || results.length > 0;

  return (
    <div className="flex flex-col items-center px-4">
      {/* Header avec titre - se réduit quand on a des résultats */}
      <div
        className={`transition-all duration-300 ${
          showResults ? "pt-8 pb-6" : "pt-20 pb-10"
        }`}
      >
        <h1
          className={`font-bold text-center transition-all duration-300 ${
            showResults ? "text-2xl" : "text-4xl"
          }`}
        >
          Abiotic Crafting Notes
        </h1>
      </div>

      {/* Champ de recherche */}
      <div className="w-full max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un item..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
            autoFocus
          />
        </div>
      </div>

      {/* Résultats */}
      <div className="w-full max-w-xl mt-6">
        {loading && query.trim() && (
          <div className="text-center py-4 text-muted-foreground">
            Recherche...
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun résultat pour "{query}"
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((item) => (
              <SearchResult key={item.row_id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
