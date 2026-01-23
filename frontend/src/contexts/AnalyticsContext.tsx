/**
 * Context Analytics pour le tracking automatique.
 *
 * Initialise le service analytics et track automatiquement
 * les changements de page via React Router.
 */

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '@/services/analytics';

interface AnalyticsContextType {
  trackSearch: (query: string, resultsCount: number) => void;
  trackSearchResultClick: (query: string, rowId: string, itemType: string, position: number) => void;
  trackItemView: (rowId: string, itemType: 'item' | 'npc' | 'compendium' | 'dialogue') => void;
  trackClick: (element: string, data?: Record<string, unknown>) => void;
  trackApiLatency: (endpoint: string, durationMs: number) => void;
  isReady: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation();
  const isInitialized = useRef(false);
  const prevPathname = useRef<string | null>(null);

  // Initialiser le service analytics
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      analytics.init();
    }

    // Cleanup
    return () => {
      analytics.stop();
    };
  }, []);

  // Tracker les changements de page
  useEffect(() => {
    // Eviter le premier render (deja track dans init)
    if (prevPathname.current === null) {
      prevPathname.current = location.pathname;
      return;
    }

    // Tracker seulement si le chemin a change
    if (location.pathname !== prevPathname.current) {
      analytics.trackPageView(location.pathname, prevPathname.current || undefined);
      prevPathname.current = location.pathname;
    }
  }, [location.pathname]);

  const contextValue: AnalyticsContextType = {
    trackSearch: (query, resultsCount) => {
      analytics.trackSearch(query, resultsCount);
    },
    trackSearchResultClick: (query, rowId, itemType, position) => {
      analytics.trackSearchResultClick(query, rowId, itemType, position);
    },
    trackItemView: (rowId, itemType) => {
      analytics.trackItemView(rowId, itemType);
    },
    trackClick: (element, data) => {
      analytics.trackClick(element, data);
    },
    trackApiLatency: (endpoint, durationMs) => {
      analytics.trackApiLatency(endpoint, durationMs);
    },
    isReady: analytics.isReady(),
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

/**
 * Hook pour acceder au contexte analytics.
 */
export function useAnalytics(): AnalyticsContextType {
  const context = useContext(AnalyticsContext);

  if (!context) {
    // Retourner des fonctions no-op si le contexte n'est pas disponible
    return {
      trackSearch: () => {},
      trackSearchResultClick: () => {},
      trackItemView: () => {},
      trackClick: () => {},
      trackApiLatency: () => {},
      isReady: false,
    };
  }

  return context;
}

export default AnalyticsContext;
