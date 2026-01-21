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
