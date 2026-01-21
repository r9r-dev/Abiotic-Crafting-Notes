import { Link } from "react-router-dom";
import type { Recipe } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ItemRecipesProps {
  recipes: Recipe[];
}

interface IngredientBadgeProps {
  itemRowId: string;
  name: string | null;
  iconPath: string | null;
  quantity: number;
}

function IngredientBadge({
  itemRowId,
  name,
  iconPath,
  quantity,
}: IngredientBadgeProps) {
  const iconUrl = iconPath ? `/icons/${iconPath}` : null;

  return (
    <Link
      to={`/item/${itemRowId}`}
      className="flex items-center gap-2 bg-muted/50 hover:bg-muted rounded-md px-2 py-1.5 transition-colors"
    >
      {iconUrl ? (
        <img src={iconUrl} alt={name || itemRowId} className="w-6 h-6 object-contain" />
      ) : (
        <div className="w-6 h-6 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
          ?
        </div>
      )}
      <span className="text-sm">{name || itemRowId}</span>
      <Badge variant="outline" className="ml-auto text-xs">
        x{quantity}
      </Badge>
    </Link>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {recipe.name || recipe.row_id}
          </CardTitle>
          {recipe.count_to_create > 1 && (
            <Badge variant="secondary">x{recipe.count_to_create}</Badge>
          )}
        </div>

        {/* Établi requis */}
        {recipe.bench && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Établi:</span>
            <span className="font-medium text-foreground">
              {recipe.bench.name || recipe.bench.row_id}
            </span>
            {recipe.bench.tier > 1 && (
              <Badge variant="outline" className="text-xs">
                Tier {recipe.bench.tier}
              </Badge>
            )}
          </div>
        )}

        {/* Temps de craft */}
        {recipe.craft_time > 0 && (
          <div className="text-sm text-muted-foreground">
            Temps: {recipe.craft_time.toFixed(1)}s
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="text-sm text-muted-foreground mb-2">Ingredients:</div>
        <div className="grid gap-2">
          {recipe.ingredients.map((ing, idx) => (
            <IngredientBadge
              key={`${ing.item_row_id}-${idx}`}
              itemRowId={ing.item_row_id}
              name={ing.item?.name || null}
              iconPath={ing.item?.icon_path || null}
              quantity={ing.quantity}
            />
          ))}
        </div>

        {/* Condition de déblocage */}
        {!recipe.is_default_unlocked && recipe.unlock_condition && (
          <div className="mt-3 text-xs text-muted-foreground/70">
            Déblocage: {recipe.unlock_condition}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ItemRecipes({ recipes }: ItemRecipesProps) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune recette de fabrication disponible
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.row_id} recipe={recipe} />
      ))}
    </div>
  );
}
