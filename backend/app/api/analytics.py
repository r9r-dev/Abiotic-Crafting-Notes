"""API endpoints pour le système d'analytics."""

import json
import hashlib
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, and_, desc, case

from app.database import get_db
from app.config import get_settings
from app.models.analytics import (
    AnalyticsSession,
    AnalyticsEvent,
    AnalyticsSearch,
    AnalyticsPerformance,
    AnalyticsDailyStat,
    DeviceType as DBDeviceType,
    EventType as DBEventType,
    PerformanceMetricType as DBPerformanceMetricType,
)
from app.schemas.analytics import (
    SessionInitRequest,
    SessionInitResponse,
    EventBatchRequest,
    EventBatchResponse,
    SearchEventRequest,
    SearchEventResponse,
    PerformanceRequest,
    PerformanceResponse,
    AdminAuthRequest,
    AdminAuthResponse,
    DeviceType,
)
from app.services.fingerprint import (
    generate_fingerprint_hash,
    generate_session_id,
    detect_device_type,
    detect_browser,
    detect_os,
    hash_ip_address,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])
settings = get_settings()

# Cache simple pour les tokens admin (en production, utiliser Redis)
_admin_tokens: dict[str, datetime] = {}


def normalize_search_text(text: str) -> str:
    """Normalise le texte pour la recherche."""
    # Remplacer les ligatures
    text = text.replace("œ", "oe").replace("Œ", "OE")
    text = text.replace("æ", "ae").replace("Æ", "AE")
    # Supprimer les points
    text = text.replace(".", "")
    # Supprimer les accents
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    return text.lower()


def get_client_ip(request: Request) -> str:
    """Récupère l'adresse IP du client."""
    # Vérifier les headers de proxy (Cloudflare, nginx, etc.)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip

    return request.client.host if request.client else "unknown"


def verify_admin_token(token: str) -> bool:
    """Vérifie si un token admin est valide."""
    if token not in _admin_tokens:
        return False

    expiry = _admin_tokens[token]
    if datetime.now(timezone.utc) > expiry:
        del _admin_tokens[token]
        return False

    return True


def get_admin_token(request: Request) -> str:
    """Extrait et vérifie le token admin des headers."""
    auth_header = request.headers.get("X-Analytics-Token")
    if not auth_header or not verify_admin_token(auth_header):
        raise HTTPException(status_code=401, detail="Non autorise")
    return auth_header


# ===== Endpoints de collecte (publics) =====

@router.post("/session", response_model=SessionInitResponse)
def init_session(
    body: SessionInitRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Initialise ou récupère une session de visiteur.

    Si une session existante avec le même fingerprint existe et n'a pas expiré,
    elle est retournée. Sinon, une nouvelle session est créée.
    """
    if not settings.analytics_enabled:
        raise HTTPException(status_code=503, detail="Analytics désactivé")

    # Générer le hash du fingerprint
    fingerprint_hash = generate_fingerprint_hash(body.fingerprint, settings.analytics_salt)

    # Détecter les infos du device
    device_type = detect_device_type(body.fingerprint.user_agent)
    browser = detect_browser(body.fingerprint.user_agent)
    os = detect_os(body.fingerprint.user_agent)

    # Hash de l'IP
    client_ip = get_client_ip(request)
    ip_hash = hash_ip_address(client_ip, settings.analytics_salt)

    # Vérifier si une session recente existe pour ce fingerprint
    session_timeout = datetime.now(timezone.utc) - timedelta(hours=settings.analytics_session_timeout_hours)

    existing_session = db.query(AnalyticsSession).filter(
        and_(
            AnalyticsSession.fingerprint_hash == fingerprint_hash,
            AnalyticsSession.last_seen > session_timeout,
        )
    ).order_by(desc(AnalyticsSession.last_seen)).first()

    if existing_session:
        # Mettre a jour last_seen
        existing_session.last_seen = datetime.now(timezone.utc)
        db.commit()

        return SessionInitResponse(
            session_id=existing_session.session_id,
            is_new=False,
            device_type=DeviceType(existing_session.device_type.value),
        )

    # Créer une nouvelle session
    timestamp = datetime.now(timezone.utc).timestamp()
    session_id = generate_session_id(fingerprint_hash, timestamp, settings.analytics_salt)

    # Convertir le DeviceType du schema vers le DeviceType du modele
    db_device_type = DBDeviceType(device_type.value)

    new_session = AnalyticsSession(
        session_id=session_id,
        fingerprint_hash=fingerprint_hash,
        user_agent=body.fingerprint.user_agent,
        ip_hash=ip_hash,
        device_type=db_device_type,
        browser=browser,
        os=os,
        screen_width=body.fingerprint.screen_width,
        screen_height=body.fingerprint.screen_height,
        language=body.fingerprint.language,
        timezone=body.fingerprint.timezone,
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Enregistrer le premier evenement (page view initiale)
    if body.page_path:
        initial_event = AnalyticsEvent(
            session_id=new_session.id,
            event_type=DBEventType.PAGE_VIEW,
            page_path=body.page_path,
            referrer=body.referrer,
        )
        db.add(initial_event)
        new_session.total_pageviews = 1
        new_session.total_events = 1
        db.commit()

    return SessionInitResponse(
        session_id=session_id,
        is_new=True,
        device_type=device_type,
    )


@router.post("/events", response_model=EventBatchResponse)
def record_events(
    body: EventBatchRequest,
    db: Session = Depends(get_db),
):
    """
    Enregistre un batch d'evenements.

    Permet d'envoyer plusieurs evenements en une seule requete
    pour optimiser les performances reseau.
    """
    if not settings.analytics_enabled:
        raise HTTPException(status_code=503, detail="Analytics désactivé")

    # Trouver la session
    session = db.query(AnalyticsSession).filter(
        AnalyticsSession.session_id == body.session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvee")

    recorded = 0
    pageviews = 0

    for event_data in body.events:
        # Convertir l'EventType du schema vers le modele
        db_event_type = DBEventType(event_data.event_type.value)

        event = AnalyticsEvent(
            session_id=session.id,
            event_type=db_event_type,
            page_path=event_data.page_path,
            referrer=event_data.referrer,
            event_data=json.dumps(event_data.data) if event_data.data else None,
            created_at=event_data.timestamp or datetime.now(timezone.utc),
        )
        db.add(event)
        recorded += 1

        if event_data.event_type.value == "page_view":
            pageviews += 1

    # Mettre a jour les compteurs de la session
    session.total_events = (session.total_events or 0) + recorded
    session.total_pageviews = (session.total_pageviews or 0) + pageviews
    session.last_seen = datetime.now(timezone.utc)

    db.commit()

    return EventBatchResponse(
        recorded=recorded,
        session_updated=True,
    )


@router.post("/search", response_model=SearchEventResponse)
def record_search(
    body: SearchEventRequest,
    db: Session = Depends(get_db),
):
    """
    Enregistre un evenement de recherche.

    Permet de tracker les recherches effectuees, leurs resultats,
    et les selections faites par les utilisateurs.
    """
    if not settings.analytics_enabled:
        raise HTTPException(status_code=503, detail="Analytics désactivé")

    # Trouver la session
    session = db.query(AnalyticsSession).filter(
        AnalyticsSession.session_id == body.session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvee")

    # Normaliser la requete de recherche
    query_normalized = normalize_search_text(body.query)

    search = AnalyticsSearch(
        session_id=session.id,
        query=body.query,
        query_normalized=query_normalized,
        results_count=body.results_count,
        has_results=body.results_count > 0,
        selected_item_row_id=body.selected_item_row_id,
        selected_item_type=body.selected_item_type,
        selected_position=body.selected_position,
        time_to_select_ms=body.time_to_select_ms,
    )

    db.add(search)
    session.last_seen = datetime.now(timezone.utc)
    db.commit()
    db.refresh(search)

    return SearchEventResponse(
        search_id=search.id,
        recorded=True,
    )


@router.post("/performance", response_model=PerformanceResponse)
def record_performance(
    body: PerformanceRequest,
    db: Session = Depends(get_db),
):
    """
    Enregistre des metriques de performance (Web Vitals, latences API, etc.).
    """
    if not settings.analytics_enabled:
        raise HTTPException(status_code=503, detail="Analytics désactivé")

    # Trouver la session
    session = db.query(AnalyticsSession).filter(
        AnalyticsSession.session_id == body.session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvee")

    recorded = 0

    for metric in body.metrics:
        # Convertir le PerformanceMetricType du schema vers le modele
        db_metric_type = DBPerformanceMetricType(metric.metric_type.value)

        perf = AnalyticsPerformance(
            session_id=session.id,
            page_path=metric.page_path,
            metric_type=db_metric_type,
            metric_value=metric.value,
            metric_rating=metric.rating,
        )
        db.add(perf)
        recorded += 1

    session.last_seen = datetime.now(timezone.utc)
    db.commit()

    return PerformanceResponse(recorded=recorded)


# ===== Endpoints Dashboard (proteges) =====

@router.post("/auth", response_model=AdminAuthResponse)
def admin_auth(body: AdminAuthRequest):
    """
    Authentifie l'acces au dashboard admin.

    Retourne un token temporaire valable 24h.
    """
    if body.password != settings.analytics_password:
        return AdminAuthResponse(
            success=False,
            error="Mot de passe incorrect",
        )

    # Générer un token
    token = secrets.token_hex(32)
    expiry = datetime.now(timezone.utc) + timedelta(hours=24)
    _admin_tokens[token] = expiry

    # Nettoyer les tokens expires
    now = datetime.now(timezone.utc)
    expired = [t for t, exp in _admin_tokens.items() if exp < now]
    for t in expired:
        del _admin_tokens[t]

    return AdminAuthResponse(
        success=True,
        token=token,
    )


@router.get("/dashboard")
def get_dashboard_overview(
    request: Request,
    db: Session = Depends(get_db),
    _token: str = Depends(get_admin_token),
):
    """
    Retourne les KPIs principaux pour le dashboard.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today_start - timedelta(days=7)
    two_weeks_ago = today_start - timedelta(days=14)

    # KPIs aujourd'hui
    today_sessions = db.query(func.count(AnalyticsSession.id)).filter(
        AnalyticsSession.first_seen >= today_start
    ).scalar() or 0

    today_pageviews = db.query(func.count(AnalyticsEvent.id)).filter(
        and_(
            AnalyticsEvent.created_at >= today_start,
            AnalyticsEvent.event_type == DBEventType.PAGE_VIEW,
        )
    ).scalar() or 0

    today_searches = db.query(func.count(AnalyticsSearch.id)).filter(
        AnalyticsSearch.created_at >= today_start
    ).scalar() or 0

    today_unique_visitors = db.query(
        func.count(distinct(AnalyticsSession.fingerprint_hash))
    ).filter(
        AnalyticsSession.first_seen >= today_start
    ).scalar() or 0

    # KPIs 7 derniers jours
    period_sessions = db.query(func.count(AnalyticsSession.id)).filter(
        AnalyticsSession.first_seen >= week_ago
    ).scalar() or 0

    period_pageviews = db.query(func.count(AnalyticsEvent.id)).filter(
        and_(
            AnalyticsEvent.created_at >= week_ago,
            AnalyticsEvent.event_type == DBEventType.PAGE_VIEW,
        )
    ).scalar() or 0

    period_searches = db.query(func.count(AnalyticsSearch.id)).filter(
        AnalyticsSearch.created_at >= week_ago
    ).scalar() or 0

    period_unique_visitors = db.query(
        func.count(distinct(AnalyticsSession.fingerprint_hash))
    ).filter(
        AnalyticsSession.first_seen >= week_ago
    ).scalar() or 0

    # KPIs periode precedente (pour calcul variation)
    prev_sessions = db.query(func.count(AnalyticsSession.id)).filter(
        and_(
            AnalyticsSession.first_seen >= two_weeks_ago,
            AnalyticsSession.first_seen < week_ago,
        )
    ).scalar() or 0

    prev_pageviews = db.query(func.count(AnalyticsEvent.id)).filter(
        and_(
            AnalyticsEvent.created_at >= two_weeks_ago,
            AnalyticsEvent.created_at < week_ago,
            AnalyticsEvent.event_type == DBEventType.PAGE_VIEW,
        )
    ).scalar() or 0

    prev_searches = db.query(func.count(AnalyticsSearch.id)).filter(
        and_(
            AnalyticsSearch.created_at >= two_weeks_ago,
            AnalyticsSearch.created_at < week_ago,
        )
    ).scalar() or 0

    prev_unique_visitors = db.query(
        func.count(distinct(AnalyticsSession.fingerprint_hash))
    ).filter(
        and_(
            AnalyticsSession.first_seen >= two_weeks_ago,
            AnalyticsSession.first_seen < week_ago,
        )
    ).scalar() or 0

    # Calculer les variations en pourcentage
    def calc_change(current: int, previous: int) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    # Statistiques globales
    total_sessions = db.query(func.count(AnalyticsSession.id)).scalar() or 0

    # Duree moyenne de session (difference entre last_seen et first_seen)
    avg_duration_result = db.query(
        func.avg(
            func.extract("epoch", AnalyticsSession.last_seen) -
            func.extract("epoch", AnalyticsSession.first_seen)
        )
    ).filter(
        AnalyticsSession.first_seen >= week_ago
    ).scalar()
    avg_session_duration = float(avg_duration_result) if avg_duration_result else 0.0

    # Pageviews moyennes par session
    avg_pageviews_result = db.query(func.avg(AnalyticsSession.total_pageviews)).filter(
        AnalyticsSession.first_seen >= week_ago
    ).scalar()
    avg_pageviews = float(avg_pageviews_result) if avg_pageviews_result else 0.0

    # Taux de succes des recherches (avec selection / total)
    searches_with_selection = db.query(func.count(AnalyticsSearch.id)).filter(
        and_(
            AnalyticsSearch.created_at >= week_ago,
            AnalyticsSearch.selected_item_row_id.isnot(None),
        )
    ).scalar() or 0

    search_success_rate = (
        (searches_with_selection / period_searches * 100)
        if period_searches > 0 else 0.0
    )

    return {
        "today_sessions": today_sessions,
        "today_pageviews": today_pageviews,
        "today_searches": today_searches,
        "today_unique_visitors": today_unique_visitors,
        "period_sessions": period_sessions,
        "period_pageviews": period_pageviews,
        "period_searches": period_searches,
        "period_unique_visitors": period_unique_visitors,
        "sessions_change_pct": calc_change(period_sessions, prev_sessions),
        "pageviews_change_pct": calc_change(period_pageviews, prev_pageviews),
        "searches_change_pct": calc_change(period_searches, prev_searches),
        "visitors_change_pct": calc_change(period_unique_visitors, prev_unique_visitors),
        "total_sessions_all_time": total_sessions,
        "avg_session_duration_seconds": round(avg_session_duration, 1),
        "avg_pageviews_per_session": round(avg_pageviews, 2),
        "search_success_rate": round(search_success_rate, 1),
    }


@router.get("/dashboard/searches")
def get_search_analytics(
    request: Request,
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
    _token: str = Depends(get_admin_token),
):
    """
    Retourne les statistiques détaillées des recherches.
    """
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=days)

    # Statistiques globales
    total_searches = db.query(func.count(AnalyticsSearch.id)).filter(
        AnalyticsSearch.created_at >= period_start
    ).scalar() or 0

    searches_with_results = db.query(func.count(AnalyticsSearch.id)).filter(
        and_(
            AnalyticsSearch.created_at >= period_start,
            AnalyticsSearch.has_results == True,
        )
    ).scalar() or 0

    searches_with_selection = db.query(func.count(AnalyticsSearch.id)).filter(
        and_(
            AnalyticsSearch.created_at >= period_start,
            AnalyticsSearch.selected_item_row_id.isnot(None),
        )
    ).scalar() or 0

    avg_results = db.query(func.avg(AnalyticsSearch.results_count)).filter(
        AnalyticsSearch.created_at >= period_start
    ).scalar() or 0.0

    avg_time_to_select = db.query(func.avg(AnalyticsSearch.time_to_select_ms)).filter(
        and_(
            AnalyticsSearch.created_at >= period_start,
            AnalyticsSearch.time_to_select_ms.isnot(None),
        )
    ).scalar()

    # Top recherches
    top_searches = db.query(
        AnalyticsSearch.query,
        func.count(AnalyticsSearch.id).label("count"),
        func.avg(AnalyticsSearch.results_count).label("avg_results"),
        func.sum(
            case(
                (AnalyticsSearch.selected_item_row_id.isnot(None), 1),
                else_=0
            )
        ).label("selections"),
    ).filter(
        AnalyticsSearch.created_at >= period_start
    ).group_by(
        AnalyticsSearch.query
    ).order_by(
        desc("count")
    ).limit(20).all()

    top_searches_list = [
        {
            "query": s.query,
            "count": s.count,
            "results_avg": round(float(s.avg_results or 0), 1),
            "selection_rate": round((s.selections or 0) / s.count * 100, 1) if s.count > 0 else 0,
        }
        for s in top_searches
    ]

    # Recherches sans resultat
    zero_result_searches = db.query(
        AnalyticsSearch.query,
        func.count(AnalyticsSearch.id).label("count"),
        func.max(AnalyticsSearch.created_at).label("last_searched"),
    ).filter(
        and_(
            AnalyticsSearch.created_at >= period_start,
            AnalyticsSearch.has_results == False,
        )
    ).group_by(
        AnalyticsSearch.query
    ).order_by(
        desc("count")
    ).limit(20).all()

    zero_results_list = [
        {
            "query": s.query,
            "count": s.count,
            "last_searched": s.last_searched.isoformat() if s.last_searched else None,
        }
        for s in zero_result_searches
    ]

    # 50 dernières recherches avec informations de session
    recent_searches = db.query(
        AnalyticsSearch.query,
        AnalyticsSearch.query_normalized,
        AnalyticsSearch.results_count,
        AnalyticsSearch.selected_item_row_id,
        AnalyticsSearch.selected_item_type,
        AnalyticsSearch.selected_position,
        AnalyticsSearch.time_to_select_ms,
        AnalyticsSearch.created_at,
        AnalyticsSession.device_type,
        AnalyticsSession.browser,
        AnalyticsSession.os,
        AnalyticsSession.language,
    ).join(
        AnalyticsSession,
        AnalyticsSearch.session_id == AnalyticsSession.id
    ).filter(
        AnalyticsSearch.created_at >= period_start
    ).order_by(
        desc(AnalyticsSearch.created_at)
    ).limit(50).all()

    recent_searches_list = [
        {
            "query": s.query,
            "query_normalized": s.query_normalized,
            "results_count": s.results_count,
            "selected_item_row_id": s.selected_item_row_id,
            "selected_item_type": s.selected_item_type,
            "selected_position": s.selected_position,
            "time_to_select_ms": s.time_to_select_ms,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "device_type": s.device_type.value if s.device_type else None,
            "browser": s.browser,
            "os": s.os,
            "language": s.language,
        }
        for s in recent_searches
    ]

    return {
        "total_searches": total_searches,
        "searches_with_results": searches_with_results,
        "searches_with_selection": searches_with_selection,
        "avg_results_count": round(float(avg_results), 1),
        "avg_time_to_select_ms": round(float(avg_time_to_select), 0) if avg_time_to_select else None,
        "search_success_rate": round(searches_with_selection / total_searches * 100, 1) if total_searches > 0 else 0,
        "zero_results_rate": round((total_searches - searches_with_results) / total_searches * 100, 1) if total_searches > 0 else 0,
        "top_searches": top_searches_list,
        "zero_result_searches": zero_results_list,
        "recent_searches": recent_searches_list,
    }


@router.get("/dashboard/visitors")
def get_visitor_analytics(
    request: Request,
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
    _token: str = Depends(get_admin_token),
):
    """
    Retourne les statistiques détaillées des visiteurs.
    """
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=days)

    # Statistiques globales
    total_sessions = db.query(func.count(AnalyticsSession.id)).filter(
        AnalyticsSession.first_seen >= period_start
    ).scalar() or 0

    unique_visitors = db.query(
        func.count(distinct(AnalyticsSession.fingerprint_hash))
    ).filter(
        AnalyticsSession.first_seen >= period_start
    ).scalar() or 0

    authenticated_sessions = db.query(func.count(AnalyticsSession.id)).filter(
        and_(
            AnalyticsSession.first_seen >= period_start,
            AnalyticsSession.is_authenticated == True,
        )
    ).scalar() or 0

    # Visiteurs recurrents (fingerprint vu plusieurs fois)
    recurring_fingerprints = db.query(AnalyticsSession.fingerprint_hash).filter(
        AnalyticsSession.first_seen >= period_start
    ).group_by(
        AnalyticsSession.fingerprint_hash
    ).having(
        func.count(AnalyticsSession.id) > 1
    ).count()

    # Duree moyenne de session
    avg_duration = db.query(
        func.avg(
            func.extract("epoch", AnalyticsSession.last_seen) -
            func.extract("epoch", AnalyticsSession.first_seen)
        )
    ).filter(
        AnalyticsSession.first_seen >= period_start
    ).scalar() or 0.0

    # Pageviews moyennes par session
    avg_pageviews = db.query(func.avg(AnalyticsSession.total_pageviews)).filter(
        AnalyticsSession.first_seen >= period_start
    ).scalar() or 0.0

    # Repartition par device
    device_stats = db.query(
        AnalyticsSession.device_type,
        func.count(AnalyticsSession.id).label("count"),
    ).filter(
        AnalyticsSession.first_seen >= period_start
    ).group_by(
        AnalyticsSession.device_type
    ).all()

    devices = [
        {
            "device_type": d.device_type.value if d.device_type else "unknown",
            "count": d.count,
            "percentage": round(d.count / total_sessions * 100, 1) if total_sessions > 0 else 0,
        }
        for d in device_stats
    ]

    # Repartition par navigateur
    browser_stats = db.query(
        AnalyticsSession.browser,
        func.count(AnalyticsSession.id).label("count"),
    ).filter(
        and_(
            AnalyticsSession.first_seen >= period_start,
            AnalyticsSession.browser.isnot(None),
        )
    ).group_by(
        AnalyticsSession.browser
    ).order_by(
        desc("count")
    ).limit(10).all()

    browsers = [
        {
            "browser": b.browser or "Unknown",
            "count": b.count,
            "percentage": round(b.count / total_sessions * 100, 1) if total_sessions > 0 else 0,
        }
        for b in browser_stats
    ]

    # Visiteurs par jour
    visitors_by_day = db.query(
        func.date(AnalyticsSession.first_seen).label("date"),
        func.count(distinct(AnalyticsSession.fingerprint_hash)).label("count"),
    ).filter(
        AnalyticsSession.first_seen >= period_start
    ).group_by(
        func.date(AnalyticsSession.first_seen)
    ).order_by("date").all()

    visitors_by_day_list = [
        {"date": str(v.date), "value": v.count}
        for v in visitors_by_day
    ]

    return {
        "total_sessions": total_sessions,
        "unique_visitors": unique_visitors,
        "authenticated_sessions": authenticated_sessions,
        "returning_visitors": recurring_fingerprints,
        "new_visitors": unique_visitors - recurring_fingerprints,
        "avg_session_duration_seconds": round(float(avg_duration), 1),
        "avg_pageviews_per_session": round(float(avg_pageviews), 2),
        "devices": devices,
        "browsers": browsers,
        "visitors_by_day": visitors_by_day_list,
    }


@router.get("/dashboard/performance")
def get_performance_analytics(
    request: Request,
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
    _token: str = Depends(get_admin_token),
):
    """
    Retourne les statistiques détaillées de performance.
    """
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=days)

    # Web Vitals
    web_vital_types = [
        DBPerformanceMetricType.LCP,
        DBPerformanceMetricType.FCP,
        DBPerformanceMetricType.CLS,
        DBPerformanceMetricType.FID,
        DBPerformanceMetricType.INP,
        DBPerformanceMetricType.TTFB,
    ]

    web_vitals = []
    for metric_type in web_vital_types:
        stats = db.query(
            func.avg(AnalyticsPerformance.metric_value).label("avg"),
            func.count(AnalyticsPerformance.id).label("count"),
        ).filter(
            and_(
                AnalyticsPerformance.created_at >= period_start,
                AnalyticsPerformance.metric_type == metric_type,
            )
        ).first()

        if stats and stats.count > 0:
            # Calculer les percentiles (approximation)
            values = db.query(AnalyticsPerformance.metric_value).filter(
                and_(
                    AnalyticsPerformance.created_at >= period_start,
                    AnalyticsPerformance.metric_type == metric_type,
                )
            ).order_by(AnalyticsPerformance.metric_value).all()

            values_list = [v[0] for v in values]
            n = len(values_list)

            p50 = values_list[int(n * 0.50)] if n > 0 else 0
            p75 = values_list[int(n * 0.75)] if n > 0 else 0
            p95 = values_list[min(int(n * 0.95), n - 1)] if n > 0 else 0

            # Compter les ratings
            good_count = db.query(func.count(AnalyticsPerformance.id)).filter(
                and_(
                    AnalyticsPerformance.created_at >= period_start,
                    AnalyticsPerformance.metric_type == metric_type,
                    AnalyticsPerformance.metric_rating == "good",
                )
            ).scalar() or 0

            needs_improvement_count = db.query(func.count(AnalyticsPerformance.id)).filter(
                and_(
                    AnalyticsPerformance.created_at >= period_start,
                    AnalyticsPerformance.metric_type == metric_type,
                    AnalyticsPerformance.metric_rating == "needs-improvement",
                )
            ).scalar() or 0

            poor_count = db.query(func.count(AnalyticsPerformance.id)).filter(
                and_(
                    AnalyticsPerformance.created_at >= period_start,
                    AnalyticsPerformance.metric_type == metric_type,
                    AnalyticsPerformance.metric_rating == "poor",
                )
            ).scalar() or 0

            web_vitals.append({
                "metric_type": metric_type.value,
                "avg_value": round(float(stats.avg), 2),
                "p50_value": round(p50, 2),
                "p75_value": round(p75, 2),
                "p95_value": round(p95, 2),
                "good_count": good_count,
                "needs_improvement_count": needs_improvement_count,
                "poor_count": poor_count,
                "sample_count": stats.count,
            })

    # API metrics
    api_stats = db.query(
        func.avg(AnalyticsPerformance.metric_value).label("avg"),
        func.count(AnalyticsPerformance.id).label("count"),
    ).filter(
        and_(
            AnalyticsPerformance.created_at >= period_start,
            AnalyticsPerformance.metric_type == DBPerformanceMetricType.API_LATENCY,
        )
    ).first()

    api_metrics = []
    if api_stats and api_stats.count > 0:
        api_metrics.append({
            "metric_type": "api_latency",
            "avg_value": round(float(api_stats.avg), 2),
            "sample_count": api_stats.count,
        })

    # Pages les plus lentes
    slowest_pages = db.query(
        AnalyticsPerformance.page_path,
        func.avg(AnalyticsPerformance.metric_value).label("avg_load"),
        func.count(AnalyticsPerformance.id).label("pageviews"),
    ).filter(
        and_(
            AnalyticsPerformance.created_at >= period_start,
            AnalyticsPerformance.metric_type == DBPerformanceMetricType.PAGE_LOAD,
            AnalyticsPerformance.page_path.isnot(None),
        )
    ).group_by(
        AnalyticsPerformance.page_path
    ).order_by(
        desc("avg_load")
    ).limit(10).all()

    slowest_pages_list = [
        {
            "page_path": p.page_path,
            "avg_load_time_ms": round(float(p.avg_load), 0),
            "pageviews": p.pageviews,
        }
        for p in slowest_pages
    ]

    # Web Vitals par jour (pour graphique d'évolution)
    web_vitals_by_day = []
    main_vitals = [DBPerformanceMetricType.LCP, DBPerformanceMetricType.FCP, DBPerformanceMetricType.TTFB]

    daily_stats = db.query(
        func.date(AnalyticsPerformance.created_at).label("date"),
        AnalyticsPerformance.metric_type,
        func.avg(AnalyticsPerformance.metric_value).label("avg_value"),
        func.count(AnalyticsPerformance.id).label("sample_count"),
    ).filter(
        and_(
            AnalyticsPerformance.created_at >= period_start,
            AnalyticsPerformance.metric_type.in_(main_vitals),
        )
    ).group_by(
        func.date(AnalyticsPerformance.created_at),
        AnalyticsPerformance.metric_type
    ).order_by("date").all()

    # Organiser par jour
    days_data: dict = {}
    for row in daily_stats:
        date_str = str(row.date)
        if date_str not in days_data:
            days_data[date_str] = {"date": date_str}
        days_data[date_str][row.metric_type.value] = round(float(row.avg_value), 2)

    web_vitals_by_day = list(days_data.values())

    # Web Vitals par type d'appareil
    web_vitals_by_device = []
    device_types = [DBDeviceType.DESKTOP, DBDeviceType.MOBILE, DBDeviceType.TABLET]

    for device_type in device_types:
        device_stats = {}
        for metric_type in web_vital_types:
            result = db.query(
                func.avg(AnalyticsPerformance.metric_value).label("avg"),
                func.count(AnalyticsPerformance.id).label("count"),
            ).join(
                AnalyticsSession,
                AnalyticsPerformance.session_id == AnalyticsSession.id
            ).filter(
                and_(
                    AnalyticsPerformance.created_at >= period_start,
                    AnalyticsPerformance.metric_type == metric_type,
                    AnalyticsSession.device_type == device_type,
                )
            ).first()

            if result and result.count > 0:
                device_stats[metric_type.value] = {
                    "avg_value": round(float(result.avg), 2),
                    "sample_count": result.count,
                }

        if device_stats:
            web_vitals_by_device.append({
                "device_type": device_type.value,
                "metrics": device_stats,
            })

    # Distribution globale des ratings (pour graphique de distribution)
    distribution = []
    for metric_type in web_vital_types:
        good = db.query(func.count(AnalyticsPerformance.id)).filter(
            and_(
                AnalyticsPerformance.created_at >= period_start,
                AnalyticsPerformance.metric_type == metric_type,
                AnalyticsPerformance.metric_rating == "good",
            )
        ).scalar() or 0

        needs_improvement = db.query(func.count(AnalyticsPerformance.id)).filter(
            and_(
                AnalyticsPerformance.created_at >= period_start,
                AnalyticsPerformance.metric_type == metric_type,
                AnalyticsPerformance.metric_rating == "needs-improvement",
            )
        ).scalar() or 0

        poor = db.query(func.count(AnalyticsPerformance.id)).filter(
            and_(
                AnalyticsPerformance.created_at >= period_start,
                AnalyticsPerformance.metric_type == metric_type,
                AnalyticsPerformance.metric_rating == "poor",
            )
        ).scalar() or 0

        total = good + needs_improvement + poor
        if total > 0:
            distribution.append({
                "metric_type": metric_type.value,
                "good_pct": round(good / total * 100, 1),
                "needs_improvement_pct": round(needs_improvement / total * 100, 1),
                "poor_pct": round(poor / total * 100, 1),
                "total": total,
            })

    return {
        "web_vitals": web_vitals,
        "api_metrics": api_metrics,
        "slowest_pages": slowest_pages_list,
        "web_vitals_by_day": web_vitals_by_day,
        "web_vitals_by_device": web_vitals_by_device,
        "distribution": distribution,
    }


@router.get("/dashboard/timeseries")
def get_timeseries_data(
    request: Request,
    db: Session = Depends(get_db),
    metric: str = Query(..., description="Metrique: sessions, pageviews, searches, visitors"),
    days: int = Query(7, ge=1, le=90),
    _token: str = Depends(get_admin_token),
):
    """
    Retourne les données de série temporelle pour une métrique.
    """
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=days)
    period_end = now.date()

    data = []
    total = 0

    if metric == "sessions":
        results = db.query(
            func.date(AnalyticsSession.first_seen).label("date"),
            func.count(AnalyticsSession.id).label("value"),
        ).filter(
            AnalyticsSession.first_seen >= period_start
        ).group_by(
            func.date(AnalyticsSession.first_seen)
        ).order_by("date").all()

        data = [{"date": str(r.date), "value": r.value} for r in results]
        total = sum(r.value for r in results)

    elif metric == "pageviews":
        results = db.query(
            func.date(AnalyticsEvent.created_at).label("date"),
            func.count(AnalyticsEvent.id).label("value"),
        ).filter(
            and_(
                AnalyticsEvent.created_at >= period_start,
                AnalyticsEvent.event_type == DBEventType.PAGE_VIEW,
            )
        ).group_by(
            func.date(AnalyticsEvent.created_at)
        ).order_by("date").all()

        data = [{"date": str(r.date), "value": r.value} for r in results]
        total = sum(r.value for r in results)

    elif metric == "searches":
        results = db.query(
            func.date(AnalyticsSearch.created_at).label("date"),
            func.count(AnalyticsSearch.id).label("value"),
        ).filter(
            AnalyticsSearch.created_at >= period_start
        ).group_by(
            func.date(AnalyticsSearch.created_at)
        ).order_by("date").all()

        data = [{"date": str(r.date), "value": r.value} for r in results]
        total = sum(r.value for r in results)

    elif metric == "visitors":
        results = db.query(
            func.date(AnalyticsSession.first_seen).label("date"),
            func.count(distinct(AnalyticsSession.fingerprint_hash)).label("value"),
        ).filter(
            AnalyticsSession.first_seen >= period_start
        ).group_by(
            func.date(AnalyticsSession.first_seen)
        ).order_by("date").all()

        data = [{"date": str(r.date), "value": r.value} for r in results]
        total = sum(r.value for r in results)

    else:
        raise HTTPException(status_code=400, detail=f"Metrique inconnue: {metric}")

    return {
        "metric": metric,
        "period_start": str(period_start.date()),
        "period_end": str(period_end),
        "data": data,
        "total": total,
        "average": round(total / days, 2) if days > 0 else 0,
    }
