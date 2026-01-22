import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import type { NPC } from "@/types";
import { getNPC, ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  NPCHeader,
  NPCCombatStats,
  NPCBehavior,
  NPCResistances,
  NPCLootTables,
} from "@/components/npc";

function NPCContent({ npc }: { npc: NPC }) {
  return (
    <div className="space-y-6">
      <NPCHeader npc={npc} />
      <NPCCombatStats npc={npc} />
      <NPCBehavior npc={npc} />
      <NPCResistances npc={npc} />
      {npc.loot_tables.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Butin</h2>
          <NPCLootTables lootTables={npc.loot_tables} />
        </div>
      )}
    </div>
  );
}

export function NPCPage() {
  const { rowId } = useParams<{ rowId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [npc, setNpc] = useState<NPC | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const hasSearchContext = query.length > 0;

  useEffect(() => {
    if (!rowId) {
      setError("ID de NPC manquant");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getNPC(rowId)
      .then(setNpc)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError(`NPC "${rowId}" non trouve`);
        } else {
          setError("Erreur lors du chargement du NPC");
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

  if (error || !npc) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4 text-destructive">!</div>
          <p className="text-muted-foreground mb-4">{error || "NPC non trouve"}</p>
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
          <NPCContent npc={npc} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
