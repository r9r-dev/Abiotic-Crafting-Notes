import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import type { NpcConversation } from "@/types";
import { getDialogue, ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { DialogueHeader, DialogueLines } from "@/components/dialogue";

function DialogueContent({ conversation }: { conversation: NpcConversation }) {
  return (
    <div className="space-y-6">
      <SEO
        title={conversation.name}
        description={`Dialogue complet : ${conversation.name}. Tous les dialogues et choix de conversation dans Abiotic Factor.`}
        path={`/dialogue/${conversation.row_id}`}
        type="dialogue"
        rowId={conversation.row_id}
      />
      <DialogueHeader conversation={conversation} />
      <DialogueLines linesByType={conversation.lines_by_type} />
    </div>
  );
}

export function DialoguePage() {
  const { rowId } = useParams<{ rowId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<NpcConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const hasSearchContext = query.length > 0;

  useEffect(() => {
    if (!rowId) {
      setError("ID de conversation manquant");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getDialogue(rowId)
      .then(setConversation)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError(`Conversation "${rowId}" non trouvée`);
        } else {
          setError("Erreur lors du chargement de la conversation");
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

  if (error || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4 text-destructive">!</div>
          <p className="text-muted-foreground mb-4">{error || "Conversation non trouvee"}</p>
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
          <DialogueContent conversation={conversation} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
