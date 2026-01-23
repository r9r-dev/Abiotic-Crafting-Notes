/**
 * Service de generation de fingerprint navigateur.
 *
 * Collecte des informations non sensibles sur le navigateur
 * pour identifier les visiteurs recurrents de maniere anonyme.
 */

export interface FingerprintData {
  user_agent: string;
  screen_width: number;
  screen_height: number;
  language: string;
  timezone: string;
  color_depth: number | null;
  device_memory: number | null;
  hardware_concurrency: number | null;
  platform: string | null;
  canvas_hash: string | null;
  webgl_hash: string | null;
}

/**
 * Génère un hash simple à partir d'une chaîne.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Génère un hash du canvas pour l'identification.
 */
function getCanvasHash(): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Dessiner du texte avec des parametres specifiques
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Abiotic Science', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Abiotic Science', 4, 17);

    // Obtenir les données et générer un hash
    const dataUrl = canvas.toDataURL();
    return simpleHash(dataUrl);
  } catch {
    return null;
  }
}

/**
 * Génère un hash WebGL pour l'identification.
 */
function getWebGLHash(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl || !(gl instanceof WebGLRenderingContext)) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

    return simpleHash(`${vendor}|${renderer}`);
  } catch {
    return null;
  }
}

/**
 * Collecte les composants du fingerprint navigateur.
 */
export function collectFingerprint(): FingerprintData {
  // Informations de base toujours disponibles
  const fingerprint: FingerprintData = {
    user_agent: navigator.userAgent,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    color_depth: window.screen.colorDepth || null,
    device_memory: null,
    hardware_concurrency: null,
    platform: null,
    canvas_hash: null,
    webgl_hash: null,
  };

  // Informations optionnelles (peuvent ne pas etre disponibles)
  try {
    // @ts-expect-error - deviceMemory n'est pas standard
    fingerprint.device_memory = navigator.deviceMemory || null;
  } catch {
    // Ignore
  }

  try {
    fingerprint.hardware_concurrency = navigator.hardwareConcurrency || null;
  } catch {
    // Ignore
  }

  try {
    fingerprint.platform = navigator.platform || null;
  } catch {
    // Ignore
  }

  // Fingerprints canvas et WebGL (plus stables)
  fingerprint.canvas_hash = getCanvasHash();
  fingerprint.webgl_hash = getWebGLHash();

  return fingerprint;
}

/**
 * Cache du fingerprint pour eviter de le recalculer.
 */
let cachedFingerprint: FingerprintData | null = null;

/**
 * Obtient le fingerprint (avec cache).
 */
export function getFingerprint(): FingerprintData {
  if (!cachedFingerprint) {
    cachedFingerprint = collectFingerprint();
  }
  return cachedFingerprint;
}

/**
 * Efface le cache du fingerprint.
 */
export function clearFingerprintCache(): void {
  cachedFingerprint = null;
}
