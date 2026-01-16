import type { DependencyNode } from "@/types";
import { cn, getDisplayName } from "@/lib/utils";
import { ChevronRight, Package, Hammer } from "lucide-react";

interface DependencyTreeProps {
  node: DependencyNode;
  depth?: number;
}

export function DependencyTree({ node, depth = 0 }: DependencyTreeProps) {
  const hasChildren = node.children.length > 0;
  const displayName = getDisplayName(node.item_name_fr, node.item_name);

  return (
    <div className={cn("space-y-1", depth > 0 && "ml-4 border-l pl-4")}>
      <div className="flex items-center gap-2">
        {hasChildren && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        {node.craftable ? (
          <Hammer className="h-4 w-4 text-primary" />
        ) : (
          <Package className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={cn("text-sm", !node.craftable && "text-muted-foreground")}>
          {displayName}
        </span>
        <span className="text-xs text-muted-foreground">x{node.quantity}</span>
      </div>

      {hasChildren && (
        <div className="space-y-1">
          {node.children.map((child, index) => (
            <DependencyTree
              key={`${child.item_id}-${index}`}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
