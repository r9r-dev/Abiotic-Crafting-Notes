import { useSearchParams } from "react-router-dom";

/**
 * Hook pour générer des liens vers des items en conservant le contexte de recherche.
 */
export function useItemLink() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");

  /**
   * Génère un lien vers un item en conservant le paramètre de recherche.
   */
  const getItemLink = (rowId: string): string => {
    if (query) {
      return `/item/${rowId}?q=${encodeURIComponent(query)}`;
    }
    return `/item/${rowId}`;
  };

  return { getItemLink, hasSearchContext: !!query };
}
