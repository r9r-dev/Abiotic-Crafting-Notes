import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, LayoutGrid, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { unifiedSearch } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { GalleryView } from "@/components/gallery";
import { ElectricStringsBackground } from "@/components/ElectricStringsBackground";
import { SEO } from "@/components/SEO";
import { getIconUrl } from "@/lib/icons";
import type { UnifiedSearchResult } from "@/types";

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
  // NPC categories
  alien: "Alien",
  human: "Humain",
  robot: "Robot",
  creature: "Créature",
  mutant: "Mutant",
  // Compendium categories
  ENTITY: "Entité",
  IS: "Item Spécial",
  PEOPLE: "Personnage",
  LOCATION: "Lieu",
  THEORIES: "Théorie",
};

function SearchResult({
  item,
  query,
  position,
  onResultClick,
}: {
  item: UnifiedSearchResult;
  query: string;
  position: number;
  onResultClick: (rowId: string, itemType: string, position: number) => void;
}) {
  const isNPC = item.type === "npc";
  const isCompendium = item.type === "compendium";

  // Determiner l'URL de l'icone selon le type
  // HomePage displays at 40x40
  let iconUrl: string | null = null;
  if (item.icon_path) {
    if (isCompendium) {
      iconUrl = `/compendium/${item.icon_path}`;
    } else {
      iconUrl = getIconUrl(item.icon_path, 40);
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

  // Determiner le nom et la description a afficher
  const displayName = isCompendium ? (item.title || item.row_id) : (item.name || item.row_id);
  const displayDescription = isCompendium ? item.subtitle : item.description;

  return (
    <Link
      to={linkPath}
      onClick={() => onResultClick(item.row_id, item.type, position)}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors"
    >
      <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={displayName}
            className="w-10 h-10 object-contain" loading="lazy" width="40" height="40"
          />
        ) : isNPC ? (
          <span className="text-xl text-muted-foreground">
            {item.is_hostile ? "!" : item.is_passive ? "~" : "?"}
          </span>
        ) : isCompendium ? (
          <span className="text-xl text-muted-foreground">C</span>
        ) : (
          <span className="text-xl text-muted-foreground">?</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">
            {displayName}
          </span>
          {isNPC && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              NPC
            </Badge>
          )}
          {isCompendium && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              Compendium
            </Badge>
          )}
          {item.category && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {categoryLabels[item.category] || item.category}
            </Badge>
          )}
          {isNPC && item.is_hostile && (
            <Badge variant="destructive" className="text-xs flex-shrink-0">
              Hostile
            </Badge>
          )}
        </div>
        {displayDescription && (
          <p className="text-sm text-muted-foreground truncate">
            {displayDescription}
          </p>
        )}
      </div>
    </Link>
  );
}

export function HomePage() {
  const [searchParams] = useSearchParams();
  const isGalleryView = searchParams.get("view") === "gallery";

  // Si on est en vue galerie, afficher la galerie
  if (isGalleryView) {
    return (
      <>
        <SEO
          title="Galerie"
          description="Parcourez tous les items, NPCs et entrées du Compendium d'Abiotic Factor en mode galerie."
          path="/?view=gallery"
        />
        <div className="px-4 pb-8">
          <div className="max-w-5xl mx-auto">
            <div className="pt-8 pb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold">Galerie</h1>
              <Button variant="outline" asChild>
                <Link to="/">
                  <Search className="h-4 w-4 mr-2" />
                  Recherche
                </Link>
              </Button>
            </div>
            <GalleryView />
          </div>
        </div>
      </>
    );
  }

  // Vue recherche (defaut)
  return <SearchView />;
}

function SearchView() {
  const { user } = useAuth();
  const { trackSearch, trackSearchResultClick } = useAnalytics();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrackedQuery = useRef<string>("");

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
        const response = await unifiedSearch(query.trim());
        setResults(response.results);
        setHasSearched(true);

        // Tracker la recherche (eviter les doublons)
        if (query.trim() !== lastTrackedQuery.current) {
          trackSearch(query.trim(), response.results.length);
          lastTrackedQuery.current = query.trim();
        }
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
  }, [query, trackSearch]);

  const handleResultClick = (rowId: string, itemType: string, position: number) => {
    trackSearchResultClick(query.trim(), rowId, itemType, position);
  };

  const showResults = hasSearched || results.length > 0;

  return (
    <ElectricStringsBackground speed={1} className="h-screen overflow-hidden">
      <SEO
        title="Recherche"
        description="Base de données complète pour Abiotic Factor. Recherchez des items, recettes, NPCs, crafting et plus encore. Guide ultime pour survivre dans le laboratoire."
        path="/"
      />
      <div className="flex flex-col items-center px-4 h-screen">
        {/* Espaceur flexible pour centrer verticalement */}
        <div className={`transition-all duration-300 ${showResults ? "flex-none" : "flex-1"}`} />

        {/* Contenu principal */}
        <div className={`w-full max-w-xl transition-all duration-300 ${showResults ? "pt-8" : ""}`}>
          {/* Titre */}
          <h1
            className={`font-bold text-center transition-all duration-300 mb-8 abiotic-title ${
              showResults ? "text-2xl" : "text-5xl"
            }`}
          >
            ABIOTIC SCIENCE
          </h1>

          {/* Champ de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-600 z-10" />
            <Input
              type="text"
              placeholder=""
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-lg bg-background/90 backdrop-blur-sm border-foreground/20"
              autoFocus
            />
          </div>

          {/* Resultats */}
          <div className="mt-6 max-h-[50vh] overflow-y-auto">
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
              <div className="space-y-1 bg-background/80 backdrop-blur-sm rounded-lg p-2">
                {results.map((item, index) => (
                  <SearchResult
                    key={`${item.type}-${item.row_id}`}
                    item={item}
                    query={query}
                    position={index}
                    onResultClick={handleResultClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Espaceur flexible */}
        <div className="flex-1" />

        {/* Footer discret */}
        <div className="pb-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Link
              to="/?view=gallery"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/admin"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
            </Link>
          </div>
          {user && (
            <span className="text-xs text-muted-foreground/60">
              {user.name}
            </span>
          )}
        </div>
      </div>
    </ElectricStringsBackground>
  );
}
