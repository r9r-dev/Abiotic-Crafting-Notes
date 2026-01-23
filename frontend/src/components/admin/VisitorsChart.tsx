/**
 * Statistiques des visiteurs.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, UserCheck, RefreshCw, Monitor, Smartphone, Tablet } from "lucide-react";

interface VisitorsChartProps {
  token: string;
  onAuthError: () => void;
}

interface DeviceStat {
  device_type: string;
  count: number;
  percentage: number;
}

interface BrowserStat {
  browser: string;
  count: number;
  percentage: number;
}

interface VisitorAnalytics {
  total_sessions: number;
  unique_visitors: number;
  authenticated_sessions: number;
  returning_visitors: number;
  new_visitors: number;
  avg_session_duration_seconds: number;
  avg_pageviews_per_session: number;
  devices: DeviceStat[];
  browsers: BrowserStat[];
  visitors_by_day: { date: string; value: number }[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const deviceIcons: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const deviceLabels: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablette",
  unknown: "Inconnu",
};

export function VisitorsChart({ token, onAuthError }: VisitorsChartProps) {
  const [data, setData] = useState<VisitorAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/analytics/dashboard/visitors?days=7", {
          headers: { "X-Analytics-Token": token },
        });

        if (response.status === 401) {
          onAuthError();
          return;
        }

        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des données");
        }

        const result = await response.json();
        setData(result);
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
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted/50 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
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

  return (
    <div className="space-y-4">
      {/* KPIs visiteurs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visiteurs uniques</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.unique_visitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.total_sessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visiteurs connectes</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.authenticated_sessions}</div>
            <p className="text-xs text-muted-foreground">
              {data.total_sessions > 0
                ? ((data.authenticated_sessions / data.total_sessions) * 100).toFixed(1)
                : 0}% des sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visiteurs recurrents</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.returning_visitors}</div>
            <p className="text-xs text-muted-foreground">
              {data.new_visitors} nouveaux
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durée moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(data.avg_session_duration_seconds)}</div>
            <p className="text-xs text-muted-foreground">
              {data.avg_pageviews_per_session.toFixed(1)} pages/session
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Visiteurs par jour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visiteurs par jour</CardTitle>
          </CardHeader>
          <CardContent>
            {data.visitors_by_day.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.visitors_by_day}>
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
                    formatter={(value: number) => [value, "Visiteurs"]}
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
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Pas de données disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repartition par device */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appareils</CardTitle>
          </CardHeader>
          <CardContent>
            {data.devices.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.devices as unknown as Record<string, unknown>[]}
                      dataKey="count"
                      nameKey="device_type"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                    >
                      {data.devices.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        deviceLabels[name] || name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data.devices.map((device, deviceIndex) => {
                    const Icon = deviceIcons[device.device_type] || Monitor;
                    return (
                      <div key={device.device_type} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[deviceIndex % COLORS.length] }}
                        />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{deviceLabels[device.device_type] || device.device_type}</span>
                        <span className="font-medium">{device.percentage.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Pas de données disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Navigateurs</CardTitle>
        </CardHeader>
        <CardContent>
          {data.browsers.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-5">
              {data.browsers.map((browser) => (
                <div
                  key={browser.browser}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <span className="font-medium">{browser.browser}</span>
                  <span className="text-muted-foreground">{browser.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-muted-foreground">
              Pas de données disponibles
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default VisitorsChart;
