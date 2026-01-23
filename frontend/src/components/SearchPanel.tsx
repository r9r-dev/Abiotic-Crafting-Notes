import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { unifiedSearch } from "@/services/api";
import type { UnifiedSearchResult } from "@/types";

const categoryLabels: Record<string, string> = {
  weapon: "Arme",
  equipment: "Equipement",
  consumable: "Consommable",
  deployable: "Deployable",
  deployable_small: "Petit deployable",
  crafting_bench: "Etabli",
  pickup: "Ramassable",
  plant: "Plante",
  pet: "Familier",
  // NPC categories
  alien: "Alien",
  human: "Humain",
  robot: "Robot",
  creature: "Creature",
  mutant: "Mutant",
  // Compendium categories
  ENTITY: "Entite",
  IS: "Item Special",
  PEOPLE: "Personnage",
  LOCATION: "Lieu",
  THEORIES: "Theorie",
};

interface SearchResultItemProps {
  item: UnifiedSearchResult;
  isActive: boolean;
  query: string;
  onClick?: () => void;
}

function SearchResultItem({ item, isActive, query, onClick }: SearchResultItemProps) {
  const isNPC = item.type === "npc";
  const isCompendium = item.type === "compendium";

  // Determiner l'URL de l'icone selon le type
  let iconUrl: string | null = null;
  if (item.icon_path) {
    if (isCompendium) {
      iconUrl = `/compendium/${item.icon_path}`;
    } else {
      iconUrl = `/icons/${item.icon_path}`;
    }
  }

  // Determiner le chemin du lien
  let linkPath: string;
  if (isNPC) {
    linkPath = `/npc/${item.row_id}?q=${encodeURIComponent(query)}`;
  } else if (isCompendium) {
    linkPath = `/compendium/${item.row_id}?q=${encodeURIComponent(query)}`;
  } else {
    linkPath = `/item/${item.row_id}?q=${encodeURIComponent(query)}`;
  }

  // Determiner le nom a afficher
  const displayName = isCompendium ? (item.title || item.row_id) : (item.name || item.row_id);
  const displaySubtitle = isCompendium ? item.subtitle : null;

  return (
    <Link
      to={linkPath}
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
            alt={displayName}
            className="w-8 h-8 object-contain"
          />
        ) : isNPC ? (
          <span className="text-sm text-muted-foreground">
            {item.is_hostile ? "!" : item.is_passive ? "~" : "?"}
          </span>
        ) : isCompendium ? (
          <span className="text-sm text-muted-foreground">C</span>
        ) : (
          <span className="text-sm text-muted-foreground">?</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {displayName}
        </div>
        {displaySubtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {displaySubtitle}
          </div>
        )}
        <div className="flex gap-1 mt-0.5">
          {isNPC && (
            <Badge variant="secondary" className="text-xs">
              NPC
            </Badge>
          )}
          {isCompendium && (
            <Badge variant="secondary" className="text-xs">
              Compendium
            </Badge>
          )}
          {item.category && (
            <Badge variant="outline" className="text-xs">
              {categoryLabels[item.category] || item.category}
            </Badge>
          )}
          {isNPC && item.is_hostile && (
            <Badge variant="destructive" className="text-xs">
              Hostile
            </Badge>
          )}
        </div>
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
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedQuery = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Recherche avec debounce - ne relance pas si meme query
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

    // Ne pas relancer si c'est la meme recherche
    if (trimmedQuery === lastSearchedQuery.current) {
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await unifiedSearch(trimmedQuery);
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
                key={`${item.type}-${item.row_id}`}
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
