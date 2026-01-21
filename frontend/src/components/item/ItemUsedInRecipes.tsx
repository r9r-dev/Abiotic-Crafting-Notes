import { Link } from "react-router-dom";
import type { UsedInRecipe } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ItemUsedInRecipesProps {
  usedInRecipes: UsedInRecipe[];
}

export function ItemUsedInRecipes({ usedInRecipes }: ItemUsedInRecipesProps) {
  if (usedInRecipes.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {usedInRecipes.map((recipe) => {
        const outputIconUrl = recipe.output_item?.icon_path
          ? `/icons/${recipe.output_item.icon_path}`
          : null;

        return (
          <Card key={recipe.row_id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Link
                  to={`/item/${recipe.output_item_row_id}`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {outputIconUrl ? (
                    <img
                      src={outputIconUrl}
                      alt={recipe.output_item?.name || recipe.output_item_row_id}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted-foreground/20 rounded flex items-center justify-center text-xs">
                      ?
                    </div>
                  )}
                  <CardTitle className="text-base">
                    {recipe.output_item?.name || recipe.output_item_row_id}
                  </CardTitle>
                </Link>
                <Badge variant="outline" className="ml-auto text-xs">
                  x{recipe.quantity}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground">
                {recipe.bench ? (
                  <span>
                    {recipe.bench.name || recipe.bench.row_id}
                    {recipe.bench.tier > 1 && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Tier {recipe.bench.tier}
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span>Fabrication</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
