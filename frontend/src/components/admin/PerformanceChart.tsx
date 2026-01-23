/**
 * Statistiques de performance.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Gauge, Zap, Clock } from "lucide-react";

interface PerformanceChartProps {
  token: string;
  onAuthError: () => void;
}

interface WebVitalStat {
  metric_type: string;
  avg_value: number;
  p50_value: number;
  p75_value: number;
  p95_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
  sample_count: number;
}

interface ApiMetricStat {
  metric_type: string;
  avg_value: number;
  sample_count: number;
}

interface SlowPage {
  page_path: string;
  avg_load_time_ms: number;
  pageviews: number;
}

interface PerformanceAnalytics {
  web_vitals: WebVitalStat[];
  api_metrics: ApiMetricStat[];
  slowest_pages: SlowPage[];
}

const webVitalLabels: Record<string, { name: string; unit: string; thresholds: [number, number] }> = {
  lcp: { name: "LCP", unit: "ms", thresholds: [2500, 4000] },
  fcp: { name: "FCP", unit: "ms", thresholds: [1800, 3000] },
  cls: { name: "CLS", unit: "", thresholds: [0.1, 0.25] },
  fid: { name: "FID", unit: "ms", thresholds: [100, 300] },
  inp: { name: "INP", unit: "ms", thresholds: [200, 500] },
  ttfb: { name: "TTFB", unit: "ms", thresholds: [800, 1800] },
};

function getRatingColor(rating: string): string {
  switch (rating) {
    case "good":
      return "hsl(var(--chart-2))"; // green
    case "needs-improvement":
      return "hsl(45, 93%, 47%)"; // orange
    case "poor":
      return "hsl(var(--destructive))"; // red
    default:
      return "hsl(var(--muted))";
  }
}

function getValueRating(metricType: string, value: number): string {
  const config = webVitalLabels[metricType];
  if (!config) return "unknown";

  const [good, poor] = config.thresholds;
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export function PerformanceChart({ token, onAuthError }: PerformanceChartProps) {
  const [data, setData] = useState<PerformanceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/analytics/dashboard/performance?days=7", {
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

  const formatValue = (metricType: string, value: number): string => {
    const config = webVitalLabels[metricType];
    if (!config) return value.toFixed(2);

    if (config.unit === "ms") {
      return `${Math.round(value)}ms`;
    }
    return value.toFixed(3);
  };

  return (
    <div className="space-y-4">
      {/* Web Vitals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Core Web Vitals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.web_vitals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {data.web_vitals.map((vital) => {
                const config = webVitalLabels[vital.metric_type];
                const rating = getValueRating(vital.metric_type, vital.avg_value);
                const total = vital.good_count + vital.needs_improvement_count + vital.poor_count;

                return (
                  <Card key={vital.metric_type} className="border-0 shadow-none bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{config?.name || vital.metric_type}</span>
                        <Badge
                          variant={rating === "good" ? "default" : rating === "poor" ? "destructive" : "secondary"}
                        >
                          {rating === "good" ? "Bon" : rating === "poor" ? "Mauvais" : "A ameliorer"}
                        </Badge>
                      </div>

                      <div className="text-3xl font-bold mb-2" style={{ color: getRatingColor(rating) }}>
                        {formatValue(vital.metric_type, vital.avg_value)}
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>P50</span>
                          <span>{formatValue(vital.metric_type, vital.p50_value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P75</span>
                          <span>{formatValue(vital.metric_type, vital.p75_value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P95</span>
                          <span>{formatValue(vital.metric_type, vital.p95_value)}</span>
                        </div>
                      </div>

                      {total > 0 && (
                        <div className="mt-3">
                          <div className="flex h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-green-500"
                              style={{ width: `${(vital.good_count / total) * 100}%` }}
                            />
                            <div
                              className="bg-orange-400"
                              style={{ width: `${(vital.needs_improvement_count / total) * 100}%` }}
                            />
                            <div
                              className="bg-red-500"
                              style={{ width: `${(vital.poor_count / total) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {vital.sample_count} mesures
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Pas de données Web Vitals disponibles
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* API Latency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Latence API
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.api_metrics.length > 0 ? (
              <div className="space-y-4">
                {data.api_metrics.map((metric) => (
                  <div key={metric.metric_type} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">Temps de reponse moyen</div>
                      <div className="text-sm text-muted-foreground">
                        {metric.sample_count} requetes
                      </div>
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(metric.avg_value)}ms
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[100px] flex items-center justify-center text-muted-foreground">
                Pas de données API disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pages les plus lentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pages les plus lentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.slowest_pages.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={data.slowest_pages.slice(0, 5)}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} unit="ms" />
                  <YAxis
                    dataKey="page_path"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={95}
                    tickFormatter={(value) => {
                      // Afficher seulement le dernier segment du path
                      const parts = value.split("/").filter(Boolean);
                      const lastPart = parts[parts.length - 1] || "/";
                      return lastPart.length > 15 ? lastPart.slice(0, 15) + "..." : lastPart;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}ms`, "Temps moyen"]}
                    labelFormatter={(value) => value}
                  />
                  <Bar dataKey="avg_load_time_ms" radius={[0, 4, 4, 0]}>
                    {data.slowest_pages.slice(0, 5).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.avg_load_time_ms > 3000
                            ? "hsl(var(--destructive))"
                            : entry.avg_load_time_ms > 1500
                            ? "hsl(45, 93%, 47%)"
                            : "hsl(var(--primary))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Pas de données disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PerformanceChart;
