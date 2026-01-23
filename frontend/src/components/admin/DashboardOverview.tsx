/**
 * Vue d'ensemble du dashboard analytics.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Search, Clock, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardOverviewProps {
  token: string;
  onAuthError: () => void;
}

interface OverviewData {
  today_sessions: number;
  today_pageviews: number;
  today_searches: number;
  today_unique_visitors: number;
  period_sessions: number;
  period_pageviews: number;
  period_searches: number;
  period_unique_visitors: number;
  sessions_change_pct: number;
  pageviews_change_pct: number;
  searches_change_pct: number;
  visitors_change_pct: number;
  total_sessions_all_time: number;
  avg_session_duration_seconds: number;
  avg_pageviews_per_session: number;
  search_success_rate: number;
}

interface TimeSeriesData {
  data: { date: string; value: number }[];
}

export function DashboardOverview({ token, onAuthError }: DashboardOverviewProps) {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [sessionsTimeSeries, setSessionsTimeSeries] = useState<TimeSeriesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, timeseriesRes] = await Promise.all([
          fetch("/api/analytics/dashboard", {
            headers: { "X-Analytics-Token": token },
          }),
          fetch("/api/analytics/dashboard/timeseries?metric=sessions&days=7", {
            headers: { "X-Analytics-Token": token },
          }),
        ]);

        if (overviewRes.status === 401 || timeseriesRes.status === 401) {
          onAuthError();
          return;
        }

        if (!overviewRes.ok || !timeseriesRes.ok) {
          throw new Error("Erreur lors de la récupération des données");
        }

        const [overviewData, timeseriesData] = await Promise.all([
          overviewRes.json(),
          timeseriesRes.json(),
        ]);

        setOverview(overviewData);
        setSessionsTimeSeries(timeseriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !overview) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error || "Impossible de charger les données"}
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatChange = (value: number): { text: string; isPositive: boolean } => {
    const isPositive = value >= 0;
    return {
      text: `${isPositive ? "+" : ""}${value.toFixed(1)}%`,
      isPositive,
    };
  };

  const kpis = [
    {
      title: "Visiteurs uniques",
      today: overview.today_unique_visitors,
      period: overview.period_unique_visitors,
      change: formatChange(overview.visitors_change_pct),
      icon: Users,
    },
    {
      title: "Pages vues",
      today: overview.today_pageviews,
      period: overview.period_pageviews,
      change: formatChange(overview.pageviews_change_pct),
      icon: Eye,
    },
    {
      title: "Recherches",
      today: overview.today_searches,
      period: overview.period_searches,
      change: formatChange(overview.searches_change_pct),
      icon: Search,
    },
    {
      title: "Sessions",
      today: overview.today_sessions,
      period: overview.period_sessions,
      change: formatChange(overview.sessions_change_pct),
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.period.toLocaleString()}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Aujourd'hui: {kpi.today}</span>
                <span className="text-muted-foreground">|</span>
                <span className={`flex items-center gap-0.5 ${kpi.change.isPositive ? "text-green-600" : "text-red-600"}`}>
                  {kpi.change.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {kpi.change.text}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphique sessions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions (7 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsTimeSeries && sessionsTimeSeries.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sessionsTimeSeries.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("fr-FR", { weekday: "short" });
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      });
                    }}
                    formatter={(value: number) => [value, "Sessions"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Pas de données disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats globales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistiques globales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total sessions (all time)</span>
              <span className="font-medium">{overview.total_sessions_all_time.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Durée moyenne de session</span>
              <span className="font-medium">{formatDuration(overview.avg_session_duration_seconds)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pages vues / session</span>
              <span className="font-medium">{overview.avg_pageviews_per_session.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Taux de succes recherche</span>
              <span className="font-medium">{overview.search_success_rate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardOverview;
