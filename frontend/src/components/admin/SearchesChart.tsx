/**
 * Statistiques des recherches.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Search, AlertCircle, CheckCircle, Monitor, Smartphone, Tablet, Clock } from "lucide-react";

interface SearchesChartProps {
  token: string;
  onAuthError: () => void;
}

interface TopSearch {
  query: string;
  count: number;
  results_avg: number;
  selection_rate: number;
}

interface ZeroResultSearch {
  query: string;
  count: number;
  last_searched: string;
}

interface RecentSearch {
  query: string;
  query_normalized: string | null;
  results_count: number;
  selected_item_row_id: string | null;
  selected_item_type: string | null;
  selected_position: number | null;
  time_to_select_ms: number | null;
  created_at: string;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  language: string | null;
}

interface SearchAnalytics {
  total_searches: number;
  searches_with_results: number;
  searches_with_selection: number;
  avg_results_count: number;
  avg_time_to_select_ms: number | null;
  search_success_rate: number;
  zero_results_rate: number;
  top_searches: TopSearch[];
  zero_result_searches: ZeroResultSearch[];
  recent_searches: RecentSearch[];
}

export function SearchesChart({ token, onAuthError }: SearchesChartProps) {
  const [data, setData] = useState<SearchAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/analytics/dashboard/searches?days=7", {
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

  return (
    <div className="space-y-4">
      {/* KPIs recherches */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total recherches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_searches.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de succès</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.search_success_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {data.searches_with_selection} sélections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sans résultats</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.zero_results_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {data.total_searches - data.searches_with_results} recherches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Résultats moyens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avg_results_count.toFixed(1)}</div>
            {data.avg_time_to_select_ms && (
              <p className="text-xs text-muted-foreground">
                Sélection en {(data.avg_time_to_select_ms / 1000).toFixed(1)}s
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top recherches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top recherches</CardTitle>
          </CardHeader>
          <CardContent>
            {data.top_searches.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.top_searches.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="query"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={75}
                    tickFormatter={(value) =>
                      value.length > 12 ? value.slice(0, 12) + "..." : value
                    }
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "count") return [value, "Recherches"];
                      return [value, name];
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Pas de données disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recherches sans résultat */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recherches sans résultat</CardTitle>
          </CardHeader>
          <CardContent>
            {data.zero_result_searches.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.zero_result_searches.map((search, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{search.query}</p>
                      <p className="text-xs text-muted-foreground">
                        {search.count} recherche{search.count > 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">
                      {new Date(search.last_searched).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Aucune recherche sans résultat
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 50 dernières recherches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            50 dernières recherches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_searches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Date</th>
                    <th className="text-left py-2 px-2 font-medium">Mot clé</th>
                    <th className="text-left py-2 px-2 font-medium">Normalisé</th>
                    <th className="text-center py-2 px-2 font-medium">Résultats</th>
                    <th className="text-left py-2 px-2 font-medium">Sélection</th>
                    <th className="text-center py-2 px-2 font-medium">Position</th>
                    <th className="text-right py-2 px-2 font-medium">Temps</th>
                    <th className="text-center py-2 px-2 font-medium">Appareil</th>
                    <th className="text-left py-2 px-2 font-medium">Navigateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recent_searches.map((search, index) => {
                    const date = new Date(search.created_at);
                    const DeviceIcon = search.device_type === "mobile" ? Smartphone
                      : search.device_type === "tablet" ? Tablet
                      : Monitor;

                    return (
                      <tr key={index} className="hover:bg-muted/30">
                        <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                          {date.toLocaleDateString("fr-FR")}
                          <span className="text-xs ml-1">
                            {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-medium max-w-[150px] truncate" title={search.query}>
                          {search.query}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground max-w-[120px] truncate" title={search.query_normalized || ""}>
                          {search.query_normalized || "-"}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={search.results_count === 0 ? "text-orange-500" : ""}>
                            {search.results_count}
                          </span>
                        </td>
                        <td className="py-2 px-2 max-w-[150px] truncate" title={search.selected_item_row_id || ""}>
                          {search.selected_item_row_id ? (
                            <span className="text-green-600">
                              {search.selected_item_row_id}
                              {search.selected_item_type && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({search.selected_item_type})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {search.selected_position !== null ? (
                            <span className="font-mono">{search.selected_position + 1}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {search.time_to_select_ms !== null ? (
                            <span className="font-mono text-xs">
                              {(search.time_to_select_ms / 1000).toFixed(1)}s
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <DeviceIcon className="h-4 w-4 mx-auto text-muted-foreground" />
                        </td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">
                          {search.browser || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Aucune recherche récente
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SearchesChart;
