import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import type { CompendiumEntry } from "@/types";
import { getCompendiumEntry, ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import {
  CompendiumHeader,
  CompendiumSections,
  CompendiumKillRequirement,
  CompendiumRecipeUnlocks,
  CompendiumDialogues,
} from "@/components/compendium";

function CompendiumContent({ entry }: { entry: CompendiumEntry }) {
  const isPerson = entry.category.toUpperCase() === "PEOPLE";

  return (
    <div className="space-y-6">
      <SEO
        title={entry.title}
        description={entry.subtitle || `Entrée du Compendium : ${entry.title}. Découvrez le lore et les informations cachées d'Abiotic Factor.`}
        path={`/compendium/${entry.row_id}`}
        type="compendium"
        rowId={entry.row_id}
      />
      <CompendiumHeader entry={entry} />
      <CompendiumSections sections={entry.sections} />
      {isPerson && entry.title && (
        <CompendiumDialogues characterName={entry.title} />
      )}
      <CompendiumKillRequirement entry={entry} />
      <CompendiumRecipeUnlocks recipeUnlocks={entry.recipe_unlocks} />
    </div>
  );
}

export function CompendiumPage() {
  const { rowId } = useParams<{ rowId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<CompendiumEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const hasSearchContext = query.length > 0;

  useEffect(() => {
    if (!rowId) {
      setError("ID d'entree manquant");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getCompendiumEntry(rowId)
      .then(setEntry)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError(`Entree "${rowId}" non trouvee`);
        } else {
          setError("Erreur lors du chargement de l'entrée");
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

  if (error || !entry) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4 text-destructive">!</div>
          <p className="text-muted-foreground mb-4">{error || "Entree non trouvee"}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={hasSearchContext ? "max-w-3xl" : "max-w-3xl mx-auto"}>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <span>&larr;</span> Retour
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
          <CompendiumContent entry={entry} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
