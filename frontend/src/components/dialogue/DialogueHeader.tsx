import { useNavigate } from "react-router-dom";
import type { NpcConversation } from "@/types";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Store, UserCircle } from "lucide-react";

interface DialogueHeaderProps {
  conversation: NpcConversation;
}

export function DialogueHeader({ conversation }: DialogueHeaderProps) {
  const navigate = useNavigate();

  const handleNPCClick = () => {
    if (conversation.npc_row_id) {
      navigate(`/npc/${encodeURIComponent(conversation.npc_row_id)}`);
    }
  };

  // Compter les types de lignes
  const lineStats = {
    beckoning: conversation.lines_by_type.beckoning.length,
    idle: conversation.lines_by_type.idle.length,
    initial: conversation.lines_by_type.initial_contact.length,
    return: conversation.lines_by_type.return_messages.length,
    vendor:
      conversation.lines_by_type.vendor_positive.length +
      conversation.lines_by_type.vendor_negative.length,
  };

  const hasVendorLines = lineStats.vendor > 0;

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {conversation.npc?.icon_path && (
        <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-muted rounded-lg overflow-hidden border flex items-center justify-center">
          <img
            src={`/npc-icons/${conversation.npc.icon_path}`}
            alt={conversation.npc_name || conversation.row_id}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          {conversation.npc_name || conversation.row_id}
        </h1>

        <p className="text-muted-foreground mt-1">
          {conversation.total_lines} ligne{conversation.total_lines > 1 ? "s" : ""} de dialogue
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          {conversation.npc && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={handleNPCClick}
            >
              <UserCircle className="w-3 h-3 mr-1" />
              Voir le NPC
            </Badge>
          )}

          {hasVendorLines && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
            >
              <Store className="w-3 h-3 mr-1" />
              Marchand
            </Badge>
          )}

          {conversation.world_flag_to_complete && conversation.world_flag_to_complete !== "None" && (
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
            >
              Flag: {conversation.world_flag_to_complete}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
          {lineStats.initial > 0 && <span>Premier contact: {lineStats.initial}</span>}
          {lineStats.return > 0 && <span>Retour: {lineStats.return}</span>}
          {lineStats.beckoning > 0 && <span>Appel: {lineStats.beckoning}</span>}
          {lineStats.idle > 0 && <span>Repos: {lineStats.idle}</span>}
          {lineStats.vendor > 0 && <span>Marchand: {lineStats.vendor}</span>}
        </div>
      </div>
    </div>
  );
}
