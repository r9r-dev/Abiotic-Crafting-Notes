import { Link } from "react-router-dom";
import type { Recipe } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useItemLink } from "@/hooks/useItemLink";
import { getIconUrl } from "@/lib/icons";

interface ItemRecipesProps {
  recipes: Recipe[];
}

interface IngredientBadgeProps {
  linkTo: string;
  name: string | null;
  iconPath: string | null;
  quantity: number;
}

function IngredientBadge({
  linkTo,
  name,
  iconPath,
  quantity,
}: IngredientBadgeProps) {
  const iconUrl = getIconUrl(iconPath, 24);

  return (
    <Link
      to={linkTo}
      className="flex items-center gap-2 bg-muted/50 hover:bg-muted rounded-md px-2 py-1.5 transition-colors"
    >
      {iconUrl ? (
        <img src={iconUrl} alt={name || "item"} className="w-6 h-6 object-contain" loading="lazy" width="24" height="24" />
      ) : (
        <div className="w-6 h-6 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
          ?
        </div>
      )}
      <span className="text-sm">{name || "Inconnu"}</span>
      <Badge variant="outline" className="ml-auto text-xs">
        x{quantity}
      </Badge>
    </Link>
  );
}

function RecipeCard({ recipe, getItemLink }: { recipe: Recipe; getItemLink: (rowId: string) => string }) {
  // Déterminer le nom de l'établi/station
  const isCooking = recipe.recipe_tags?.includes("Recipe.Soup");
  const benchName = isCooking
    ? "Cuisine (Marmite)"
    : recipe.bench?.name || recipe.bench?.row_id || "Fabrication";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {benchName}
            {recipe.bench && recipe.bench.tier > 1 && (
              <Badge variant="outline" className="text-xs">
                T{recipe.bench.tier}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {recipe.craft_time > 0 && (
              <span className="text-sm text-muted-foreground">
                {recipe.craft_time.toFixed(1)}s
              </span>
            )}
            {recipe.count_to_create > 1 && (
              <Badge variant="secondary">x{recipe.count_to_create}</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-2">
          {recipe.ingredients.map((ing, idx) => (
            <IngredientBadge
              key={`${ing.item_row_id}-${idx}`}
              linkTo={getItemLink(ing.item_row_id)}
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
  const { getItemLink } = useItemLink();

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
        <RecipeCard key={recipe.row_id} recipe={recipe} getItemLink={getItemLink} />
      ))}
    </div>
  );
}
