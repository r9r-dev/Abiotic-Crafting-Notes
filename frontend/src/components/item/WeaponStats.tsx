import { Link } from "react-router-dom";
import { Check, X, Droplets } from "lucide-react";
import type { Weapon } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getSecondaryAttackTypeLabel,
  getDamageTypeLabel,
} from "@/lib/enumLabels";
import { useItemLink } from "@/hooks/useItemLink";
import { getIconUrl } from "@/lib/icons";

function formatNumber(value: number, decimals: number): string {
  return Number(value.toFixed(decimals)).toString();
}

interface WeaponStatsProps {
  weapon: Weapon;
}

interface StatRowProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: "positive" | "negative" | "neutral";
}

function StatRow({ label, value, unit, highlight = "neutral" }: StatRowProps) {
  const valueClasses = {
    positive: "text-green-500",
    negative: "text-red-500",
    neutral: "",
  };

  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClasses[highlight]}`}>
        {value}
        {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

export function WeaponStats({ weapon }: WeaponStatsProps) {
  const { getItemLink } = useItemLink();
  const dps =
    weapon.time_between_shots > 0
      ? weapon.damage_per_hit / weapon.time_between_shots
      : weapon.damage_per_hit;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Degats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Dégâts
            {weapon.is_melee && <Badge variant="secondary">Mêlée</Badge>}
            {weapon.damage_type && (
              <Badge variant="outline">{getDamageTypeLabel(weapon.damage_type)}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatRow
            label="Dégâts par coup"
            value={formatNumber(weapon.damage_per_hit, 1)}
          />
          {weapon.time_between_shots > 0 && (
            <>
              <StatRow
                label="Délai"
                value={formatNumber(weapon.time_between_shots, 2)}
                unit="s"
              />
              <StatRow label="DPS" value={formatNumber(dps, 1)} highlight="positive" />
            </>
          )}
          {weapon.burst_fire_count > 1 && (
            <StatRow label="Rafale" value={weapon.burst_fire_count} unit="tirs" />
          )}
          {weapon.pellet_count > 1 && (
            <StatRow label="Projectiles" value={weapon.pellet_count} />
          )}
        </CardContent>
      </Card>

      {/* Munitions */}
      {weapon.require_ammo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Munitions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <StatRow label="Chargeur" value={weapon.magazine_size} unit="balles" />
            {weapon.ammo_item ? (
              <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">Type</span>
                <Link
                  to={getItemLink(weapon.ammo_item.row_id)}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {weapon.ammo_item.icon_path && (
                    <img
                      src={getIconUrl(weapon.ammo_item.icon_path, 20) || ""}
                      alt={weapon.ammo_item.name || weapon.ammo_item.row_id}
                      className="w-5 h-5 object-contain" loading="lazy" width="20" height="20"
                    />
                  )}
                  <span className="font-medium">
                    {weapon.ammo_item.name || weapon.ammo_type_row_id}
                  </span>
                </Link>
              </div>
            ) : weapon.ammo_type_row_id ? (
              <StatRow label="Type" value={weapon.ammo_type_row_id} />
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Precision */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Précision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {(weapon.bullet_spread_min > 0 || weapon.bullet_spread_max > 0) && (
            <StatRow
              label="Dispersion"
              value={`${formatNumber(weapon.bullet_spread_min, 1)} - ${formatNumber(weapon.bullet_spread_max, 1)}`}
            />
          )}
          {weapon.recoil_amount > 0 && (
            <StatRow
              label="Recul"
              value={formatNumber(weapon.recoil_amount, 2)}
              highlight={weapon.recoil_amount > 5 ? "negative" : "neutral"}
            />
          )}
          {weapon.max_aim_correction > 0 && (
            <StatRow label="Correction visée" value={formatNumber(weapon.max_aim_correction, 1)} />
          )}
          {weapon.maximum_hitscan_range > 0 && (
            <StatRow label="Portée max" value={Math.round(weapon.maximum_hitscan_range)} unit="m" />
          )}
        </CardContent>
      </Card>

      {/* Son */}
      {(weapon.loudness_primary > 0 || weapon.loudness_secondary > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Son</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {weapon.loudness_primary > 0 && (
              <StatRow
                label="Bruit principal"
                value={formatNumber(weapon.loudness_primary, 0)}
                highlight={weapon.loudness_primary > 50 ? "negative" : "neutral"}
              />
            )}
            {weapon.loudness_secondary > 0 && (
              <StatRow
                label="Bruit secondaire"
                value={formatNumber(weapon.loudness_secondary, 0)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Modes speciaux */}
      {(weapon.secondary_attack_type || weapon.underwater_state) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Modes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {weapon.secondary_attack_type && (
              <StatRow
                label="Attaque secondaire"
                value={getSecondaryAttackTypeLabel(weapon.secondary_attack_type) || weapon.secondary_attack_type}
              />
            )}
            {weapon.underwater_state && (
              <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">Sous l'eau</span>
                <span className="font-medium flex items-center gap-1">
                  {weapon.underwater_state === "E_UnderwaterUsage::NewEnumerator0" && (
                    <><Check className="w-4 h-4 text-green-500" /> Utilisable</>
                  )}
                  {weapon.underwater_state === "E_UnderwaterUsage::NewEnumerator1" && (
                    <><X className="w-4 h-4 text-red-500" /> Non utilisable</>
                  )}
                  {weapon.underwater_state === "E_UnderwaterUsage::NewEnumerator2" && (
                    <><Droplets className="w-4 h-4 text-blue-500" /> Uniquement</>
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
