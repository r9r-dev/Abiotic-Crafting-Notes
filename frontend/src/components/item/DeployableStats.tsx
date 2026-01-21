import type { Deployable } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DeployableStatsProps {
  deployable: Deployable;
}

interface StatRowProps {
  label: string;
  value: string | number;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function DeployableStats({ deployable }: DeployableStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Propriétés */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Propriétés
            {deployable.is_small && <Badge variant="secondary">Petit</Badge>}
            {deployable.is_crafting_bench && (
              <Badge variant="default">Établi</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {deployable.hologram_scale !== 1 && (
            <StatRow
              label="Échelle hologramme"
              value={`${(deployable.hologram_scale * 100).toFixed(0)}%`}
            />
          )}
          {deployable.texture_variant_row_id && (
            <StatRow label="Variante texture" value={deployable.texture_variant_row_id} />
          )}
        </CardContent>
      </Card>

      {/* Placement */}
      {deployable.placement_orientations && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Placement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Orientations disponibles
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
