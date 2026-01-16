import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { RecipeSearchResult } from "@/types";

const STORAGE_KEY = "abiotic-cart";

export interface CartItem {
  recipe: RecipeSearchResult;
  quantity: number;
}

interface CartContextType {
  items: Map<string, CartItem>;
  totalCount: number;
  bakingItems: CartItem[];
  craftingItems: CartItem[];
  bakingCount: number;
  craftingCount: number;
  addItem: (recipe: RecipeSearchResult) => void;
  removeItem: (recipeId: string) => void;
  setItemQuantity: (recipeId: string, quantity: number) => void;
  clearCart: () => void;
  clearBaking: () => void;
  clearCrafting: () => void;
  getItemQuantity: (recipeId: string) => number;
}

const CartContext = createContext<CartContextType | null>(null);

// Détermine le type principal d'un item
function getItemType(recipe: RecipeSearchResult): "Baking" | "Crafting" | "Other" {
  const sources = recipe.source_types || [];
  if (sources.includes("Baking")) return "Baking";
  if (sources.includes("Crafting")) return "Crafting";
  return "Other";
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Map<string, CartItem>>(new Map());

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: [string, CartItem][] = JSON.parse(stored);
        setItems(new Map(parsed));
      }
    } catch (err) {
      console.error("Failed to load cart from localStorage:", err);
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(items.entries())));
    } catch (err) {
      console.error("Failed to save cart to localStorage:", err);
    }
  }, [items]);

  // Séparer les items par type
  const { bakingItems, craftingItems } = useMemo(() => {
    const baking: CartItem[] = [];
    const crafting: CartItem[] = [];

    for (const item of items.values()) {
      const type = getItemType(item.recipe);
      if (type === "Baking") {
        baking.push(item);
      } else if (type === "Crafting") {
        crafting.push(item);
      } else {
        // Les items "Other" vont dans crafting par défaut
        crafting.push(item);
      }
    }

    // Tri alphabétique
    const sortFn = (a: CartItem, b: CartItem) =>
      (a.recipe.name_fr || a.recipe.name).localeCompare(b.recipe.name_fr || b.recipe.name, 'fr');

    return {
      bakingItems: baking.sort(sortFn),
      craftingItems: crafting.sort(sortFn),
    };
  }, [items]);

  const totalCount = Array.from(items.values()).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const bakingCount = bakingItems.reduce((sum, item) => sum + item.quantity, 0);
  const craftingCount = craftingItems.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = useCallback((recipe: RecipeSearchResult) => {
    setItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(recipe.id);
      if (existing) {
        next.set(recipe.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(recipe.id, { recipe, quantity: 1 });
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((recipeId: string) => {
    setItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(recipeId);
      if (existing) {
        if (existing.quantity <= 1) {
          next.delete(recipeId);
        } else {
          next.set(recipeId, { ...existing, quantity: existing.quantity - 1 });
        }
      }
      return next;
    });
  }, []);

  const setItemQuantity = useCallback((recipeId: string, quantity: number) => {
    setItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(recipeId);
      if (quantity <= 0) {
        next.delete(recipeId);
      } else if (existing) {
        next.set(recipeId, { ...existing, quantity });
      }
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems(new Map());
  }, []);

  const clearBaking = useCallback(() => {
    setItems((prev) => {
      const next = new Map(prev);
      for (const [id, item] of prev) {
        if (getItemType(item.recipe) === "Baking") {
          next.delete(id);
        }
      }
      return next;
    });
  }, []);

  const clearCrafting = useCallback(() => {
    setItems((prev) => {
      const next = new Map(prev);
      for (const [id, item] of prev) {
        const type = getItemType(item.recipe);
        if (type === "Crafting" || type === "Other") {
          next.delete(id);
        }
      }
      return next;
    });
  }, []);

  const getItemQuantity = useCallback(
    (recipeId: string) => {
      return items.get(recipeId)?.quantity || 0;
    },
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        bakingItems,
        craftingItems,
        bakingCount,
        craftingCount,
        addItem,
        removeItem,
        setItemQuantity,
        clearCart,
        clearBaking,
        clearCrafting,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
