"""Modèles SQLAlchemy pour le système d'analytics."""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    Date,
    ForeignKey,
    Enum as SQLEnum,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class DeviceType(str, enum.Enum):
    """Type d'appareil détecté."""
    DESKTOP = "desktop"
    MOBILE = "mobile"
    TABLET = "tablet"
    UNKNOWN = "unknown"


class EventType(str, enum.Enum):
    """Type d'événement trackable."""
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


class PerformanceMetricType(str, enum.Enum):
    """Type de métrique de performance."""
    # Web Vitals
    LCP = "lcp"  # Largest Contentful Paint
    FID = "fid"  # First Input Delay
    CLS = "cls"  # Cumulative Layout Shift
    FCP = "fcp"  # First Contentful Paint
    TTFB = "ttfb"  # Time to First Byte
    INP = "inp"  # Interaction to Next Paint
    # Custom metrics
    API_LATENCY = "api_latency"
    PAGE_LOAD = "page_load"
    SEARCH_LATENCY = "search_latency"


class AnalyticsSession(Base):
    """Session de visiteur unique."""
    __tablename__ = "analytics_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=True)
    fingerprint_hash = Column(String(64), nullable=False, index=True)
    user_agent = Column(Text, nullable=True)
    ip_hash = Column(String(64), nullable=True)
    device_type = Column(SQLEnum(DeviceType), default=DeviceType.UNKNOWN)
    browser = Column(String(50), nullable=True)
    os = Column(String(50), nullable=True)
    screen_width = Column(Integer, nullable=True)
    screen_height = Column(Integer, nullable=True)
    language = Column(String(10), nullable=True)
    timezone = Column(String(50), nullable=True)
    first_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    is_authenticated = Column(Boolean, default=False)
    total_pageviews = Column(Integer, default=0)
    total_events = Column(Integer, default=0)

    # Relations
    user = relationship("User", back_populates="analytics_sessions")
    events = relationship("AnalyticsEvent", back_populates="session", cascade="all, delete-orphan")
    searches = relationship("AnalyticsSearch", back_populates="session", cascade="all, delete-orphan")
    performance_metrics = relationship("AnalyticsPerformance", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_analytics_sessions_first_seen", "first_seen"),
        Index("ix_analytics_sessions_last_seen", "last_seen"),
    )

    def __repr__(self):
        return f"<AnalyticsSession(session_id='{self.session_id[:8]}...', device='{self.device_type}')>"


class AnalyticsEvent(Base):
    """Événement granulaire tracké."""
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("analytics_sessions.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(SQLEnum(EventType), nullable=False, index=True)
    page_path = Column(String(512), nullable=True)
    referrer = Column(String(512), nullable=True)
    event_data = Column(Text, nullable=True)  # JSON string pour données additionnelles
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relations
    session = relationship("AnalyticsSession", back_populates="events")

    __table_args__ = (
        Index("ix_analytics_events_session_created", "session_id", "created_at"),
        Index("ix_analytics_events_type_created", "event_type", "created_at"),
    )

    def __repr__(self):
        return f"<AnalyticsEvent(type='{self.event_type}', path='{self.page_path}')>"


class AnalyticsSearch(Base):
    """Recherche effectuee par un visiteur."""
    __tablename__ = "analytics_searches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("analytics_sessions.id", ondelete="CASCADE"), nullable=False)
    query = Column(String(255), nullable=False, index=True)
    query_normalized = Column(String(255), nullable=True, index=True)
    results_count = Column(Integer, default=0)
    has_results = Column(Boolean, default=True)
    selected_item_row_id = Column(String(255), nullable=True)
    selected_item_type = Column(String(50), nullable=True)  # item, npc, compendium
    selected_position = Column(Integer, nullable=True)  # Position dans les résultats (0-indexed)
    time_to_select_ms = Column(Integer, nullable=True)  # Temps avant selection
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relations
    session = relationship("AnalyticsSession", back_populates="searches")

    __table_args__ = (
        Index("ix_analytics_searches_query_created", "query", "created_at"),
        Index("ix_analytics_searches_has_results", "has_results", "created_at"),
    )

    def __repr__(self):
        return f"<AnalyticsSearch(query='{self.query}', results={self.results_count})>"


class AnalyticsPerformance(Base):
    """Métriques de performance collectées."""
    __tablename__ = "analytics_performance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("analytics_sessions.id", ondelete="CASCADE"), nullable=False)
    page_path = Column(String(512), nullable=True)
    metric_type = Column(SQLEnum(PerformanceMetricType), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_rating = Column(String(10), nullable=True)  # good, needs-improvement, poor
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relations
    session = relationship("AnalyticsSession", back_populates="performance_metrics")

    __table_args__ = (
        Index("ix_analytics_performance_type_created", "metric_type", "created_at"),
    )

    def __repr__(self):
        return f"<AnalyticsPerformance(type='{self.metric_type}', value={self.metric_value})>"


class AnalyticsDailyStat(Base):
    """Statistiques agregees quotidiennes pour performances."""
    __tablename__ = "analytics_daily_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, unique=True, index=True)
    sessions_count = Column(Integer, default=0)
    unique_visitors = Column(Integer, default=0)  # Distinct fingerprint_hash
    pageviews_count = Column(Integer, default=0)
    searches_count = Column(Integer, default=0)
    searches_with_results = Column(Integer, default=0)
    searches_with_selection = Column(Integer, default=0)
    authenticated_sessions = Column(Integer, default=0)
    avg_session_duration_seconds = Column(Float, default=0.0)
    avg_pageviews_per_session = Column(Float, default=0.0)
    desktop_sessions = Column(Integer, default=0)
    mobile_sessions = Column(Integer, default=0)
    tablet_sessions = Column(Integer, default=0)
    # Performance averages
    avg_lcp_ms = Column(Float, nullable=True)
    avg_fcp_ms = Column(Float, nullable=True)
    avg_cls = Column(Float, nullable=True)
    avg_api_latency_ms = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<AnalyticsDailyStat(date='{self.date}', sessions={self.sessions_count})>"
