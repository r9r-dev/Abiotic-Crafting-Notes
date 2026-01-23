/**
 * Page d'administration Analytics.
 *
 * Dashboard protégé par mot de passe pour visualiser
 * les statistiques d'utilisation du site.
 */

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { SearchesChart } from "@/components/admin/SearchesChart";
import { VisitorsChart } from "@/components/admin/VisitorsChart";
import { PerformanceChart } from "@/components/admin/PerformanceChart";

const TOKEN_KEY = "analytics_admin_token";

export function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier si un token existe en session
  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (newToken: string) => {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  // Callback pour gerer les erreurs d'authentification (401)
  const handleAuthError = useCallback(() => {
    handleLogout();
  }, [handleLogout]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!token) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Deconnexion
        </button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="searches">Recherches</TabsTrigger>
          <TabsTrigger value="visitors">Visiteurs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <DashboardOverview token={token} onAuthError={handleAuthError} />
        </TabsContent>

        <TabsContent value="searches" className="space-y-4">
          <SearchesChart token={token} onAuthError={handleAuthError} />
        </TabsContent>

        <TabsContent value="visitors" className="space-y-4">
          <VisitorsChart token={token} onAuthError={handleAuthError} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceChart token={token} onAuthError={handleAuthError} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminPage;
