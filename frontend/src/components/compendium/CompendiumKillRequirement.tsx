import type { CompendiumEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CompendiumKillRequirementProps {
  entry: CompendiumEntry;
}

export function CompendiumKillRequirement({ entry }: CompendiumKillRequirementProps) {
  if (!entry.has_kill_requirement) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Connaissance avancee</CardTitle>
          <Badge
            variant="outline"
            className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
          >
            {entry.kill_required_count} eliminations requises
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {entry.kill_section_image_path && (
          <div className="mb-4">
            <img
              src={`/compendium/${entry.kill_section_image_path}`}
              alt=""
              className="max-w-full h-auto rounded-lg border"
            />
          </div>
        )}
        {entry.kill_section_text && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {entry.kill_section_text.split("\n").map((paragraph, index) => (
              <p key={index} className={index > 0 ? "mt-3" : ""}>
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
