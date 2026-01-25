import type { CompendiumSection } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CompendiumSectionsProps {
  sections: CompendiumSection[];
}

const unlockTypeLabels: Record<string, string> = {
  Exploration: "Exploration",
  Email: "Email",
  NarrativeNPC: "Interaction PNJ",
  Kill: "Elimination",
};

const unlockTypeColors: Record<string, string> = {
  Exploration: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  Email: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  NarrativeNPC: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
  Kill: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
};

export function CompendiumSections({ sections }: CompendiumSectionsProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {sections.length > 1 ? `Section ${index + 1}` : "Description"}
              </CardTitle>
              <Badge
                variant="outline"
                className={unlockTypeColors[section.unlock_type] || ""}
              >
                {unlockTypeLabels[section.unlock_type] || section.unlock_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {section.image_path && index > 0 && (
              <div className="mb-4">
                <img
                  src={`/compendium/${section.image_path}`}
                  alt=""
                  className="max-w-full h-auto rounded-lg border" loading="lazy"
                />
              </div>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {section.text.split("\n").map((paragraph, pIndex) => (
                <p key={pIndex} className={pIndex > 0 ? "mt-3" : ""}>
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
