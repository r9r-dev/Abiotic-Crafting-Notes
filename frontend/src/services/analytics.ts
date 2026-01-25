/**
 * Service Analytics pour le tracking des visiteurs.
 *
 * Gere l'initialisation des sessions, le batching des événements,
 * et l'envoi des métriques de performance.
 */

import { getFingerprint } from './fingerprint';

// Types
export type EventType =
  | 'page_view'
  | 'search'
  | 'click'
  | 'scroll'
  | 'item_view'
  | 'npc_view'
  | 'compendium_view'
  | 'dialogue_view'
  | 'gallery_view'
  | 'search_result_click'
  | 'external_link';

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export type PerformanceMetricType =
  | 'lcp'
  | 'fid'
  | 'cls'
  | 'fcp'
  | 'ttfb'
  | 'inp'
  | 'api_latency'
  | 'page_load'
  | 'search_latency';

interface QueuedEvent {
  event_type: EventType;
  page_path?: string;
  referrer?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

interface SessionInitResponse {
  session_id: string;
  is_new: boolean;
  device_type: DeviceType;
}

interface PerformanceMetric {
  metric_type: PerformanceMetricType;
  value: number;
  rating?: string;
  page_path?: string;
}

const API_BASE = '/api/analytics';
const FLUSH_INTERVAL = 5000; // 5 secondes
const MAX_QUEUE_SIZE = 50;

/**
 * Service Analytics singleton.
 */
class AnalyticsService {
  private sessionId: string | null = null;
  private eventQueue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private lastPagePath: string | null = null;
  private searchStartTime: number | null = null;

  /**
   * Initialise la session analytics.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Eviter les initialisations multiples
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    try {
      const fingerprint = getFingerprint();
      const currentPath = window.location.pathname;

      const response = await fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          referrer: document.referrer || null,
          page_path: currentPath,
        }),
      });

      if (!response.ok) {
        throw new Error(`Session init failed: ${response.status}`);
      }

      const data: SessionInitResponse = await response.json();
      this.sessionId = data.session_id;
      // deviceType stocke mais pas utilise actuellement
      void data.device_type;
      this.isInitialized = true;
      this.lastPagePath = currentPath;

      // Demarrer le flush periodique
      this.startFlushTimer();

      // Observer les Web Vitals
      this.observeWebVitals();

    } catch (error) {
      console.warn('[Analytics] Initialization failed:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Demarre le timer de flush periodique.
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, FLUSH_INTERVAL);

    // Flush avant fermeture de page
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Flush lors de changement de visibilite
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  /**
   * Observe les Web Vitals et les envoie.
   */
  private observeWebVitals(): void {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.trackPerformance('lcp', lastEntry.startTime, this.rateWebVital('lcp', lastEntry.startTime));
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // Observer non supporte
      }

      // FCP (First Contentful Paint)
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
          if (fcpEntry) {
            this.trackPerformance('fcp', fcpEntry.startTime, this.rateWebVital('fcp', fcpEntry.startTime));
          }
        });
        fcpObserver.observe({ type: 'paint', buffered: true });
      } catch {
        // Observer non supporte
      }

      // CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-expect-error - hadRecentInput n'est pas standard
            if (!entry.hadRecentInput) {
              // @ts-expect-error - value n'est pas standard
              clsValue += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // Envoyer CLS apres un delai
        setTimeout(() => {
          if (clsValue > 0) {
            this.trackPerformance('cls', clsValue, this.rateWebVital('cls', clsValue));
          }
        }, 5000);
      } catch {
        // Observer non supporte
      }

      // TTFB (Time to First Byte) via Navigation Timing API
      try {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          const navTiming = navEntries[0];
          const ttfb = navTiming.responseStart - navTiming.requestStart;
          if (ttfb > 0) {
            this.trackPerformance('ttfb', ttfb, this.rateWebVital('ttfb', ttfb));
          }
        }
      } catch {
        // Navigation Timing non supporte
      }

      // PAGE_LOAD (temps total de chargement) - attendre que la page soit chargee
      const trackPageLoad = () => {
        try {
          const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navEntries.length > 0) {
            const navTiming = navEntries[0];
            const pageLoad = navTiming.loadEventEnd - navTiming.startTime;
            if (pageLoad > 0) {
              this.trackPerformance('page_load', pageLoad);
            }
          }
        } catch {
          // Navigation Timing non supporte
        }
      };

      if (document.readyState === 'complete') {
        trackPageLoad();
      } else {
        window.addEventListener('load', trackPageLoad, { once: true });
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstEntry = entries[0];
          if (firstEntry) {
            // @ts-expect-error - processingStart n'est pas standard
            const fid = firstEntry.processingStart - firstEntry.startTime;
            this.trackPerformance('fid', fid, this.rateWebVital('fid', fid));
            fidObserver.disconnect();
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch {
        // Observer non supporte
      }

      // INP (Interaction to Next Paint)
      try {
        let maxInp = 0;
        const inpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const duration = entry.duration;
            if (duration > maxInp) {
              maxInp = duration;
            }
          }
        });
        inpObserver.observe({ type: 'event', buffered: true });

        // Envoyer INP apres un delai (capture les interactions initiales)
        setTimeout(() => {
          if (maxInp > 0) {
            this.trackPerformance('inp', maxInp, this.rateWebVital('inp', maxInp));
          }
        }, 10000);
      } catch {
        // Observer non supporte
      }
    }
  }

  /**
   * Détermine le rating d'une métrique Web Vital.
   */
  private rateWebVital(metric: string, value: number): string {
    const thresholds: Record<string, [number, number]> = {
      lcp: [2500, 4000],
      fcp: [1800, 3000],
      cls: [0.1, 0.25],
      fid: [100, 300],
      inp: [200, 500],
      ttfb: [800, 1800],
    };

    const [good, poor] = thresholds[metric] || [0, 0];
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Ajoute un événement à la queue.
   */
  private queueEvent(event: QueuedEvent): void {
    this.eventQueue.push({
      ...event,
      timestamp: new Date().toISOString(),
    });

    // Flush si la queue est pleine
    if (this.eventQueue.length >= MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  /**
   * Envoie les événements en attente.
   */
  async flush(): Promise<void> {
    if (!this.sessionId || this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          events,
        }),
      });

      if (!response.ok) {
        // Remettre les événements dans la queue
        this.eventQueue = [...events, ...this.eventQueue];
      }
    } catch {
      // Remettre les événements dans la queue
      this.eventQueue = [...events, ...this.eventQueue];
    }
  }

  /**
   * Track une page vue.
   */
  trackPageView(path: string, referrer?: string): void {
    if (!this.isInitialized) return;

    // Eviter les doublons
    if (path === this.lastPagePath) return;
    this.lastPagePath = path;

    this.queueEvent({
      event_type: 'page_view',
      page_path: path,
      referrer: referrer || this.lastPagePath || undefined,
    });
  }

  /**
   * Track un clic sur un résultat de recherche.
   */
  trackSearchResultClick(
    query: string,
    rowId: string,
    itemType: string,
    position: number
  ): void {
    if (!this.isInitialized || !this.sessionId) return;

    const timeToSelect = this.searchStartTime
      ? Date.now() - this.searchStartTime
      : null;

    // Envoyer immediatement (important pour les conversions)
    fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.sessionId,
        query,
        results_count: position + 1, // Au moins autant de résultats
        selected_item_row_id: rowId,
        selected_item_type: itemType,
        selected_position: position,
        time_to_select_ms: timeToSelect,
      }),
    }).catch(() => {
      // Ignore errors
    });

    this.searchStartTime = null;
  }

  /**
   * Track une recherche effectuee.
   */
  trackSearch(query: string, resultsCount: number): void {
    if (!this.isInitialized || !this.sessionId) return;

    this.searchStartTime = Date.now();

    // Envoyer immediatement
    fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.sessionId,
        query,
        results_count: resultsCount,
      }),
    }).catch(() => {
      // Ignore errors
    });
  }

  /**
   * Track une vue d'item.
   */
  trackItemView(rowId: string, itemType: 'item' | 'npc' | 'compendium' | 'dialogue'): void {
    if (!this.isInitialized) return;

    const eventTypeMap: Record<string, EventType> = {
      item: 'item_view',
      npc: 'npc_view',
      compendium: 'compendium_view',
      dialogue: 'dialogue_view',
    };

    this.queueEvent({
      event_type: eventTypeMap[itemType] || 'item_view',
      page_path: `/${itemType}/${rowId}`,
      data: { row_id: rowId },
    });
  }

  /**
   * Track un clic generique.
   */
  trackClick(element: string, data?: Record<string, unknown>): void {
    if (!this.isInitialized) return;

    this.queueEvent({
      event_type: 'click',
      page_path: window.location.pathname,
      data: { element, ...data },
    });
  }

  /**
   * Track une métrique de performance.
   */
  trackPerformance(
    metricType: PerformanceMetricType,
    value: number,
    rating?: string
  ): void {
    if (!this.isInitialized || !this.sessionId) return;

    const metrics: PerformanceMetric[] = [{
      metric_type: metricType,
      value,
      rating,
      page_path: window.location.pathname,
    }];

    fetch(`${API_BASE}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.sessionId,
        metrics,
      }),
    }).catch(() => {
      // Ignore errors
    });
  }

  /**
   * Track la latence d'un appel API.
   */
  trackApiLatency(_endpoint: string, durationMs: number): void {
    if (!this.isInitialized) return;

    this.trackPerformance('api_latency', durationMs, undefined);
  }

  /**
   * Obtient l'ID de session courant.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Vérifie si le service est initialisé.
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Arrete le service.
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

// Instance singleton
export const analytics = new AnalyticsService();

// Export par defaut
export default analytics;
