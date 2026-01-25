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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Gauge, Zap, Clock, Info, TrendingUp, Monitor, Smartphone, Tablet } from "lucide-react";

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

interface WebVitalByDay {
  date: string;
  lcp?: number;
  fcp?: number;
  ttfb?: number;
}

interface DeviceMetrics {
  device_type: string;
  metrics: Record<string, { avg_value: number; sample_count: number }>;
}

interface DistributionStat {
  metric_type: string;
  good_pct: number;
  needs_improvement_pct: number;
  poor_pct: number;
  total: number;
}

interface PerformanceAnalytics {
  web_vitals: WebVitalStat[];
  api_metrics: ApiMetricStat[];
  slowest_pages: SlowPage[];
  web_vitals_by_day?: WebVitalByDay[];
  web_vitals_by_device?: DeviceMetrics[];
  distribution?: DistributionStat[];
}

const webVitalLabels: Record<string, {
  name: string;
  fullName: string;
  unit: string;
  thresholds: [number, number];
  description: string;
}> = {
  lcp: {
    name: "LCP",
    fullName: "Largest Contentful Paint",
    unit: "ms",
    thresholds: [2500, 4000],
    description: "Temps de chargement du plus grand élément visible (image, texte). Mesure la vitesse de chargement perçue."
  },
  fcp: {
    name: "FCP",
    fullName: "First Contentful Paint",
    unit: "ms",
    thresholds: [1800, 3000],
    description: "Temps avant l'affichage du premier contenu (texte, image). Indique quand la page commence à se charger."
  },
  cls: {
    name: "CLS",
    fullName: "Cumulative Layout Shift",
    unit: "",
    thresholds: [0.1, 0.25],
    description: "Stabilité visuelle de la page. Mesure les décalages inattendus d'éléments pendant le chargement."
  },
  fid: {
    name: "FID",
    fullName: "First Input Delay",
    unit: "ms",
    thresholds: [100, 300],
    description: "Délai avant la première interaction. Mesure la réactivité lors du premier clic ou appui."
  },
  inp: {
    name: "INP",
    fullName: "Interaction to Next Paint",
    unit: "ms",
    thresholds: [200, 500],
    description: "Latence globale des interactions. Mesure la réactivité de toutes les interactions utilisateur."
  },
  ttfb: {
    name: "TTFB",
    fullName: "Time to First Byte",
    unit: "ms",
    thresholds: [800, 1800],
    description: "Temps de réponse du serveur. Mesure le délai avant réception du premier octet de données."
  },
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

/**
 * Calcule un score de performance global (0-100) basé sur les Web Vitals.
 * Inspiré de la méthodologie Lighthouse.
 */
function calculatePerformanceScore(webVitals: WebVitalStat[]): number {
  // Poids des métriques (basé sur Lighthouse)
  const weights: Record<string, number> = {
    lcp: 0.25,
    fid: 0.10,
    inp: 0.15,
    cls: 0.25,
    fcp: 0.10,
    ttfb: 0.15,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const vital of webVitals) {
    const config = webVitalLabels[vital.metric_type];
    const weight = weights[vital.metric_type] || 0;
    if (!config || weight === 0) continue;

    const [good, poor] = config.thresholds;
    let score: number;

    // Score linéaire : 100 si <= good, 50 entre good et poor, 0 si > poor
    if (vital.avg_value <= good) {
      score = 90 + (10 * (1 - vital.avg_value / good));
    } else if (vital.avg_value <= poor) {
      const range = poor - good;
      const position = (vital.avg_value - good) / range;
      score = 90 - (position * 40); // 90 à 50
    } else {
      const overPoor = vital.avg_value - poor;
      const multiplier = poor; // Référence
      score = Math.max(0, 50 - (overPoor / multiplier) * 50);
    }

    totalScore += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight * (1 / totalWeight) * totalWeight) : 0;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "hsl(var(--chart-2))"; // green
  if (score >= 50) return "hsl(45, 93%, 47%)"; // orange
  return "hsl(var(--destructive))"; // red
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 50) return "À améliorer";
  return "Faible";
}

const deviceIcons: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
};

const deviceLabels: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablette",
};

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
                        <div>
                          <span className="font-semibold">{config?.name || vital.metric_type}</span>
                          {config?.fullName && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({config.fullName})
                            </span>
                          )}
                        </div>
                        <Badge
                          variant={rating === "good" ? "default" : rating === "poor" ? "destructive" : "secondary"}
                        >
                          {rating === "good" ? "Bon" : rating === "poor" ? "Mauvais" : "À améliorer"}
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

      {/* Score global + Évolution temporelle */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Score global de performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Score Global
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            {data.web_vitals.length > 0 ? (
              <>
                {(() => {
                  const score = calculatePerformanceScore(data.web_vitals);
                  return (
                    <>
                      <div
                        className="text-6xl font-bold mb-2"
                        style={{ color: getScoreColor(score) }}
                      >
                        {score}
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        sur 100
                      </div>
                      <Badge
                        variant={score >= 90 ? "default" : score >= 50 ? "secondary" : "destructive"}
                        className="text-sm px-4 py-1"
                      >
                        {getScoreLabel(score)}
                      </Badge>
                      <p className="text-xs text-muted-foreground text-center mt-4 max-w-[200px]">
                        Score calculé selon la méthodologie Lighthouse
                      </p>
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="text-muted-foreground">Pas de données</div>
            )}
          </CardContent>
        </Card>

        {/* Évolution temporelle des Web Vitals */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution sur 7 jours (LCP, FCP, TTFB)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.web_vitals_by_day && data.web_vitals_by_day.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.web_vitals_by_day}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} unit="ms" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${Math.round(value)}ms`,
                      webVitalLabels[name]?.name || name.toUpperCase()
                    ]}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
                    }}
                  />
                  <Legend
                    formatter={(value) => webVitalLabels[value]?.name || value.toUpperCase()}
                  />
                  <Line
                    type="monotone"
                    dataKey="lcp"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="fcp"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="ttfb"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Pas de données temporelles disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribution + Comparaison par appareil */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Distribution des valeurs (Bon/Moyen/Mauvais) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Distribution des mesures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.distribution && data.distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.distribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <YAxis
                    dataKey="metric_type"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={50}
                    tickFormatter={(value) => webVitalLabels[value]?.name || value.toUpperCase()}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        good_pct: "Bon",
                        needs_improvement_pct: "À améliorer",
                        poor_pct: "Mauvais",
                      };
                      return [`${value}%`, labels[name] || name];
                    }}
                    labelFormatter={(value) => webVitalLabels[value]?.fullName || value}
                  />
                  <Legend
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        good_pct: "Bon",
                        needs_improvement_pct: "À améliorer",
                        poor_pct: "Mauvais",
                      };
                      return labels[value] || value;
                    }}
                  />
                  <Bar dataKey="good_pct" stackId="a" fill="#22c55e" />
                  <Bar dataKey="needs_improvement_pct" stackId="a" fill="#f97316" />
                  <Bar dataKey="poor_pct" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Pas de données de distribution disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparaison par appareil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Performance par appareil
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.web_vitals_by_device && data.web_vitals_by_device.length > 0 ? (
              <div className="space-y-4">
                {data.web_vitals_by_device.map((device) => (
                  <div key={device.device_type} className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-3 font-medium">
                      {deviceIcons[device.device_type]}
                      <span>{deviceLabels[device.device_type] || device.device_type}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {["lcp", "fcp", "ttfb"].map((metricKey) => {
                        const metric = device.metrics[metricKey];
                        if (!metric) return null;
                        const config = webVitalLabels[metricKey];
                        const rating = getValueRating(metricKey, metric.avg_value);
                        return (
                          <div key={metricKey} className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">
                              {config?.name || metricKey.toUpperCase()}
                            </div>
                            <div
                              className="font-semibold"
                              style={{ color: getRatingColor(rating) }}
                            >
                              {Math.round(metric.avg_value)}ms
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Pas de données par appareil disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                      <div className="font-medium">Temps de réponse moyen</div>
                      <div className="text-sm text-muted-foreground">
                        {metric.sample_count} requêtes
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

      {/* Section Définitions des métriques */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-5 w-5" />
            Guide des métriques Web Vitals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tableau des seuils */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Métrique</th>
                  <th className="text-center py-2 px-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Bon
                    </span>
                  </th>
                  <th className="text-center py-2 px-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      À améliorer
                    </span>
                  </th>
                  <th className="text-center py-2 px-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Mauvais
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(webVitalLabels).map(([key, config]) => (
                  <tr key={key} className="hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <div className="font-medium">{config.name}</div>
                      <div className="text-xs text-muted-foreground">{config.fullName}</div>
                    </td>
                    <td className="text-center py-2 px-3 text-green-600 font-mono text-xs">
                      ≤ {config.thresholds[0]}{config.unit}
                    </td>
                    <td className="text-center py-2 px-3 text-orange-500 font-mono text-xs">
                      {config.thresholds[0]}{config.unit} - {config.thresholds[1]}{config.unit}
                    </td>
                    <td className="text-center py-2 px-3 text-red-500 font-mono text-xs">
                      {">"} {config.thresholds[1]}{config.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Descriptions détaillées */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(webVitalLabels).map(([key, config]) => (
              <div key={key} className="p-3 rounded-lg bg-muted/30">
                <div className="font-medium text-sm mb-1">
                  {config.name} - {config.fullName}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {config.description}
                </p>
              </div>
            ))}
          </div>

          {/* Note sur les percentiles */}
          <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
            <p><strong>P50</strong> : Médiane - 50% des mesures sont en dessous de cette valeur.</p>
            <p><strong>P75</strong> : 75% des mesures sont en dessous de cette valeur. Seuil recommandé par Google.</p>
            <p><strong>P95</strong> : 95% des mesures sont en dessous de cette valeur. Montre les cas extrêmes.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PerformanceChart;
