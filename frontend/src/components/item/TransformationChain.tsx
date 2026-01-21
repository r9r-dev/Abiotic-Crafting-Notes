import { Link } from "react-router-dom";
import type { Consumable, LinkedItem, ItemUpgrade, UpgradedFrom } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TransformationChainProps {
  consumable?: Consumable | null;
  upgrades?: ItemUpgrade[];
  upgradedFrom?: UpgradedFrom[];
  currentItemRowId: string;
  currentItemName: string | null;
  currentItemIconPath: string | null;
}

interface TransformationNode {
  item: LinkedItem;
  isCurrent: boolean;
}

interface TransformationStep {
  from: TransformationNode;
  to: TransformationNode;
  type: "cooked" | "burned" | "decayed" | "upgraded";
}

const TRANSFORMATION_LABELS: Record<string, string> = {
  cooked: "Cuit",
  burned: "Brule",
  decayed: "Pourri",
  upgraded: "Ameliore",
};

function ItemIcon({
  item,
  isCurrent,
}: {
  item: LinkedItem;
  isCurrent: boolean;
}) {
  const iconUrl = item.icon_path ? `/icons/${item.icon_path}` : null;

  const content = (
    <div
      className={cn(
        "relative w-12 h-12 rounded-lg flex items-center justify-center transition-all group",
        isCurrent
          ? "ring-2 ring-primary bg-primary/10"
          : "bg-muted/50 hover:bg-muted"
      )}
      title={item.name || item.row_id}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={item.name || item.row_id}
          className="w-10 h-10 object-contain"
        />
      ) : (
        <div className="w-10 h-10 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
          ?
        </div>
      )}
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border">
        {item.name || item.row_id}
      </div>
    </div>
  );

  if (isCurrent) {
    return content;
  }

  return (
    <Link to={`/item/${item.row_id}`} className="block">
      {content}
    </Link>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center px-2">
      <span className="text-xs text-muted-foreground mb-1">{label}</span>
      <div className="flex items-center text-muted-foreground">
        <div className="w-4 h-px bg-current" />
        <svg
          className="w-3 h-3 -ml-1"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}

export function TransformationChain({
  consumable,
  upgrades,
  upgradedFrom,
  currentItemRowId,
  currentItemName,
  currentItemIconPath,
}: TransformationChainProps) {
  // Construire l'item courant
  const currentItem: LinkedItem = {
    row_id: currentItemRowId,
    name: currentItemName,
    icon_path: currentItemIconPath,
  };

  // Collecter toutes les transformations
  const steps: TransformationStep[] = [];

  // === Relations de cuisson (consumable) ===
  if (consumable) {
    // Relations inverses (items qui deviennent l'item courant)
    consumable.cooked_from?.forEach((source) => {
      steps.push({
        from: { item: source, isCurrent: false },
        to: { item: currentItem, isCurrent: true },
        type: "cooked",
      });
    });

    consumable.burned_from?.forEach((source) => {
      steps.push({
        from: { item: source, isCurrent: false },
        to: { item: currentItem, isCurrent: true },
        type: "burned",
      });
    });

    consumable.decayed_from?.forEach((source) => {
      steps.push({
        from: { item: source, isCurrent: false },
        to: { item: currentItem, isCurrent: true },
        type: "decayed",
      });
    });

    // Relations directes (item courant devient autre chose)
    if (consumable.cooked_item) {
      steps.push({
        from: { item: currentItem, isCurrent: true },
        to: { item: consumable.cooked_item, isCurrent: false },
        type: "cooked",
      });
    }

    if (consumable.burned_item) {
      steps.push({
        from: { item: currentItem, isCurrent: true },
        to: { item: consumable.burned_item, isCurrent: false },
        type: "burned",
      });
    }

    if (consumable.decay_to_item && consumable.can_item_decay) {
      steps.push({
        from: { item: currentItem, isCurrent: true },
        to: { item: consumable.decay_to_item, isCurrent: false },
        type: "decayed",
      });
    }
  }

  // === Relations d'amelioration (upgrades) ===
  // Relations inverses (items qui s'ameliorent vers l'item courant)
  upgradedFrom?.forEach((upgrade) => {
    if (upgrade.source_item) {
      steps.push({
        from: { item: upgrade.source_item, isCurrent: false },
        to: { item: currentItem, isCurrent: true },
        type: "upgraded",
      });
    }
  });

  // Relations directes (item courant peut etre ameliore)
  upgrades?.forEach((upgrade) => {
    if (upgrade.output_item) {
      steps.push({
        from: { item: currentItem, isCurrent: true },
        to: { item: upgrade.output_item, isCurrent: false },
        type: "upgraded",
      });
    }
  });

  // Pas de transformations ? Ne rien afficher
  if (steps.length === 0) {
    return null;
  }

  // Construire une chaine lineaire unique
  // On part des sources (items sans predecesseur) vers les destinations
  const buildChain = (): { item: LinkedItem; isCurrent: boolean; nextType?: string }[] => {
    const chain: { item: LinkedItem; isCurrent: boolean; nextType?: string }[] = [];
    const visited = new Set<string>();

    // Trouver l'item source (celui qui n'est jamais une destination dans les relations inverses)
    // ou l'item courant s'il est la source
    const sources = steps.filter(
      (s) =>
        s.from.isCurrent ||
        !steps.some((other) => other.to.item.row_id === s.from.item.row_id)
    );

    if (sources.length === 0) {
      // Fallback: commencer par l'item courant
      chain.push({ item: currentItem, isCurrent: true });
      return chain;
    }

    // Prendre la premiere source et construire la chaine
    const startStep = sources.find((s) => !s.from.isCurrent) || sources[0];
    let currentStep: TransformationStep | undefined = startStep;

    // Ajouter le premier item (source)
    if (!visited.has(startStep.from.item.row_id)) {
      chain.push({
        item: startStep.from.item,
        isCurrent: startStep.from.isCurrent,
        nextType: startStep.type,
      });
      visited.add(startStep.from.item.row_id);
    }

    // Suivre la chaine
    while (currentStep) {
      const toItem: TransformationNode = currentStep.to;
      if (visited.has(toItem.item.row_id)) break;

      // Trouver le prochain step qui part de cet item
      const nextStep: TransformationStep | undefined = steps.find(
        (s) => s.from.item.row_id === toItem.item.row_id && !visited.has(s.to.item.row_id)
      );

      chain.push({
        item: toItem.item,
        isCurrent: toItem.isCurrent,
        nextType: nextStep?.type,
      });
      visited.add(toItem.item.row_id);

      currentStep = nextStep;
    }

    return chain;
  };

  const chain = buildChain();

  // Determiner si on doit afficher "Necessite un four"
  const requiresBaking = consumable?.requires_baking ||
    consumable?.cooked_from?.some(item => item.requires_baking);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Transformation</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-center flex-wrap gap-y-4">
          {chain.map((node, index) => (
            <div key={node.item.row_id} className="flex items-center">
              <ItemIcon item={node.item} isCurrent={node.isCurrent} />
              {node.nextType && index < chain.length - 1 && (
                <Arrow label={TRANSFORMATION_LABELS[node.nextType]} />
              )}
            </div>
          ))}
        </div>

        {requiresBaking && (
          <div className="mt-3 text-center">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Necessite un four
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
