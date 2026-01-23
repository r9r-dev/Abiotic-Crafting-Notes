"""Service de génération de fingerprint anonymisé."""

import hashlib
import re
from typing import Optional
from app.schemas.analytics import FingerprintData, DeviceType
from app.config import get_settings


def generate_fingerprint_hash(fingerprint: FingerprintData, salt: str) -> str:
    """
    Génère un hash SHA-256 anonymisé à partir des composants du fingerprint.

    Le hash est deterministe pour un meme ensemble de composants,
    permettant d'identifier les visiteurs recurrents sans stocker
    d'informations personnelles.

    Args:
        fingerprint: Composants du fingerprint collectes cote client
        salt: Sel serveur pour renforcer l'anonymisation

    Returns:
        Hash SHA-256 hexadecimal de 64 caracteres
    """
    # Construire une chaine stable a partir des composants
    components = [
        fingerprint.user_agent,
        str(fingerprint.screen_width),
        str(fingerprint.screen_height),
        fingerprint.language,
        fingerprint.timezone,
        str(fingerprint.color_depth or ""),
        str(fingerprint.device_memory or ""),
        str(fingerprint.hardware_concurrency or ""),
        fingerprint.platform or "",
        fingerprint.canvas_hash or "",
        fingerprint.webgl_hash or "",
    ]

    # Joindre avec un separateur unique et ajouter le sel
    fingerprint_string = "|".join(components) + "|" + salt

    # Générer le hash SHA-256
    return hashlib.sha256(fingerprint_string.encode("utf-8")).hexdigest()


def hash_ip_address(ip_address: str, salt: str) -> str:
    """
    Génère un hash anonymisé de l'adresse IP.

    Args:
        ip_address: Adresse IP du client
        salt: Sel serveur

    Returns:
        Hash SHA-256 de l'IP
    """
    ip_string = ip_address + "|" + salt
    return hashlib.sha256(ip_string.encode("utf-8")).hexdigest()


def detect_device_type(user_agent: str) -> DeviceType:
    """
    Détecte le type d'appareil à partir du User-Agent.

    Args:
        user_agent: Chaîne User-Agent du navigateur

    Returns:
        Type d'appareil détecté
    """
    ua_lower = user_agent.lower()

    # Tablettes (à vérifier avant mobile car certains patterns se chevauchent)
    tablet_patterns = [
        r"ipad",
        r"tablet",
        r"playbook",
        r"silk",
        r"android(?!.*mobile)",
        r"kindle",
        r"surface",
    ]
    for pattern in tablet_patterns:
        if re.search(pattern, ua_lower):
            return DeviceType.TABLET

    # Mobile
    mobile_patterns = [
        r"mobile",
        r"iphone",
        r"ipod",
        r"android.*mobile",
        r"windows phone",
        r"blackberry",
        r"bb10",
        r"opera mini",
        r"opera mobi",
        r"iemobile",
        r"wpdesktop",
    ]
    for pattern in mobile_patterns:
        if re.search(pattern, ua_lower):
            return DeviceType.MOBILE

    # Desktop par défaut si on détecte un navigateur connu
    desktop_indicators = [
        r"windows nt",
        r"macintosh",
        r"mac os x",
        r"linux x86_64",
        r"linux i686",
        r"cros",  # Chrome OS
    ]
    for pattern in desktop_indicators:
        if re.search(pattern, ua_lower):
            return DeviceType.DESKTOP

    return DeviceType.UNKNOWN


def detect_browser(user_agent: str) -> Optional[str]:
    """
    Détecte le navigateur à partir du User-Agent.

    Args:
        user_agent: Chaîne User-Agent du navigateur

    Returns:
        Nom du navigateur détecté ou None
    """
    ua_lower = user_agent.lower()

    # Ordre important : vérifier les navigateurs spécifiques avant les génériques
    browsers = [
        (r"edg[ea]?/", "Edge"),
        (r"opr/|opera", "Opera"),
        (r"brave", "Brave"),
        (r"vivaldi", "Vivaldi"),
        (r"firefox/", "Firefox"),
        (r"safari/(?!.*chrome)", "Safari"),
        (r"chrome/(?!.*edg)", "Chrome"),
        (r"msie|trident", "Internet Explorer"),
    ]

    for pattern, name in browsers:
        if re.search(pattern, ua_lower):
            return name

    return None


def detect_os(user_agent: str) -> Optional[str]:
    """
    Détecte le système d'exploitation à partir du User-Agent.

    Args:
        user_agent: Chaîne User-Agent du navigateur

    Returns:
        Nom du système d'exploitation détecté ou None
    """
    ua_lower = user_agent.lower()

    os_patterns = [
        (r"windows nt 10", "Windows 10"),
        (r"windows nt 11", "Windows 11"),
        (r"windows nt 6\.3", "Windows 8.1"),
        (r"windows nt 6\.2", "Windows 8"),
        (r"windows nt 6\.1", "Windows 7"),
        (r"windows nt", "Windows"),
        (r"mac os x 10[._]15", "macOS Catalina"),
        (r"mac os x 11", "macOS Big Sur"),
        (r"mac os x 12", "macOS Monterey"),
        (r"mac os x 13", "macOS Ventura"),
        (r"mac os x 14", "macOS Sonoma"),
        (r"mac os x", "macOS"),
        (r"iphone os|ios", "iOS"),
        (r"ipad", "iPadOS"),
        (r"android", "Android"),
        (r"linux", "Linux"),
        (r"cros", "Chrome OS"),
    ]

    for pattern, name in os_patterns:
        if re.search(pattern, ua_lower):
            return name

    return None


def generate_session_id(fingerprint_hash: str, timestamp: float, salt: str) -> str:
    """
    Génère un identifiant de session unique.

    Args:
        fingerprint_hash: Hash du fingerprint
        timestamp: Timestamp Unix de creation
        salt: Sel serveur

    Returns:
        Identifiant de session unique (64 caracteres hex)
    """
    session_string = f"{fingerprint_hash}|{timestamp}|{salt}"
    return hashlib.sha256(session_string.encode("utf-8")).hexdigest()
