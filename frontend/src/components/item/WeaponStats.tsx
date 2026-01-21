import { Link } from "react-router-dom";
import type { Weapon } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getSecondaryAttackTypeLabel,
  getUnderwaterStateLabel,
  getDamageTypeLabel,
} from "@/lib/enumLabels";

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
            Degats
            {weapon.is_melee && <Badge variant="secondary">Melee</Badge>}
            {weapon.damage_type && (
              <Badge variant="outline">{getDamageTypeLabel(weapon.damage_type)}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatRow
            label="Degats par coup"
            value={weapon.damage_per_hit.toFixed(1)}
          />
          {weapon.time_between_shots > 0 && (
            <>
              <StatRow
                label="Temps entre tirs"
                value={weapon.time_between_shots.toFixed(2)}
                unit="s"
              />
              <StatRow label="DPS" value={dps.toFixed(1)} highlight="positive" />
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
                  to={`/item/${weapon.ammo_item.row_id}`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {weapon.ammo_item.icon_path && (
                    <img
                      src={`/icons/${weapon.ammo_item.icon_path}`}
                      alt={weapon.ammo_item.name || weapon.ammo_item.row_id}
                      className="w-5 h-5 object-contain"
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
          <CardTitle className="text-lg">Precision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {(weapon.bullet_spread_min > 0 || weapon.bullet_spread_max > 0) && (
            <StatRow
              label="Dispersion"
              value={`${weapon.bullet_spread_min.toFixed(1)} - ${weapon.bullet_spread_max.toFixed(1)}`}
            />
          )}
          {weapon.recoil_amount > 0 && (
            <StatRow
              label="Recul"
              value={weapon.recoil_amount.toFixed(2)}
              highlight={weapon.recoil_amount > 5 ? "negative" : "neutral"}
            />
          )}
          {weapon.max_aim_correction > 0 && (
            <StatRow label="Correction visee" value={weapon.max_aim_correction.toFixed(1)} />
          )}
          {weapon.maximum_hitscan_range > 0 && (
            <StatRow label="Portee max" value={Math.round(weapon.maximum_hitscan_range)} unit="m" />
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
                value={weapon.loudness_primary.toFixed(0)}
                highlight={weapon.loudness_primary > 50 ? "negative" : "neutral"}
              />
            )}
            {weapon.loudness_secondary > 0 && (
              <StatRow
                label="Bruit secondaire"
                value={weapon.loudness_secondary.toFixed(0)}
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
              <StatRow
                label="Sous l'eau"
                value={getUnderwaterStateLabel(weapon.underwater_state) || weapon.underwater_state}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
