import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NpcConversation, DialogueLine } from "@/types";
import { getDialogueByName } from "@/services/api";

interface CompendiumDialoguesProps {
  characterName: string;
}

const LINE_TYPE_LABELS: Record<string, string> = {
  beckoning: "Interpellation",
  idle: "Inactif",
  initial_contact: "Premier contact",
  return_messages: "Retour",
  vendor_positive: "Transaction positive",
  vendor_negative: "Transaction negative",
};

const LINE_TYPE_ORDER = [
  "initial_contact",
  "beckoning",
  "return_messages",
  "idle",
  "vendor_positive",
  "vendor_negative",
] as const;

// Mapping des suffixes de conversation vers des labels lisibles
const CONVERSATION_SUFFIX_LABELS: Record<string, string> = {
  // États de progression
  "_MFOpen": "Après ouverture de l'usine",
  "_SpillwayOpen": "Après ouverture du déversoir",
  "_DoorOpen": "Après ouverture de la porte",
  "_Panic": "Mode panique",
  "_JagerDead": "Après la mort de Jager",
  "_Melted": "Après la fonte",
  // Combat
  "_PreBossFight": "Avant le combat de boss",
  "_PostBossFight": "Après le combat de boss",
  "_PreBoss": "Avant le boss",
  "_PreWall": "Avant le mur",
  "_PostWall": "Après le mur",
  // États du personnage
  "_Trader": "Mode marchand",
  "_Bandaged": "Blessé",
  "_HatEquipped": "Avec chapeau",
  // Fin de jeu
  "_Endgame": "Fin de jeu",
  "_EndGame": "Fin de jeu",
  // Phases numerotees
  "_02": "Phase 2",
  "_03": "Phase 3",
  "_04": "Phase 4",
  "_2": "Phase 2",
  "_3": "Phase 3",
};

// Mapping des préfixes de conversation vers des labels lisibles
const CONVERSATION_PREFIX_LABELS: Record<string, string> = {
  // Lieux
  "Flathill_": "Flathill",
  "Spillway_": "Déversoir",
  "MF_": "Usine de production",
  "Labs_": "Laboratoires",
  "Office_": "Bureaux",
  "Cafeteria_": "Cafétéria",
  "Security_": "Sécurité",
  // Rôles
  "Trader_": "Mode marchand",
  "Vendor_": "Mode vendeur",
};

function getConversationLabel(rowId: string, npcName: string | null): string | null {
  // Si le row_id est identique au nom du NPC, c'est le dialogue de base
  if (rowId === npcName) {
    return null; // Pas besoin de label pour le dialogue de base
  }

  const labels: string[] = [];

  // Chercher un préfixe connu
  for (const [prefix, label] of Object.entries(CONVERSATION_PREFIX_LABELS)) {
    if (rowId.startsWith(prefix)) {
      labels.push(label);
      break;
    }
  }

  // Chercher un suffixe connu
  for (const [suffix, label] of Object.entries(CONVERSATION_SUFFIX_LABELS)) {
    if (rowId.endsWith(suffix)) {
      labels.push(label);
      break;
    }
  }

  // Retourner les labels combinés ou le row_id si aucun match
  if (labels.length > 0) {
    return labels.join(" - ");
  }

  // Si pas de préfixe/suffixe connu mais different du nom, afficher le row_id
  return rowId;
}

function cleanDialogueText(text: string): string {
  return text.replace(/\s*\[\d+\.?\d*\]\s*/g, " ").trim();
}

function DialogueLineItem({ line }: { line: DialogueLine }) {
  if (!line.text) return null;

  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <p className="text-sm text-foreground/90 italic">
        "{cleanDialogueText(line.text)}"
      </p>
      {line.unlocks.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {line.unlocks.map((unlock, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {unlock.unlock_type === "recipe" && "Recette"}
              {unlock.unlock_type === "journal" && "Journal"}
              {unlock.unlock_type === "compendium" && "Compendium"}
              {unlock.unlock_type === "world_flag" && "Évenement"}
              {unlock.unlock_name && `: ${unlock.unlock_name}`}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function DialogueSection({
  typeKey,
  lines,
}: {
  typeKey: string;
  lines: DialogueLine[];
}) {
  if (lines.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-muted-foreground">
        {LINE_TYPE_LABELS[typeKey] || typeKey}
      </h4>
      <div className="pl-3 border-l-2 border-primary/30">
        {lines.map((line, idx) => (
          <DialogueLineItem key={idx} line={line} />
        ))}
      </div>
    </div>
  );
}

function ConversationCard({ conversation }: { conversation: NpcConversation }) {
  const { lines_by_type } = conversation;

  // Calculer le nombre de lignes avec du texte
  const totalWithText = LINE_TYPE_ORDER.reduce(
    (acc, key) => acc + lines_by_type[key].filter((l) => l.text).length,
    0
  );

  if (totalWithText === 0) return null;

  const contextLabel = getConversationLabel(conversation.row_id, conversation.npc_name);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          Dialogues
          {contextLabel && (
            <Badge variant="secondary" className="font-normal text-xs">
              {contextLabel}
            </Badge>
          )}
          <Badge variant="outline" className="font-normal">
            {totalWithText} ligne{totalWithText > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {LINE_TYPE_ORDER.map((typeKey) => {
          const lines = lines_by_type[typeKey];
          return (
            <DialogueSection key={typeKey} typeKey={typeKey} lines={lines} />
          );
        })}
      </CardContent>
    </Card>
  );
}

export function CompendiumDialogues({
  characterName,
}: CompendiumDialoguesProps) {
  const [conversations, setConversations] = useState<NpcConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!characterName) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Extraire les parties du nom pour la recherche
    const nameParts = characterName
      .replace(/^Dr\.?\s*/i, "")
      .split(" ")
      .filter((p) => p.length > 0);

    const trySearch = async (): Promise<NpcConversation[]> => {
      // Essayer d'abord avec le prenom
      if (nameParts.length > 0) {
        const firstName = nameParts[0];
        const result = await getDialogueByName(firstName).catch(() => []);
        if (result.length > 0) return result;
      }

      // Essayer avec le nom de famille
      if (nameParts.length > 1) {
        const lastName = nameParts[nameParts.length - 1];
        const result = await getDialogueByName(lastName).catch(() => []);
        if (result.length > 0) return result;
      }

      // Essayer avec le nom complet
      return getDialogueByName(characterName).catch(() => []);
    };

    trySearch()
      .then(setConversations)
      .finally(() => setLoading(false));
  }, [characterName]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dialogues</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground animate-pulse">
            Chargement...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {conversations.map((conv) => (
        <ConversationCard key={conv.row_id} conversation={conv} />
      ))}
    </div>
  );
}
