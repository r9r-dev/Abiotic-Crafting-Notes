/**
 * Icon URL utilities for optimized WebP loading.
 *
 * Icons are available in multiple sizes: original, 80, 56, 48, 40, 32, 24, 20
 * This module helps select the appropriate size for pixel-perfect rendering.
 */

// Available icon sizes (excluding original)
const ICON_SIZES = [80, 56, 48, 40, 32, 24, 20] as const;

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
