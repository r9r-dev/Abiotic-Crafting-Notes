import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { listItems } from "@/services/api";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { formatTag } from "@/lib/tagUtils";
import { GalleryItemCard } from "./GalleryItemCard";
import type { ItemListResult } from "@/types";

const ITEMS_PER_PAGE = 24;

const categories = [
  { value: "", label: "Tous" },
  { value: "weapon", label: "Armes" },
  { value: "equipment", label: "Equipements" },
  { value: "consumable", label: "Consommables" },
  { value: "deployable", label: "Deployables" },
  { value: "crafting_bench", label: "Etablis" },
  { value: "pickup", label: "Ramassables" },
] as const;

export function GalleryView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ItemListResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Lire les filtres depuis l'URL
  const category = searchParams.get("category") || "";
  const tag = searchParams.get("tag");

  const loadItems = useCallback(async (reset: boolean = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const skip = reset ? 0 : items.length;
      const response = await listItems({
        skip,
        limit: ITEMS_PER_PAGE,
        category: category || undefined,
        tag: tag || undefined,
      });

      if (reset) {
        setItems(response.items);
      } else {
        setItems(prev => [...prev, ...response.items]);
      }
      setTotal(response.total);
      setHasMore(response.has_more);
    } catch (error) {
      console.error("Erreur chargement items:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [items.length, category, tag, loading]);

  // Chargement initial et lors du changement de filtres
  useEffect(() => {
    setInitialLoading(true);
    loadItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, tag]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadItems(false);
    }
  }, [loading, hasMore, loadItems]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    loading,
  });

  const handleCategoryChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    // Mettre a jour ou supprimer la categorie
    if (value) {
      newParams.set("category", value);
    } else {
      newParams.delete("category");
    }
    // Reset le tag lors du changement de categorie
    newParams.delete("tag");
    setSearchParams(newParams, { replace: true });
  };

  const handleTagClick = (clickedTag: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tag", clickedTag);
    setSearchParams(newParams, { replace: true });
  };

  const clearTag = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("tag");
    setSearchParams(newParams, { replace: true });
  };

  return (
    <div className="w-full">
      {/* Filtres par categorie */}
      <Tabs value={category} onValueChange={handleCategoryChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="flex-shrink-0">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Tag actif */}
      {tag && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtre actif:</span>
          <Badge variant="default" className="flex items-center gap-1">
            {formatTag(tag)}
            <button
              onClick={clearTag}
              className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Compteur */}
      <div className="mt-4 text-sm text-muted-foreground">
        {total} item{total > 1 ? "s" : ""} trouve{total > 1 ? "s" : ""}
      </div>

      {/* Grille */}
      {initialLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucun item trouve
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <GalleryItemCard
                key={item.row_id}
                item={item}
                onTagClick={handleTagClick}
              />
            ))}
          </div>

          {/* Sentinel pour infinite scroll */}
          <div ref={sentinelRef} className="h-4" />

          {/* Loading indicator */}
          {loading && !initialLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
