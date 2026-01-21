/**
 * Mappings pour convertir les valeurs d'enum Unreal Engine en texte lisible.
 */

const secondaryAttackTypeLabels: Record<string, string> = {
  "E_SecondaryAttackTypes::NewEnumerator0": "Aucune",
  "E_SecondaryAttackTypes::NewEnumerator1": "Frappe lourde",
  "E_SecondaryAttackTypes::NewEnumerator2": "Blocage",
  "E_SecondaryAttackTypes::NewEnumerator3": "Visée",
  "E_SecondaryAttackTypes::NewEnumerator4": "Lancer",
  "E_SecondaryAttackTypes::NewEnumerator5": "Estoc",
};

const underwaterStateLabels: Record<string, string> = {
  "E_UnderwaterUsage::NewEnumerator0": "Utilisable",
  "E_UnderwaterUsage::NewEnumerator1": "Non utilisable",
  "E_UnderwaterUsage::NewEnumerator2": "Uniquement sous l'eau",
};

const damageTypeLabels: Record<string, string> = {
  "Abiotic_DamageType_ParentBP_C": "Standard",
  "DamageType_Acid_C": "Acide",
  "DamageType_Blunt_C": "Contondant",
  "DamageType_Blunt_Flail_C": "Contondant (fléau)",
  "DamageType_Blunt_HEAVY_C": "Contondant lourd",
  "DamageType_Blunt_RepairTool_C": "Contondant (outil)",
  "DamageType_Blunt_ShieldBash_C": "Contondant (bouclier)",
  "DamageType_Bullet_Large_C": "Balle (gros calibre)",
  "DamageType_Bullet_ShotgunPellet_C": "Balle (chevrotine)",
  "DamageType_Bullet_Small_C": "Balle (petit calibre)",
  "DamageType_Bullet_Sniper_C": "Balle (sniper)",
  "DamageType_Electric_C": "Électrique",
  "DamageType_Explosive_C": "Explosif",
  "DamageType_Fire_C": "Feu",
  "DamageType_Fire_Flamethrower_C": "Feu (lance-flammes)",
  "DamageType_Fire_Plasma_C": "Plasma",
  "DamageType_Laser_C": "Laser",
  "DamageType_Laser_Gib_Hardlight_C": "Laser (lumière solide)",
  "DamageType_Laser_Gib_Katana_C": "Laser (katana)",
  "DamageType_Psychic_Holy_C": "Psychique (sacré)",
  "DamageType_Sharp_C": "Tranchant",
  "DamageType_Sharp_ConstructGauntlet_C": "Tranchant (gantelet)",
  "DamageType_Sharp_Crossbow_C": "Tranchant (arbalète)",
  "DamageType_Sharp_GrinderDisc_C": "Tranchant (meuleuse)",
  "DamageType_Sharp_HEAVY_C": "Tranchant lourd",
  "DamageType_Sharp_HEAVY_Crowbar20_C": "Tranchant lourd (pied-de-biche)",
  "DamageType_Sharp_HandDrill_C": "Tranchant (chignole)",
  "DamageType_Sharp_PowerDrill_C": "Tranchant (perceuse)",
  "DamageType_Sharp_Screwdriver_C": "Tranchant (tournevis)",
};

/**
 * Convertit une valeur d'enum en texte lisible.
 * Si la valeur n'est pas dans le mapping, retourne la valeur nettoyée.
 */
function formatEnumValue(value: string): string {
  // Extraire la partie après :: si présente
  const parts = value.split("::");
  if (parts.length === 2) {
    // Convertir NewEnumeratorX ou le nom en texte lisible
    const enumValue = parts[1];
    if (enumValue.startsWith("NewEnumerator")) {
      return value; // Retourner tel quel, sera mappé par la fonction spécifique
    }
    // Convertir CamelCase en texte avec espaces
    return enumValue.replace(/([A-Z])/g, " $1").trim();
  }
  return value;
}

export function getSecondaryAttackTypeLabel(value: string | null): string | null {
  if (!value) return null;
  return secondaryAttackTypeLabels[value] ?? formatEnumValue(value);
}

export function getUnderwaterStateLabel(value: string | null): string | null {
  if (!value) return null;
  return underwaterStateLabels[value] ?? formatEnumValue(value);
}

export function getDamageTypeLabel(value: string | null): string | null {
  if (!value) return null;
  return damageTypeLabels[value] ?? formatEnumValue(value);
}
