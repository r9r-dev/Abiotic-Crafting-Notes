import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import type { Item } from "@/types";
import { getItem, ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  ItemHeader,
  ItemBaseStats,
  ItemRecipes,
  WeaponStats,
  EquipmentStats,
  ConsumableStats,
  DeployableStats,
} from "@/components/item";
import { ItemSalvage } from "@/components/item/ItemSalvage";
import { ItemCooking } from "@/components/item/ItemCooking";

function ItemContent({ item }: { item: Item }) {
  return (
    <div className="space-y-6">
      <ItemHeader item={item} />
      <ItemBaseStats item={item} />
      {item.weapon && <WeaponStats weapon={item.weapon} />}
      {item.equipment && <EquipmentStats equipment={item.equipment} />}
      {item.consumable && <ConsumableStats consumable={item.consumable} />}
      {item.consumable && <ItemCooking consumable={item.consumable} />}
      {item.deployable && <DeployableStats deployable={item.deployable} />}
      {item.recipes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Fabrication</h2>
          <ItemRecipes recipes={item.recipes} />
        </div>
      )}
      {item.salvage && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Desassemblage</h2>
          <ItemSalvage salvage={item.salvage} />
        </div>
      )}
    </div>
  );
}

export function ItemPage() {
  const { rowId } = useParams<{ rowId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const hasSearchContext = query.length > 0;

  useEffect(() => {
    if (!rowId) {
      setError("ID d'item manquant");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getItem(rowId)
      .then(setItem)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError(`Item "${rowId}" non trouvé`);
        } else {
          setError("Erreur lors du chargement de l'item");
        }
      })
      .finally(() => setLoading(false));
  }, [rowId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">...</div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4 text-destructive">!</div>
          <p className="text-muted-foreground mb-4">{error || "Item non trouvé"}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={hasSearchContext ? "max-w-3xl" : "max-w-3xl mx-auto"}>
      {/* Bouton retour */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="gap-2"
        >
          <span>&larr;</span> {hasSearchContext ? "Nouvelle recherche" : "Retour"}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={rowId}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ ease: "easeInOut", duration: 0.15 }}
        >
          <ItemContent item={item} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
