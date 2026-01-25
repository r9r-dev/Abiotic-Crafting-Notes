/**
 * Icon URL utilities for optimized WebP loading.
 *
 * Item Icons: available in sizes original, 80, 56, 48, 40, 32, 24, 20
 * Compendium Images: available in sizes 512 (original), 320, 256, 128, 64, 48
 *
 * This module helps select the appropriate size for pixel-perfect rendering.
 */

// Available icon sizes for items (excluding original)
const ICON_SIZES = [80, 56, 48, 40, 32, 24, 20] as const;

// Available sizes for Compendium images (excluding 512 original)
const COMPENDIUM_SIZES = [320, 256, 128, 64, 48] as const;

/**
 * Get the optimal icon URL for a given display size.
 *
 * @param iconPath - The icon path from the database (e.g., "itemicon_scrap_metal")
 * @param displaySize - The size at which the icon will be displayed (in pixels)
 * @returns The optimized icon URL
 *
 * @example
 * getIconUrl("itemicon_scrap_metal", 32)
 * // Returns: "/icons-webp/itemicon_scrap_metal-32.webp"
 *
 * getIconUrl("itemicon_scrap_metal", 100)
 * // Returns: "/icons-webp/itemicon_scrap_metal.webp" (original)
 */
export function getIconUrl(iconPath: string | null | undefined, displaySize: number): string | null {
  if (!iconPath) return null;

  // Remove .png extension if present
  const baseName = iconPath.replace(/\.png$/i, "");

  // Find the smallest size that's >= displaySize
  // This ensures we don't upscale images
  const optimalSize = ICON_SIZES.find(size => size >= displaySize);

  if (optimalSize) {
    return `/icons-webp/${baseName}-${optimalSize}.webp`;
  }

  // If displaySize is larger than all available sizes, use original
  return `/icons-webp/${baseName}.webp`;
}

/**
 * Get icon URL with PNG fallback for browsers without WebP support.
 * Returns both URLs for use with <picture> element.
 *
 * @param iconPath - The icon path from the database
 * @param displaySize - The size at which the icon will be displayed
 * @returns Object with webp and png URLs
 */
export function getIconUrls(iconPath: string | null | undefined, displaySize: number): { webp: string; png: string } | null {
  if (!iconPath) return null;

  const baseName = iconPath.replace(/\.png$/i, "");
  const optimalSize = ICON_SIZES.find(size => size >= displaySize);

  if (optimalSize) {
    return {
      webp: `/icons-webp/${baseName}-${optimalSize}.webp`,
      png: `/icons/${baseName}.png`,
    };
  }

  return {
    webp: `/icons-webp/${baseName}.webp`,
    png: `/icons/${baseName}.png`,
  };
}

/**
 * Legacy function for backward compatibility.
 * Returns the original PNG URL (not optimized).
 */
export function getLegacyIconUrl(iconPath: string | null | undefined): string | null {
  if (!iconPath) return null;
  return `/icons/${iconPath}`;
}

/**
 * Get the optimal Compendium image URL for a given display size.
 * Compendium images are larger (512x512) and used for NPC/Compendium headers.
 *
 * @param imagePath - The image path from the database (e.g., "T_Compendium_Captain.png")
 * @param displaySize - The size at which the image will be displayed (in pixels)
 * @returns The optimized image URL
 *
 * @example
 * getCompendiumIconUrl("T_Compendium_Captain.png", 320)
 * // Returns: "/compendium-webp/T_Compendium_Captain-320.webp"
 *
 * getCompendiumIconUrl("T_Compendium_Captain.png", 512)
 * // Returns: "/compendium-webp/T_Compendium_Captain.webp" (original)
 */
export function getCompendiumIconUrl(imagePath: string | null | undefined, displaySize: number): string | null {
  if (!imagePath) return null;

  // Remove .png extension if present
  const baseName = imagePath.replace(/\.png$/i, "");

  // Find the smallest size that's >= displaySize
  const optimalSize = COMPENDIUM_SIZES.find(size => size >= displaySize);

  if (optimalSize) {
    return `/compendium-webp/${baseName}-${optimalSize}.webp`;
  }

  // If displaySize is larger than all available sizes, use original (512)
  return `/compendium-webp/${baseName}.webp`;
}

/**
 * Get Compendium image URL with PNG fallback for browsers without WebP support.
 * Returns both URLs for use with <picture> element.
 *
 * @param imagePath - The image path from the database
 * @param displaySize - The size at which the image will be displayed
 * @returns Object with webp and png URLs
 */
export function getCompendiumIconUrls(imagePath: string | null | undefined, displaySize: number): { webp: string; png: string } | null {
  if (!imagePath) return null;

  const baseName = imagePath.replace(/\.png$/i, "");
  const optimalSize = COMPENDIUM_SIZES.find(size => size >= displaySize);

  if (optimalSize) {
    return {
      webp: `/compendium-webp/${baseName}-${optimalSize}.webp`,
      png: `/compendium/${baseName}.png`,
    };
  }

  return {
    webp: `/compendium-webp/${baseName}.webp`,
    png: `/compendium/${baseName}.png`,
  };
}
