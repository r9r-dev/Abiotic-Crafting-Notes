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
import { Search, AlertCircle, CheckCircle } from "lucide-react";

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
            <CardTitle className="text-sm font-medium">Taux de succes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.search_success_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {data.searches_with_selection} selections
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
                Selection en {(data.avg_time_to_select_ms / 1000).toFixed(1)}s
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
    </div>
  );
}

export default SearchesChart;
