"""Schémas Pydantic pour le système d'analytics."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


# ===== Enums pour les schemas =====

class DeviceType(str, Enum):
    DESKTOP = "desktop"
    MOBILE = "mobile"
    TABLET = "tablet"
    UNKNOWN = "unknown"


class EventType(str, Enum):
    PAGE_VIEW = "page_view"
    SEARCH = "search"
    CLICK = "click"
    SCROLL = "scroll"
    ITEM_VIEW = "item_view"
    NPC_VIEW = "npc_view"
    COMPENDIUM_VIEW = "compendium_view"
    DIALOGUE_VIEW = "dialogue_view"
    GALLERY_VIEW = "gallery_view"
    SEARCH_RESULT_CLICK = "search_result_click"
    EXTERNAL_LINK = "external_link"


class PerformanceMetricType(str, Enum):
    LCP = "lcp"
    FID = "fid"
    CLS = "cls"
    FCP = "fcp"
    TTFB = "ttfb"
    INP = "inp"
    API_LATENCY = "api_latency"
    PAGE_LOAD = "page_load"
    SEARCH_LATENCY = "search_latency"


# ===== Schémas d'entrée (Collecte) =====

class FingerprintData(BaseModel):
    """Composants du fingerprint navigateur."""
    user_agent: str
    screen_width: int
    screen_height: int
    language: str
    timezone: str
    color_depth: Optional[int] = None
    device_memory: Optional[int] = None
    hardware_concurrency: Optional[int] = None
    platform: Optional[str] = None
    canvas_hash: Optional[str] = None
    webgl_hash: Optional[str] = None


class SessionInitRequest(BaseModel):
    """Requete d'initialisation de session."""
    fingerprint: FingerprintData
    referrer: Optional[str] = None
    page_path: Optional[str] = None


class SessionInitResponse(BaseModel):
    """Reponse d'initialisation de session."""
    session_id: str
    is_new: bool
    device_type: DeviceType


class EventData(BaseModel):
    """Données d'un événement individuel."""
    event_type: EventType
    page_path: Optional[str] = None
    referrer: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None


class EventBatchRequest(BaseModel):
    """Batch d'événements à enregistrer."""
    session_id: str
    events: List[EventData] = Field(..., min_length=1, max_length=100)


class EventBatchResponse(BaseModel):
    """Reponse d'enregistrement de batch."""
    recorded: int
    session_updated: bool


class SearchEventRequest(BaseModel):
    """Événement de recherche."""
    session_id: str
    query: str = Field(..., min_length=1, max_length=255)
    results_count: int = Field(..., ge=0)
    selected_item_row_id: Optional[str] = None
    selected_item_type: Optional[str] = None
    selected_position: Optional[int] = None
    time_to_select_ms: Optional[int] = None


class SearchEventResponse(BaseModel):
    """Reponse d'enregistrement de recherche."""
    search_id: int
    recorded: bool


class PerformanceMetric(BaseModel):
    """Métrique de performance individuelle."""
    metric_type: PerformanceMetricType
    value: float
    rating: Optional[str] = None  # good, needs-improvement, poor
    page_path: Optional[str] = None


class PerformanceRequest(BaseModel):
    """Requête d'enregistrement de métriques de performance."""
    session_id: str
    metrics: List[PerformanceMetric] = Field(..., min_length=1, max_length=50)


class PerformanceResponse(BaseModel):
    """Reponse d'enregistrement de performance."""
    recorded: int


# ===== Schemas Dashboard (Authentification) =====

class AdminAuthRequest(BaseModel):
    """Requete d'authentification admin."""
    password: str


class AdminAuthResponse(BaseModel):
    """Reponse d'authentification admin."""
    success: bool
    token: Optional[str] = None
    error: Optional[str] = None


# ===== Schémas Dashboard (Données) =====

class DashboardOverview(BaseModel):
    """Vue d'ensemble du dashboard."""
    # KPIs temps reel (aujourd'hui)
    today_sessions: int
    today_pageviews: int
    today_searches: int
    today_unique_visitors: int
    # KPIs période (7 derniers jours)
    period_sessions: int
    period_pageviews: int
    period_searches: int
    period_unique_visitors: int
    # Variations vs période précédente (%)
    sessions_change_pct: float
    pageviews_change_pct: float
    searches_change_pct: float
    visitors_change_pct: float
    # Statistiques globales
    total_sessions_all_time: int
    avg_session_duration_seconds: float
    avg_pageviews_per_session: float
    search_success_rate: float  # Recherches avec selection / total


class TimeSeriesDataPoint(BaseModel):
    """Point de donnée pour graphique temporel."""
    date: date
    value: float
    label: Optional[str] = None


class TimeSeriesResponse(BaseModel):
    """Réponse avec données de série temporelle."""
    metric: str
    period_start: date
    period_end: date
    data: List[TimeSeriesDataPoint]
    total: float
    average: float


class TopSearchQuery(BaseModel):
    """Recherche populaire."""
    query: str
    count: int
    results_avg: float
    selection_rate: float


class ZeroResultSearch(BaseModel):
    """Recherche sans résultat."""
    query: str
    count: int
    last_searched: datetime


class SearchAnalyticsResponse(BaseModel):
    """Statistiques detaillees des recherches."""
    total_searches: int
    searches_with_results: int
    searches_with_selection: int
    avg_results_count: float
    avg_time_to_select_ms: Optional[float]
    search_success_rate: float
    zero_results_rate: float
    top_searches: List[TopSearchQuery]
    zero_result_searches: List[ZeroResultSearch]
    searches_by_hour: List[TimeSeriesDataPoint]


class DeviceStats(BaseModel):
    """Statistiques par type d'appareil."""
    device_type: DeviceType
    count: int
    percentage: float


class BrowserStats(BaseModel):
    """Statistiques par navigateur."""
    browser: str
    count: int
    percentage: float


class VisitorAnalyticsResponse(BaseModel):
    """Statistiques detaillees des visiteurs."""
    total_sessions: int
    unique_visitors: int
    authenticated_sessions: int
    returning_visitors: int
    new_visitors: int
    avg_session_duration_seconds: float
    avg_pageviews_per_session: float
    devices: List[DeviceStats]
    browsers: List[BrowserStats]
    visitors_by_day: List[TimeSeriesDataPoint]
    sessions_by_hour: List[TimeSeriesDataPoint]


class PerformanceMetricStats(BaseModel):
    """Statistiques d'une métrique de performance."""
    metric_type: PerformanceMetricType
    avg_value: float
    p50_value: float  # Median
    p75_value: float
    p95_value: float
    good_count: int
    needs_improvement_count: int
    poor_count: int
    sample_count: int


class PagePerformance(BaseModel):
    """Performance par page."""
    page_path: str
    avg_load_time_ms: float
    pageviews: int


class PerformanceAnalyticsResponse(BaseModel):
    """Statistiques detaillees de performance."""
    web_vitals: List[PerformanceMetricStats]
    api_metrics: List[PerformanceMetricStats]
    slowest_pages: List[PagePerformance]
    performance_by_day: List[TimeSeriesDataPoint]


class PopularPage(BaseModel):
    """Page populaire."""
    page_path: str
    pageviews: int
    unique_visitors: int
    avg_time_on_page_seconds: Optional[float]


class ContentAnalyticsResponse(BaseModel):
    """Statistiques de contenu."""
    total_pageviews: int
    unique_pages_viewed: int
    popular_pages: List[PopularPage]
    popular_items: List[Dict[str, Any]]
    popular_npcs: List[Dict[str, Any]]
    popular_compendium: List[Dict[str, Any]]


# ===== Schemas de reponse standards =====

class AnalyticsStatusResponse(BaseModel):
    """Statut du système analytics."""
    enabled: bool
    sessions_today: int
    events_today: int
    last_event_at: Optional[datetime] = None


class Config:
    from_attributes = True
