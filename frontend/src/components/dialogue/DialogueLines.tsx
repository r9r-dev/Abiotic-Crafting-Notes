import { useNavigate } from "react-router-dom";
import type { DialogueLine, DialogueLinesByType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  Clock,
  MessageSquare,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Gift,
  BookOpen,
  Flag,
} from "lucide-react";

interface DialogueLinesProps {
  linesByType: DialogueLinesByType;
}

const lineTypeConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  beckoning: {
    label: "Lignes d'appel",
    icon: <Megaphone className="w-4 h-4" />,
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  },
  idle: {
    label: "Lignes au repos",
    icon: <Clock className="w-4 h-4" />,
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30",
  },
  initial_contact: {
    label: "Premier contact",
    icon: <MessageSquare className="w-4 h-4" />,
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  },
  return_messages: {
    label: "Messages de retour",
    icon: <RotateCcw className="w-4 h-4" />,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
  vendor_positive: {
    label: "Marchand (positif)",
    icon: <ThumbsUp className="w-4 h-4" />,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  vendor_negative: {
    label: "Marchand (negatif)",
    icon: <ThumbsDown className="w-4 h-4" />,
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  },
};

const unlockTypeConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  recipe: {
    label: "Recette",
    icon: <Gift className="w-3 h-3" />,
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
  },
  journal: {
    label: "Journal",
    icon: <BookOpen className="w-3 h-3" />,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
  compendium: {
    label: "Compendium",
    icon: <BookOpen className="w-3 h-3" />,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  world_flag: {
    label: "Flag",
    icon: <Flag className="w-3 h-3" />,
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30",
  },
};

function DialogueLineCard({ line, index }: { line: DialogueLine; index: number }) {
  const navigate = useNavigate();

  const handleUnlockClick = (type: string, rowId: string) => {
    if (type === "recipe") {
      // Les recettes sont liees aux items
      navigate(`/item/${encodeURIComponent(rowId)}`);
    } else if (type === "compendium") {
      navigate(`/compendium/${encodeURIComponent(rowId)}`);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground font-mono">
              #{index + 1}
            </span>
            {line.audio_asset_name && (
              <span className="text-xs text-muted-foreground truncate" title={line.audio_asset_name}>
                {line.audio_asset_name.split("/").pop()?.replace("_Dialogue", "")}
              </span>
            )}
          </div>

          {line.text ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {line.text.split("\n").map((paragraph, pIndex) => (
                <p key={pIndex} className={pIndex > 0 ? "mt-2" : ""}>
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic text-sm">
              Texte non disponible
            </p>
          )}

          {line.unlocks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {line.unlocks.map((unlock, uIndex) => {
                const config = unlockTypeConfig[unlock.unlock_type];
                const isClickable = unlock.unlock_type === "recipe" || unlock.unlock_type === "compendium";

                return (
                  <Badge
                    key={uIndex}
                    variant="outline"
                    className={`${config?.color || ""} ${isClickable ? "cursor-pointer hover:opacity-80" : ""}`}
                    onClick={isClickable ? () => handleUnlockClick(unlock.unlock_type, unlock.unlock_row_id) : undefined}
                  >
                    {config?.icon}
                    <span className="ml-1">
                      {unlock.unlock_name || unlock.unlock_row_id}
                    </span>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {line.montage_delay > 0 && (
          <Badge variant="secondary" className="flex-shrink-0">
            {line.montage_delay}s
          </Badge>
        )}
      </div>
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

  const config = lineTypeConfig[typeKey];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={config?.color || ""}>
            {config?.icon}
            <span className="ml-1">{config?.label || typeKey}</span>
          </Badge>
          <span className="text-sm text-muted-foreground">
            ({lines.length} ligne{lines.length > 1 ? "s" : ""})
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {lines.map((line, index) => (
          <DialogueLineCard key={index} line={line} index={index} />
        ))}
      </CardContent>
    </Card>
  );
}

export function DialogueLines({ linesByType }: DialogueLinesProps) {
  return (
    <div className="space-y-6">
      <DialogueSection
        typeKey="initial_contact"
        lines={linesByType.initial_contact}
      />
      <DialogueSection
        typeKey="return_messages"
        lines={linesByType.return_messages}
      />
      <DialogueSection typeKey="beckoning" lines={linesByType.beckoning} />
      <DialogueSection typeKey="idle" lines={linesByType.idle} />
      <DialogueSection
        typeKey="vendor_positive"
        lines={linesByType.vendor_positive}
      />
      <DialogueSection
        typeKey="vendor_negative"
        lines={linesByType.vendor_negative}
      />
    </div>
  );
}
