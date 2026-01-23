import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NpcConversation, DialogueLine } from "@/types";
import { getDialogueByNPC } from "@/services/api";

interface NPCDialoguesProps {
  npcRowId: string;
}

const LINE_TYPE_LABELS: Record<string, string> = {
  beckoning: "Interpellation",
  idle: "Inactif",
  initial_contact: "Premier contact",
  return_messages: "Retour",
  vendor_positive: "Transaction positive",
  vendor_negative: "Transaction négative",
};

const LINE_TYPE_ORDER = [
  "initial_contact",
  "beckoning",
  "return_messages",
  "idle",
  "vendor_positive",
  "vendor_negative",
] as const;

function cleanDialogueText(text: string): string {
  // Enlever les timestamps entre crochets [3], [9.5], etc.
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
              {unlock.unlock_type === "world_flag" && "Evenement"}
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

export function NPCDialogues({ npcRowId }: NPCDialoguesProps) {
  const [conversation, setConversation] = useState<NpcConversation | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDialogueByNPC(npcRowId)
      .then(setConversation)
      .catch(() => setConversation(null))
      .finally(() => setLoading(false));
  }, [npcRowId]);

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

  if (!conversation || conversation.total_lines === 0) {
    return null;
  }

  const { lines_by_type } = conversation;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Dialogues
          <Badge variant="outline" className="font-normal">
            {conversation.total_lines} ligne
            {conversation.total_lines > 1 ? "s" : ""}
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
