import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchItems } from "@/services/api";
import type { ItemSearchResult } from "@/types";

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

interface SearchResultItemProps {
  item: ItemSearchResult;
  isActive: boolean;
  query: string;
  onClick?: () => void;
}

function SearchResultItem({ item, isActive, query, onClick }: SearchResultItemProps) {
  const iconUrl = item.icon_path ? `/icons/${item.icon_path}` : null;

  return (
    <Link
      to={`/item/${item.row_id}?q=${encodeURIComponent(query)}`}
      onClick={onClick}
      className={`flex items-center gap-3 p-2 rounded-lg transition-colors border ${
        isActive
          ? "bg-primary/10 border-primary/20"
          : "border-transparent hover:bg-muted"
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={item.name || item.row_id}
            className="w-8 h-8 object-contain"
          />
        ) : (
          <span className="text-sm text-muted-foreground">?</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {item.name || item.row_id}
        </div>
        <Badge variant="outline" className="text-xs mt-0.5">
          {categoryLabels[item.category] || item.category}
        </Badge>
      </div>
    </Link>
  );
}

interface SearchPanelProps {
  initialQuery?: string;
  onResultClick?: () => void;
  currentItemId?: string;
}

export function SearchPanel({ initialQuery = "", onResultClick, currentItemId }: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedQuery = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Recherche avec debounce - ne relance pas si même query
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      lastSearchedQuery.current = "";
      return;
    }

    // Ne pas relancer si c'est la même recherche
    if (trimmedQuery === lastSearchedQuery.current) {
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await searchItems(trimmedQuery);
        setResults(response.results);
        lastSearchedQuery.current = trimmedQuery;
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

  return (
    <div className="flex flex-col h-full">
      {/* Champ de recherche */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Rechercher..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Résultats */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && query.trim() && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Recherche...
          </div>
        )}

        {!loading && lastSearchedQuery.current && results.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Aucun résultat
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((item) => (
              <SearchResultItem
                key={item.row_id}
                item={item}
                isActive={item.row_id === currentItemId}
                query={query}
                onClick={onResultClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
