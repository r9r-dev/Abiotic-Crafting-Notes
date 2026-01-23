import type { CompendiumRecipeUnlock } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CompendiumRecipeUnlocksProps {
  recipeUnlocks: CompendiumRecipeUnlock[];
}

export function CompendiumRecipeUnlocks({ recipeUnlocks }: CompendiumRecipeUnlocksProps) {
  if (recipeUnlocks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recettes debloquees</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {recipeUnlocks.map((unlock, index) => (
            <Badge
              key={index}
              variant="outline"
              className={`${
                unlock.from_kill_section
                  ? "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
                  : "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
              }`}
            >
              {unlock.recipe_name || unlock.recipe_row_id}
              {unlock.from_kill_section && " (elimination)"}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
