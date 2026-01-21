import { Link } from "react-router-dom";
import type { Consumable, LinkedItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TransformationChainProps {
  consumable?: Consumable | null;
  upgradeChain?: LinkedItem[];
  cookingChain?: LinkedItem[];
  currentItemRowId: string;
}

const TRANSFORMATION_LABELS = {
  upgraded: "Ameliore",
  cooked: "Cuit",
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
        "relative w-16 h-16 rounded-lg flex items-center justify-center transition-all group",
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
          className="w-14 h-14 object-contain"
        />
      ) : (
        <div className="w-14 h-14 bg-muted-foreground/20 rounded flex items-center justify-center text-sm">
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

function ChainDisplay({
  chain,
  currentItemRowId,
  label,
}: {
  chain: LinkedItem[];
  currentItemRowId: string;
  label: string;
}) {
  if (chain.length === 0) return null;

  return (
    <div className="flex items-center justify-center flex-wrap gap-y-4">
      {chain.map((item, index) => (
        <div key={item.row_id} className="flex items-center">
          <ItemIcon
            item={item}
            isCurrent={item.row_id === currentItemRowId}
          />
          {index < chain.length - 1 && <Arrow label={label} />}
        </div>
      ))}
    </div>
  );
}

export function TransformationChain({
  consumable,
  upgradeChain = [],
  cookingChain = [],
  currentItemRowId,
}: TransformationChainProps) {
  const hasUpgradeChain = upgradeChain.length > 1;
  const hasCookingChain = cookingChain.length > 1;

  // Pas de transformations ? Ne rien afficher
  if (!hasUpgradeChain && !hasCookingChain) {
    return null;
  }

  // Determiner si on doit afficher "Necessite un four"
  const requiresBaking =
    consumable?.requires_baking ||
    cookingChain.some((item) => item.requires_baking);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Transformation</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chaine d'ameliorations */}
        {hasUpgradeChain && (
          <ChainDisplay
            chain={upgradeChain}
            currentItemRowId={currentItemRowId}
            label={TRANSFORMATION_LABELS.upgraded}
          />
        )}

        {/* Chaine de cuisson */}
        {hasCookingChain && (
          <ChainDisplay
            chain={cookingChain}
            currentItemRowId={currentItemRowId}
            label={TRANSFORMATION_LABELS.cooked}
          />
        )}

        {requiresBaking && (
          <div className="text-center">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Necessite un four
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
