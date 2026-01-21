/**
 * Dictionnaire de traduction des tags (dernière partie du tag -> français).
 */
const tagTranslations: Record<string, string> = {
  // Matériaux (Item.Material.*)
  Adhesive: "Adhésif",
  Anomalous: "Anormal",
  Biological: "Biologique",
  Cloth: "Tissu",
  Glass: "Verre",
  Metal: "Métal",
  Plastic: "Plastique",
  Tech: "Technologie",
  Wood: "Bois",

  // Ressources
  WishingShelf: "Noël",

  // Consommables (Item.Consumable.*)
  Dairy: "Produit laitier",
  SoupBowl: "Bol à soupe",
  SoupIngredient: "Ingrédient de soupe",
  Lethal: "Létal",
  Toxic: "Toxique",
  Sweet: "Sucré",

  // Nourriture
  Food: "Nourriture",
  Butcherable: "Découpable",
  Fish: "Poisson",

  // Déployables (Item.Deployable.*)
  Bench: "Établi",
  Cooking: "Cuisine",
  Building: "Construction",
  Container: "Conteneur",
  TrashCan: "Poubelle",
  Plant: "Plante",
  PowerSource: "Source d'énergie",
  Small: "Petit",
  VignettePlaceable: "Décoration",

  // Équipement (Item.Gear.*)
  Head: "Tête",
  KeepHair: "Garde cheveux",
  Headlamp: "Lampe frontale",
  Skeletal: "Squelettique",
  HideAccessory: "Cache accessoire",
  HideLowerBody: "Cache jambes",
  HideTorso: "Cache torse",
  RadioPack: "Radio portable",
  Shield: "Bouclier",
  Heavy: "Lourd",
  Light: "Léger",
  Medium: "Moyen",
  Weightless: "Sans poids",

  // Médical
  Medical: "Médical",
  Bandage: "Pansement",

  // Armes (Item.Weapon.*)
  Weapon: "Arme",
  CanReturn: "Récupérable",
  ExpertGibbing: "Découpe expert",
  HeavyWeapon: "Arme lourde",
  Lightweight: "Légère",
  NoLaserDot: "Sans pointeur",
  ThrowingKnife: "Couteau de lancer",
  Scoped: "Lunette",

  // Grenades
  grenade: "Grenade",
  cookable: "Dégoupillable",

  // Outils (Tool.*)
  Keypad: "Clavier",
  Paint: "Peinture",
  RepairHammer: "Marteau de réparation",
  Screwdriver: "Tournevis",

  // Divers
  DoubleJump: "Double saut",
  Bait: "Appât",
  Rod: "Canne",
  AllowShield: "Bouclier autorisé",
  Ammo: "Munitions",
  BookReadable: "Livre lisible",
  CanLaserRefill: "Rechargeable laser",
  Fertilizer: "Engrais",
  Flashlight: "Lampe torche",
  Pan: "Poêle",
  Pot: "Marmite",
  Throwable: "Lançable",
  Trypanophobia: "Trypanophobie",
  disallowed: "Non autorisé",

  // Tags techniques (cachés ou peu utiles à traduire)
  CriticalNoDelete: "Ne pas supprimer",
  CustomDrop: "Drop personnalisé",
  NoDespawn: "Pas de despawn",
  NoDuctTapeRepair: "Non réparable au scotch",
  NoHandFill: "Pas de remplissage manuel",
  RepairsSelf: "Auto-réparation",
  SkipSalvageWarning: "Pas d'avertissement recyclage",
  SkipSkillCheck: "Pas de test de compétence",
  Enabled: "Activé",
};

/**
 * Parse le JSON des gameplay tags en tableau de strings.
 */
export function parseGameplayTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === "string" && t.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Formate un tag pour l'affichage avec traduction française.
 * Transforme "Item.Material.Cloth" en "Tissu"
 */
export function formatTag(tag: string): string {
  const parts = tag.split(".");
  const lastPart = parts[parts.length - 1];
  return tagTranslations[lastPart] || lastPart;
}

/**
 * Filtre les tags trop generiques (garde ceux avec plus de 2 niveaux).
 */
export function filterGenericTags(tags: string[]): string[] {
  return tags.filter(tag => !tag.startsWith("Item.") || tag.split(".").length > 2);
}
