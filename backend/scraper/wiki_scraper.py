#!/usr/bin/env python3
"""
Scraper for Abiotic Factor Wiki.
Extracts items, recipes, and crafting information.

Features:
- Cache HTML pages locally in data/raw/ for re-parsing
- Parse all available sections (stats, crafting, upgrading, salvage, etc.)
- Handle multiple recipe variants
- Distinguish between craftable items and resources

Usage:
    python -m scraper.wiki_scraper
"""

import json
import re
import time
import hashlib
import webbrowser
import subprocess
import sys
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional
from urllib.parse import urljoin, quote_plus

from playwright.sync_api import sync_playwright, Browser, Page, Playwright
from bs4 import BeautifulSoup, Tag

# Global browser instance (initialized lazily)
_playwright: Optional[Playwright] = None
_browser: Optional[Browser] = None
_page: Optional[Page] = None


BASE_URL = "https://abioticfactor.wiki.gg"
DATA_PATH = Path(__file__).parent.parent.parent / "data"
OUTPUT_PATH = DATA_PATH / "recipes.json"
RAW_PATH = DATA_PATH / "raw"
ICONS_PATH = DATA_PATH / "icons"
ITEMS_LIST_CACHE = DATA_PATH / "items_list.json"

# Rate limiting
REQUEST_DELAY = 5  # seconds between requests

# Main items category URL
ITEMS_CATEGORY_URL = f"{BASE_URL}/wiki/Category:Items"


# =============================================================================
# Data Classes
# =============================================================================


@dataclass
class Ingredient:
    """An ingredient in a recipe."""
    item_id: str
    item_name: str
    quantity: int


@dataclass
class RecipeVariant:
    """A crafting recipe variant (some items have multiple ways to craft)."""
    ingredients: list[Ingredient]
    station: Optional[str] = None
    result_quantity: int = 1


@dataclass
class UpgradeRecipe:
    """An upgrade recipe that transforms this item into another."""
    result_id: str
    result_name: str
    ingredients: list[Ingredient]
    station: Optional[str] = None


@dataclass
class SalvageResult:
    """What you get when salvaging/dismantling an item."""
    item_id: str
    item_name: str
    quantity_min: int
    quantity_max: int


@dataclass
class TradeInfo:
    """Trade information with NPCs."""
    npc_name: str
    gives: list[Ingredient]  # What the NPC gives
    receives: list[Ingredient]  # What you give to the NPC


@dataclass
class WeaponStats:
    """Weapon-specific stats."""
    weapon_type: Optional[str] = None
    damage: Optional[int] = None
    damage_type: Optional[str] = None
    max_ammo: Optional[int] = None
    ammunition: Optional[str] = None
    secondary_action: Optional[str] = None


@dataclass
class GearStats:
    """Gear/armor-specific stats."""
    slot: Optional[str] = None
    armor: Optional[int] = None
    set_bonus_half: Optional[str] = None
    set_bonus_full: Optional[str] = None
    applied_effects: list[str] = field(default_factory=list)


@dataclass
class Location:
    """A location where an item can be found."""
    area: str
    details: Optional[str] = None


@dataclass
class SourceInfo:
    """How an item can be obtained."""
    type: str  # Crafting, Upgrading, World, Baking, Fishing, Burning, Trading, Killing, Salvaging
    # Optional details depending on type
    target: Optional[str] = None  # For Killing: what to kill
    npc: Optional[str] = None  # For Trading: NPC name
    item: Optional[str] = None  # For Trading/Baking/Burning/Salvaging: item involved
    station: Optional[str] = None  # For Baking/Salvaging: station used
    location: Optional[str] = None  # For Fishing: where to fish
    bait: Optional[str] = None  # For Fishing: bait required


@dataclass
class Item:
    """Complete item data from the wiki."""
    # Base info
    id: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    icon_local: Optional[str] = None  # Local path to downloaded icon
    wiki_url: Optional[str] = None
    category: Optional[str] = None

    # Stats
    weight: Optional[float] = None
    stack_size: Optional[int] = None

    # Durability
    durability: Optional[int] = None
    loss_chance: Optional[int] = None  # percentage
    repair_item: Optional[str] = None
    repair_quantity: Optional[int] = None

    # Research
    research_category: Optional[str] = None

    # Source types (how the item can be obtained)
    source_types: list[SourceInfo] = field(default_factory=list)
    locations: list[Location] = field(default_factory=list)

    # Crafting recipes (how to make this item)
    variants: list[RecipeVariant] = field(default_factory=list)

    # Upgrade recipes (what this item can become)
    upgrades: list[UpgradeRecipe] = field(default_factory=list)

    # Salvage results
    salvage: list[SalvageResult] = field(default_factory=list)

    # Trading
    trades: list[TradeInfo] = field(default_factory=list)

    # Related items
    see_also: list[str] = field(default_factory=list)  # List of item IDs

    # Weapon stats (if applicable)
    weapon: Optional[WeaponStats] = None

    # Gear stats (if applicable)
    gear: Optional[GearStats] = None


# =============================================================================
# Utility Functions
# =============================================================================


def slugify(name: str) -> str:
    """Convert item name to ID."""
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def get_cache_path(url: str) -> Path:
    """Get the cache file path for a URL."""
    # Use MD5 hash of URL for filename
    url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
    # Also include a readable part
    name_part = url.split('/')[-1][:50]
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name_part)
    return RAW_PATH / f"{safe_name}_{url_hash}.html"


def load_cached_page(url: str) -> Optional[BeautifulSoup]:
    """Load a page from cache if available."""
    cache_path = get_cache_path(url)
    if cache_path.exists():
        try:
            html = cache_path.read_text(encoding='utf-8')
            return BeautifulSoup(html, 'lxml')
        except Exception as e:
            print(f"  Cache read error: {e}")
    return None


def save_to_cache(url: str, html: str):
    """Save HTML content to cache."""
    RAW_PATH.mkdir(parents=True, exist_ok=True)
    cache_path = get_cache_path(url)
    cache_path.write_text(html, encoding='utf-8')


def is_cloudflare_challenge(html: str) -> bool:
    """Check if the response is a CloudFlare challenge page."""
    html_lower = html.lower()

    # Must have the challenge title AND not have wiki content
    is_challenge_page = (
        'just a moment' in html_lower or
        'checking your browser' in html_lower or
        'cf-browser-verification' in html_lower
    )

    # If we see wiki content, it's not a challenge
    has_wiki_content = (
        'mw-content' in html_lower or
        'wikigg' in html_lower or
        '<article' in html_lower
    )

    return is_challenge_page and not has_wiki_content


def open_in_browser(url: str):
    """Open URL in default browser for manual verification."""
    print(f"\n{'='*60}")
    print("CLOUDFLARE CHALLENGE DETECTED")
    print(f"Opening in browser: {url}")
    print("Please complete the captcha verification.")
    print(f"{'='*60}\n")

    # Try to open in browser
    try:
        webbrowser.open(url)
    except Exception:
        print(f"Could not open browser. Please manually visit:\n{url}")

    input("Press Enter after completing the verification...")


def get_browser_page(headless: bool = False) -> Page:
    """Get or create a Playwright browser page."""
    global _playwright, _browser, _page

    if _page is None:
        print("  Starting browser (headless={})...".format(headless))
        _playwright = sync_playwright().start()
        _browser = _playwright.chromium.launch(
            headless=headless,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = _browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15',
            viewport={'width': 1920, 'height': 1080},
            locale='fr-FR',
        )
        _page = context.new_page()

    return _page


def close_browser():
    """Close the browser and playwright properly."""
    global _playwright, _browser, _page

    if _page:
        try:
            _page.close()
        except Exception:
            pass
        _page = None

    if _browser:
        try:
            _browser.close()
        except Exception:
            pass
        _browser = None

    if _playwright:
        try:
            _playwright.stop()
        except Exception:
            pass
        _playwright = None


def fetch_page(url: str, use_cache: bool = True, retries: int = 5) -> Optional[BeautifulSoup]:
    """Fetch and parse a wiki page with caching and retry."""
    # Try cache first
    if use_cache:
        cached = load_cached_page(url)
        if cached:
            return cached

    # Fetch from web using Playwright
    page = get_browser_page()

    for attempt in range(retries):
        try:
            response = page.goto(url, wait_until='domcontentloaded', timeout=60000)

            if response is None:
                print(f"  No response from: {url}")
                continue

            if response.status == 404:
                print(f"  Page not found: {url}")
                return None

            if response.status == 429:
                wait_time = 15 * (attempt + 1)
                print(f"  Rate limited, waiting {wait_time}s...")
                time.sleep(wait_time)
                continue

            # Wait a bit for any JS to finish
            page.wait_for_timeout(1000)

            html = page.content()

            # Check for CloudFlare challenge
            if is_cloudflare_challenge(html):
                print(f"\n  CloudFlare challenge detected!")
                print(f"  Please solve the captcha in the browser window...")
                # Wait up to 60 seconds for user to solve captcha
                for _ in range(12):
                    page.wait_for_timeout(5000)
                    html = page.content()
                    if not is_cloudflare_challenge(html):
                        print(f"  CloudFlare resolved!")
                        break
                else:
                    print(f"  CloudFlare not resolved, retrying...")
                    continue

            # Save to cache
            save_to_cache(url, html)

            return BeautifulSoup(html, 'lxml')

        except Exception as e:
            wait_time = 5 * (attempt + 1)
            print(f"  Error: {e}, retry {attempt + 1}/{retries} in {wait_time}s...")
            time.sleep(wait_time)

    print(f"  FAILED after {retries} retries: {url}")
    return None


# =============================================================================
# Parsing Functions
# =============================================================================


def find_section(soup: BeautifulSoup, heading_text: str) -> Optional[Tag]:
    """Find a section by its heading text and return the content after it."""
    heading = soup.find(['h2', 'h3', 'h4'], string=re.compile(rf'^{heading_text}$', re.I))
    if not heading:
        # Try finding in span inside heading
        for h in soup.find_all(['h2', 'h3', 'h4']):
            span = h.find('span', class_='mw-headline')
            if span and re.match(rf'^{heading_text}$', span.get_text(strip=True), re.I):
                heading = h
                break
    return heading


def get_section_content(soup: BeautifulSoup, heading_text: str) -> Optional[Tag]:
    """Get all content between a heading and the next heading of same or higher level."""
    heading = find_section(soup, heading_text)
    if not heading:
        return None

    # Collect all siblings until next heading
    content = BeautifulSoup('<div></div>', 'lxml').div
    for sibling in heading.find_next_siblings():
        if sibling.name in ['h2', 'h3'] and heading.name in ['h2', 'h3']:
            break
        if sibling.name == 'h2':
            break
        content.append(sibling.__copy__())

    return content if content.contents else None


def parse_quantity(text: str) -> tuple[int, int]:
    """Parse quantity text like '1-2' or '3' into (min, max)."""
    text = text.strip()

    # Handle range "1-2" or "1 - 2"
    range_match = re.search(r'(\d+)\s*[-–]\s*(\d+)', text)
    if range_match:
        return int(range_match.group(1)), int(range_match.group(2))

    # Handle single number
    single_match = re.search(r'(\d+)', text)
    if single_match:
        qty = int(single_match.group(1))
        return qty, qty

    return 1, 1


def extract_item_from_link(link: Tag) -> tuple[Optional[str], Optional[str]]:
    """Extract item name and ID from a wiki link."""
    if not link:
        return None, None

    name = link.get('title', '') or link.get_text(strip=True)
    if name:
        return name, slugify(name)
    return None, None


def parse_stats(soup: BeautifulSoup, item: Item):
    """Parse the Stats section (weight, stack size)."""
    # Look for portable infobox or stat tables
    infobox = soup.select_one('.portable-infobox, .infobox, .pi-data')

    # Also look for stat rows in the page
    for row in soup.select('.pi-data, tr'):
        label_elem = row.select_one('.pi-data-label, th')
        value_elem = row.select_one('.pi-data-value, td')

        if not label_elem or not value_elem:
            continue

        label = label_elem.get_text(strip=True).lower()
        value = value_elem.get_text(strip=True)

        if 'weight' in label:
            try:
                item.weight = float(re.search(r'[\d.]+', value).group())
            except (AttributeError, ValueError):
                pass
        elif 'stack' in label:
            try:
                item.stack_size = int(re.search(r'\d+', value).group())
            except (AttributeError, ValueError):
                pass


def parse_durability(soup: BeautifulSoup, item: Item):
    """Parse durability from infobox using data-source attributes."""
    # Durability value
    dur_div = soup.find('div', attrs={'data-source': 'durability'})
    if dur_div:
        value_elem = dur_div.find('div', class_='pi-data-value')
        if value_elem:
            try:
                item.durability = int(re.search(r'\d+', value_elem.get_text()).group())
            except (AttributeError, ValueError):
                pass

    # Loss chance
    loss_div = soup.find('div', attrs={'data-source': 'durabilityLossChance'})
    if loss_div:
        value_elem = loss_div.find('div', class_='pi-data-value')
        if value_elem:
            try:
                item.loss_chance = int(re.search(r'\d+', value_elem.get_text()).group())
            except (AttributeError, ValueError):
                pass

    # Repair item
    repair_div = soup.find('div', attrs={'data-source': 'repairItem'})
    if repair_div:
        value_elem = repair_div.find('div', class_='pi-data-value')
        if value_elem:
            # Find the item slot with link and quantity
            link = value_elem.find('a', href=re.compile(r'/wiki/'))
            if link:
                item.repair_item = link.get('title') or link.get_text(strip=True)
            # Find quantity in af-item-slot__text
            qty_span = value_elem.find('span', class_='af-item-slot__text')
            if qty_span:
                try:
                    item.repair_quantity = int(qty_span.get_text(strip=True))
                except ValueError:
                    item.repair_quantity = 1
            else:
                item.repair_quantity = 1


def parse_research(soup: BeautifulSoup, item: Item):
    """Parse research section."""
    research_section = find_section(soup, 'Research')

    if research_section:
        content = research_section.find_next(['p', 'div', 'table'])
        if content:
            text = content.get_text(strip=True)
            # Common research categories: Metal, Plastic, Organic, etc.
            if text:
                item.research_category = text

    # Also check infobox
    for row in soup.select('.pi-data, tr'):
        label_elem = row.select_one('.pi-data-label, th')
        value_elem = row.select_one('.pi-data-value, td')

        if not label_elem or not value_elem:
            continue

        label = label_elem.get_text(strip=True).lower()
        if 'research' in label:
            item.research_category = value_elem.get_text(strip=True)
            break


def extract_link_after_pattern(elem: Tag, pattern: str) -> Optional[str]:
    """Extract the text of the first link that appears after a pattern in the element."""
    # Convert element to string to find pattern position in raw HTML
    elem_str = str(elem)
    pattern_pos = elem_str.lower().find(pattern.lower())
    if pattern_pos == -1:
        return None

    # Find all links and their positions in the HTML string
    for link in elem.find_all('a', href=re.compile(r'/wiki/')):
        link_str = str(link)
        link_pos = elem_str.find(link_str)
        if link_pos > pattern_pos:
            return link.get('title') or link.get_text(strip=True)
    return None


def extract_links_around_pattern(elem: Tag, before_pattern: str, after_pattern: str) -> tuple[Optional[str], Optional[str]]:
    """Extract links before and after patterns (e.g., 'trading X with Y')."""
    # Use HTML string for accurate position finding
    elem_str = str(elem)
    before_pos = elem_str.lower().find(before_pattern.lower())
    after_pos = elem_str.lower().find(after_pattern.lower())

    if before_pos == -1:
        return None, None

    first_link = None
    second_link = None

    for link in elem.find_all('a', href=re.compile(r'/wiki/')):
        link_str = str(link)
        link_pos = elem_str.find(link_str)

        if link_pos > before_pos and first_link is None:
            first_link = link.get('title') or link.get_text(strip=True)
        elif after_pos != -1 and link_pos > after_pos and second_link is None:
            second_link = link.get('title') or link.get_text(strip=True)

    return first_link, second_link


def parse_sources(soup: BeautifulSoup, item: Item):
    """Parse sources section to determine how item is obtained."""
    sources_section = find_section(soup, 'Sources')

    if not sources_section:
        return

    # Get all content after Sources heading
    content_parts = []
    for sibling in sources_section.find_next_siblings():
        if sibling.name in ['h2', 'h3']:
            break
        content_parts.append(sibling)

    full_text = ' '.join(elem.get_text() for elem in content_parts).lower()
    sources = []

    # === Trading: "trading X with Y" ===
    if 'trading' in full_text:
        for elem in content_parts:
            item_name, npc_name = extract_links_around_pattern(elem, 'trading', 'with')
            if item_name or npc_name:
                sources.append(SourceInfo(type='Trading', item=item_name, npc=npc_name))
                break
        else:
            # Fallback: just mark as Trading without details
            if not any(s.type == 'Trading' for s in sources):
                sources.append(SourceInfo(type='Trading'))

    # === Killing: "killing X" or "dropped by X" ===
    if 'killing' in full_text or 'dropped by' in full_text or 'drops when' in full_text:
        for elem in content_parts:
            target = extract_link_after_pattern(elem, 'killing')
            if not target:
                target = extract_link_after_pattern(elem, 'dropped by')
            if not target:
                target = extract_link_after_pattern(elem, 'drops when killing')
            if target:
                sources.append(SourceInfo(type='Killing', target=target))
                break
        else:
            if not any(s.type == 'Killing' for s in sources):
                sources.append(SourceInfo(type='Killing'))

    # === Baking: "baking X in Y" ===
    if 'baking' in full_text:
        for elem in content_parts:
            item_name, station = extract_links_around_pattern(elem, 'baking', 'in a')
            if not station:
                item_name, station = extract_links_around_pattern(elem, 'baking', 'in the')
            if item_name or station:
                sources.append(SourceInfo(type='Baking', item=item_name, station=station))
                break
        else:
            if not any(s.type == 'Baking' for s in sources):
                sources.append(SourceInfo(type='Baking'))

    # === Burning: "letting X burn" ===
    if 'burn while cooking' in full_text or 'letting' in full_text and 'burn' in full_text:
        for elem in content_parts:
            item_name = extract_link_after_pattern(elem, 'letting')
            if item_name:
                sources.append(SourceInfo(type='Burning', item=item_name))
                break
        else:
            if not any(s.type == 'Burning' for s in sources):
                sources.append(SourceInfo(type='Burning'))

    # === Fishing: "fished for/from in X" ===
    if 'fished' in full_text:
        for elem in content_parts:
            location = extract_link_after_pattern(elem, 'fished for in')
            if not location:
                location = extract_link_after_pattern(elem, 'fished from')
            bait = extract_link_after_pattern(elem, 'bait')
            if location or bait:
                sources.append(SourceInfo(type='Fishing', location=location, bait=bait))
                break
        else:
            if not any(s.type == 'Fishing' for s in sources):
                sources.append(SourceInfo(type='Fishing'))

    # === Salvaging: "salvaging X at Y" ===
    if 'salvaging' in full_text or 'salvage' in full_text or 'scrapping' in full_text:
        for elem in content_parts:
            item_name, station = extract_links_around_pattern(elem, 'salvaging', 'at')
            if not item_name:
                item_name, station = extract_links_around_pattern(elem, 'scrapping', 'at')
            if item_name or station:
                sources.append(SourceInfo(type='Salvaging', item=item_name, station=station))
                break
        else:
            if not any(s.type == 'Salvaging' for s in sources):
                sources.append(SourceInfo(type='Salvaging'))

    # === Crafting (generic) ===
    crafting_indicators = ['through crafting', 'obtained through crafting', 'by crafting']
    if any(ind in full_text for ind in crafting_indicators):
        if not any(s.type == 'Crafting' for s in sources):
            sources.append(SourceInfo(type='Crafting'))

    # === Upgrading ===
    if 'upgrading' in full_text or 'upgraded' in full_text:
        sources.append(SourceInfo(type='Upgrading'))

    # === World (found in locations) ===
    world_indicators = [
        'found throughout', 'found in', 'found at', 'found on',
        'can be found', 'is found', 'located in', 'located at',
        'spawns in', 'spawns at', 'obtained in'
    ]
    if any(ind in full_text for ind in world_indicators):
        if not any(s.type == 'World' for s in sources):
            sources.append(SourceInfo(type='World'))

    # If no specific source detected but section exists, assume World
    if not sources:
        sources.append(SourceInfo(type='World'))

    item.source_types = sources

    # Parse locations if world-spawned
    if any(s.type == 'World' for s in item.source_types):
        for elem in content_parts:
            for li in elem.find_all('li'):
                text = li.get_text(strip=True)
                if text and len(text) > 2:
                    bold = li.find('b')
                    if bold:
                        area = bold.get_text(strip=True)
                        details = text.replace(area, '').strip(' -:')
                    else:
                        parts = text.split(':')
                        if len(parts) > 1:
                            area = parts[0].strip()
                            details = ':'.join(parts[1:]).strip()
                        else:
                            area = text
                            details = None

                    if area:
                        item.locations.append(Location(area=area, details=details or None))


def parse_crafting(soup: BeautifulSoup, item: Item):
    """Parse crafting recipes using wiki's af-item-recipe classes."""
    # Find all recipe containers with the specific wiki class
    recipe_containers = soup.find_all('div', class_='af-item-recipe')

    for container in recipe_containers:
        ingredients = []
        station = None
        result_quantity = 1

        # First, check if the result is this item (skip Used In / Upgrades)
        result_div = container.find('div', class_='af-item-recipe__result')
        if result_div:
            result_link = result_div.find('a', href=re.compile(r'/wiki/'))
            if result_link:
                result_name = result_link.get('title') or result_link.get_text(strip=True)
                # Skip if result is not this item
                if slugify(result_name) != item.id:
                    continue

            qty_span = result_div.find('span', class_='af-item-slot__text')
            if qty_span:
                try:
                    result_quantity = int(qty_span.get_text(strip=True))
                except ValueError:
                    result_quantity = 1

        # Parse ingredients from af-item-recipe__ingredient divs
        ingredient_divs = container.find_all('div', class_=re.compile(r'af-item-recipe__ingredient'))
        for ing_div in ingredient_divs:
            # Find the link with item name
            link = ing_div.find('a', href=re.compile(r'/wiki/'))
            if not link:
                continue

            name = link.get('title') or link.get_text(strip=True)
            if not name:
                continue

            # Find quantity in af-item-slot__text
            qty_span = ing_div.find('span', class_='af-item-slot__text')
            qty = 1
            if qty_span:
                qty_text = qty_span.get_text(strip=True)
                try:
                    qty = int(qty_text)
                except ValueError:
                    qty = 1

            ingredients.append(Ingredient(
                item_id=slugify(name),
                item_name=name,
                quantity=qty
            ))

        # Parse station from af-item-recipe__process-note
        process_note = container.find('div', class_='af-item-recipe__process-note')
        if process_note:
            station = process_note.get_text(strip=True)

        if ingredients:
            item.variants.append(RecipeVariant(
                ingredients=ingredients,
                station=station,
                result_quantity=result_quantity
            ))


def _parse_crafting_fallback(soup: BeautifulSoup, item: Item):
    """Fallback parsing for crafting when structured parsing fails."""
    crafting_section = find_section(soup, 'Crafting')
    if not crafting_section:
        return

    # Look for any ingredient-like content
    ingredients = []
    station = None

    # Find all content until next section
    for sibling in crafting_section.find_next_siblings():
        if sibling.name in ['h2', 'h3']:
            break

        for link in sibling.find_all('a', href=re.compile(r'/wiki/')):
            name = link.get('title') or link.get_text(strip=True)
            if not name or name.lower() == item.name.lower():
                continue

            # Check for station
            if any(s in name for s in ['Bench', 'Workbench', 'Forge', 'Station']):
                station = name
                continue

            # Get quantity from surrounding text
            parent = link.parent
            if parent:
                text = parent.get_text()
                qty_match = re.search(r'(\d+)\s*[x×]|[x×]\s*(\d+)', text)
                qty = int(qty_match.group(1) or qty_match.group(2)) if qty_match else 1
            else:
                qty = 1

            ingredients.append(Ingredient(
                item_id=slugify(name),
                item_name=name,
                quantity=qty
            ))

    if ingredients:
        item.variants.append(RecipeVariant(
            ingredients=ingredients,
            station=station
        ))


def parse_upgrading(soup: BeautifulSoup, item: Item):
    """Parse upgrading recipes (what this item can become) using af-item-recipe format."""
    upgrading_section = find_section(soup, 'Upgrading')

    if not upgrading_section:
        return

    # Look for "Upgrades" subsection (not "Used In")
    # We want recipes where this item IS the source, not where it's used as ingredient
    in_upgrades_section = False
    in_used_in_section = False

    # Find all af-item-recipe containers in the Upgrading section
    for sibling in upgrading_section.find_next_siblings():
        if sibling.name == 'h2':
            break

        # Track subsections
        if sibling.name == 'h3':
            section_text = sibling.get_text(strip=True).lower()
            in_upgrades_section = 'upgrades' in section_text and 'used' not in section_text
            in_used_in_section = 'used in' in section_text
            continue

        # Skip "Used In" sections - those are recipes where this item is an ingredient
        if in_used_in_section:
            continue

        # Find recipe containers
        recipe_containers = []
        if hasattr(sibling, 'find_all'):
            recipe_containers = sibling.find_all('div', class_='af-item-recipe')
        if not recipe_containers and hasattr(sibling, 'get') and 'af-item-recipe' in (sibling.get('class') or []):
            recipe_containers = [sibling]

        for container in recipe_containers:
            ingredients = []
            result_name = None
            result_id = None
            station = None

            # Parse station from af-item-recipe__process-note
            process_note = container.find('div', class_='af-item-recipe__process-note')
            if process_note:
                station = process_note.get_text(strip=True)

            # Parse result from af-item-recipe__result
            result_div = container.find('div', class_='af-item-recipe__result')
            if result_div:
                result_link = result_div.find('a', href=re.compile(r'/wiki/'))
                if result_link:
                    result_name = result_link.get('title') or result_link.get_text(strip=True)
                    result_id = slugify(result_name)

            # Parse ingredients - all af-item-slot except the result
            all_slots = container.find_all('div', class_='af-item-slot')
            for slot in all_slots:
                # Skip if this slot is inside the result div
                if result_div and slot in result_div.descendants:
                    continue

                link = slot.find('a', href=re.compile(r'/wiki/'))
                if not link:
                    continue

                name = link.get('title') or link.get_text(strip=True)
                # Skip if this is the result item or the source item being upgraded
                if not name or name == result_name or slugify(name) == item.id:
                    continue

                # Get quantity
                qty_span = slot.find('span', class_='af-item-slot__text')
                qty = 1
                if qty_span:
                    try:
                        qty = int(qty_span.get_text(strip=True))
                    except ValueError:
                        qty = 1

                ingredients.append(Ingredient(
                    item_id=slugify(name),
                    item_name=name,
                    quantity=qty
                ))

            if result_name and result_id and ingredients:
                item.upgrades.append(UpgradeRecipe(
                    result_id=result_id,
                    result_name=result_name,
                    ingredients=ingredients,
                    station=station
                ))


def parse_salvage(soup: BeautifulSoup, item: Item):
    """Parse salvage results from infobox."""
    # Find salvage result divs (data-source starts with "scrapResults")
    salvage_divs = soup.find_all('div', attrs={'data-source': re.compile(r'^scrapResults')})

    for div in salvage_divs:
        # Find the slot inside
        slot = div.find('div', class_='af-item-slot')
        if not slot:
            continue

        # Find item link
        link = slot.find('a', href=re.compile(r'/wiki/'))
        if not link:
            continue

        name = link.get('title') or link.get_text(strip=True)
        if not name:
            continue

        # Find quantity in af-item-slot__text
        qty_span = slot.find('span', class_='af-item-slot__text')
        qty_min, qty_max = 1, 1
        if qty_span:
            qty_text = qty_span.get_text(strip=True)
            qty_min, qty_max = parse_quantity(qty_text)

        item.salvage.append(SalvageResult(
            item_id=slugify(name),
            item_name=name,
            quantity_min=qty_min,
            quantity_max=qty_max
        ))


def parse_trades(soup: BeautifulSoup, item: Item):
    """Parse trading information with NPCs."""
    trades_section = find_section(soup, 'Trades')

    if not trades_section:
        return

    # Look for trade tables
    for sibling in trades_section.find_next_siblings():
        if sibling.name in ['h2', 'h3']:
            break

        # Find NPC names and trade items
        tables = sibling.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    # Try to extract NPC and items
                    npc_link = cells[0].find('a')
                    if npc_link:
                        npc_name = npc_link.get('title') or npc_link.get_text(strip=True)

                        # Parse items in other cells
                        gives = []
                        receives = []

                        for cell in cells[1:]:
                            for link in cell.find_all('a', href=re.compile(r'/wiki/')):
                                item_name = link.get('title') or link.get_text(strip=True)
                                if item_name:
                                    text = cell.get_text()
                                    qty_min, qty_max = parse_quantity(text)
                                    # Simplified: just use gives for now
                                    gives.append(Ingredient(
                                        item_id=slugify(item_name),
                                        item_name=item_name,
                                        quantity=qty_min
                                    ))

                        if npc_name and gives:
                            item.trades.append(TradeInfo(
                                npc_name=npc_name,
                                gives=gives,
                                receives=[]
                            ))


def parse_see_also(soup: BeautifulSoup, item: Item):
    """Parse 'See Also' section for related items."""
    see_also_section = find_section(soup, 'See Also')

    if not see_also_section:
        # Try alternate name
        see_also_section = find_section(soup, 'See also')

    if not see_also_section:
        return

    # Only parse the first <ul> after the heading
    ul = see_also_section.find_next_sibling('ul')
    if not ul:
        return

    seen = set()
    for link in ul.find_all('a', href=re.compile(r'/wiki/')):
        name = link.get('title') or link.get_text(strip=True)
        if name and name.lower() != item.name.lower():
            item_id = slugify(name)
            if item_id not in seen:
                seen.add(item_id)
                item.see_also.append(item_id)


def parse_weapon(soup: BeautifulSoup, item: Item):
    """Parse weapon-specific stats."""
    weapon_section = find_section(soup, 'Weapon')

    if not weapon_section:
        return

    weapon = WeaponStats()
    found_any = False

    # Parse weapon stats table
    for sibling in weapon_section.find_next_siblings():
        if sibling.name in ['h2', 'h3']:
            break

        for row in sibling.find_all(['tr', 'div']):
            cells = row.find_all(['td', 'th', 'span'])
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True).lower()
                value = cells[1].get_text(strip=True)

                if 'type' in label:
                    weapon.weapon_type = value
                    found_any = True
                elif 'damage' in label and 'type' not in label:
                    try:
                        weapon.damage = int(re.search(r'\d+', value).group())
                        found_any = True
                    except (AttributeError, ValueError):
                        pass
                elif 'damage type' in label:
                    weapon.damage_type = value
                    found_any = True
                elif 'ammo' in label or 'max ammo' in label:
                    try:
                        weapon.max_ammo = int(re.search(r'\d+', value).group())
                        found_any = True
                    except (AttributeError, ValueError):
                        pass
                elif 'ammunition' in label:
                    weapon.ammunition = value
                    found_any = True
                elif 'secondary' in label:
                    weapon.secondary_action = value
                    found_any = True

    if found_any:
        item.weapon = weapon


def parse_gear(soup: BeautifulSoup, item: Item):
    """Parse gear/armor-specific stats from infobox."""
    gear = GearStats()
    found_any = False

    # Gear slot
    slot_div = soup.find('div', attrs={'data-source': 'gearSlot'})
    if slot_div:
        value_elem = slot_div.find('div', class_='pi-data-value')
        if value_elem:
            gear.slot = value_elem.get_text(strip=True)
            found_any = True

    # Armor value
    armor_div = soup.find('div', attrs={'data-source': 'gearArmor'})
    if armor_div:
        value_elem = armor_div.find('div', class_='pi-data-value')
        if value_elem:
            try:
                gear.armor = int(value_elem.get_text(strip=True))
                found_any = True
            except ValueError:
                pass

    # Set bonus (half)
    bonus_half_div = soup.find('div', attrs={'data-source': 'gearSetBonusHalf'})
    if bonus_half_div:
        value_elem = bonus_half_div.find('div', class_='pi-data-value')
        if value_elem:
            link = value_elem.find('a')
            if link:
                gear.set_bonus_half = link.get('title') or link.get_text(strip=True)
                found_any = True

    # Set bonus (full)
    bonus_full_div = soup.find('div', attrs={'data-source': 'gearSetBonusFull'})
    if bonus_full_div:
        value_elem = bonus_full_div.find('div', class_='pi-data-value')
        if value_elem:
            link = value_elem.find('a')
            if link:
                gear.set_bonus_full = link.get('title') or link.get_text(strip=True)
                found_any = True

    # Applied effects (from infobox)
    effects_div = soup.find('div', attrs={'data-source': 'gearAppliedEffects'})
    if effects_div:
        value_elem = effects_div.find('div', class_='pi-data-value')
        if value_elem:
            for link in value_elem.find_all('a'):
                effect_name = link.get('title') or link.get_text(strip=True)
                if effect_name:
                    gear.applied_effects.append(effect_name)
                    found_any = True

    if found_any:
        item.gear = gear


def parse_description(soup: BeautifulSoup, item: Item):
    """Parse item description from the page."""
    # Look for description in first paragraph or infobox
    first_p = soup.find('p')
    if first_p:
        text = first_p.get_text(strip=True)
        # Filter out navigational text
        if text and not text.startswith('Jump to') and len(text) > 10:
            item.description = text


# =============================================================================
# Main Parsing Function
# =============================================================================


def parse_category_from_page(soup: BeautifulSoup) -> Optional[str]:
    """Extract item category from the page."""
    # Look for category links in <li> elements (skip the "Categories" label)
    cat_links = soup.select('#mw-normal-catlinks li a, .mw-normal-catlinks li a')
    for link in cat_links:
        cat_name = link.get_text(strip=True)
        # Skip generic "Items" category, return the first specific one
        if cat_name and cat_name not in ['Items', 'Category:Items', 'Categories']:
            return cat_name.replace('_', ' ')
    return None


def parse_item_page(name: str, wiki_url: str) -> Optional[Item]:
    """Parse an individual item page for all available data."""
    soup = fetch_page(wiki_url)
    if not soup:
        return None

    # Get icon from page
    icon_url = get_item_icon_from_page(soup)

    # Download icon locally
    item_id = slugify(name)
    icon_local = download_icon(icon_url, item_id) if icon_url else None

    # Get category from page
    category = parse_category_from_page(soup)

    item = Item(
        id=item_id,
        name=name,
        icon_url=icon_url,
        icon_local=icon_local,
        wiki_url=wiki_url,
        category=category
    )

    # Parse all sections
    parse_description(soup, item)
    parse_stats(soup, item)
    parse_durability(soup, item)
    parse_research(soup, item)
    parse_sources(soup, item)
    parse_crafting(soup, item)
    parse_upgrading(soup, item)
    parse_salvage(soup, item)
    parse_trades(soup, item)
    parse_see_also(soup, item)
    parse_weapon(soup, item)
    parse_gear(soup, item)

    return item


# =============================================================================
# Category Scraping
# =============================================================================


def get_all_items_from_category(refresh: bool = False) -> list[tuple[str, str]]:
    """
    Get all items from Category:Items with pagination.
    Returns list of (name, wiki_url) tuples.
    Uses cache unless refresh=True.
    """
    # Try to load from cache
    if not refresh and ITEMS_LIST_CACHE.exists():
        try:
            with open(ITEMS_LIST_CACHE, 'r', encoding='utf-8') as f:
                cached = json.load(f)
                print(f"  Loaded {len(cached)} items from cache")
                return [(item['name'], item['url']) for item in cached]
        except Exception as e:
            print(f"  Cache read error: {e}")

    all_items = []
    url = ITEMS_CATEGORY_URL
    page_num = 1

    while url:
        print(f"  Fetching category page {page_num}...")
        soup = fetch_page(url)
        if not soup:
            break

        # Find all item links in the category listing
        # They are in #mw-pages section
        mw_pages = soup.select_one('#mw-pages')
        if not mw_pages:
            # Try alternative selector
            mw_pages = soup.select_one('.mw-category')

        if mw_pages:
            for link in mw_pages.select('a[href^="/wiki/"]'):
                href = link.get('href', '')
                name = link.get('title', '') or link.get_text(strip=True)

                # Skip category and special pages
                if not name or ':' in href:
                    continue

                wiki_url = urljoin(BASE_URL, href)
                all_items.append((name, wiki_url))

        # Find next page link
        next_link = soup.find('a', string='next page')
        if not next_link:
            # Try alternative
            next_link = soup.find('a', string=re.compile(r'next', re.I))

        if next_link and next_link.get('href'):
            url = urljoin(BASE_URL, next_link.get('href'))
            page_num += 1
            time.sleep(REQUEST_DELAY)
        else:
            url = None

    # Deduplicate by name
    seen = set()
    unique_items = []
    for item in all_items:
        if item[0] not in seen:
            seen.add(item[0])
            unique_items.append(item)

    # Save to cache
    try:
        with open(ITEMS_LIST_CACHE, 'w', encoding='utf-8') as f:
            json.dump([{'name': name, 'url': url} for name, url in unique_items], f, indent=2)
        print(f"  Saved {len(unique_items)} items to cache")
    except Exception as e:
        print(f"  Cache write error: {e}")

    print(f"  Found {len(unique_items)} unique items across {page_num} pages")
    return unique_items


def get_item_icon_from_page(soup: BeautifulSoup) -> Optional[str]:
    """Extract item icon URL from an item page."""
    # Look for item icon in infobox
    infobox = soup.select_one('.portable-infobox, .infobox')
    if infobox:
        img = infobox.find('img')
        if img:
            src = img.get('src', '')
            if src:
                return urljoin(BASE_URL, src)

    # Try to find any item icon
    for img in soup.find_all('img'):
        src = img.get('src', '')
        if 'Itemicon' in src or 'item' in src.lower():
            return urljoin(BASE_URL, src)

    return None


def download_icon(icon_url: str, item_id: str) -> Optional[str]:
    """Download an icon and save it locally. Returns local path if successful."""
    if not icon_url:
        return None

    # Determine file extension
    ext = '.png'
    if '.gif' in icon_url.lower():
        ext = '.gif'
    elif '.jpg' in icon_url.lower() or '.jpeg' in icon_url.lower():
        ext = '.jpg'
    elif '.webp' in icon_url.lower():
        ext = '.webp'

    local_path = ICONS_PATH / f"{item_id}{ext}"

    # Skip if already downloaded
    if local_path.exists():
        return str(local_path.relative_to(DATA_PATH.parent))

    try:
        ICONS_PATH.mkdir(parents=True, exist_ok=True)

        # Use the browser page to download the image
        page = get_browser_page()
        response = page.request.get(icon_url)

        if response.ok:
            local_path.write_bytes(response.body())
            return str(local_path.relative_to(DATA_PATH.parent))
    except Exception as e:
        print(f"  Failed to download icon: {e}")

    return None


# =============================================================================
# Main Scraping Functions
# =============================================================================


def item_to_dict(item: Item) -> dict:
    """Convert Item to dictionary, cleaning up empty fields."""
    d = asdict(item)

    # Remove None values and empty lists at top level
    cleaned = {}
    for key, value in d.items():
        if value is None:
            continue
        if isinstance(value, list) and len(value) == 0:
            continue
        cleaned[key] = value

    return cleaned


def load_existing_items() -> dict[str, dict]:
    """Load existing items from file if it exists."""
    if OUTPUT_PATH.exists():
        try:
            with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
                items = json.load(f)
                print(f"Loaded {len(items)} existing items")
                return items
        except Exception as e:
            print(f"Could not load existing items: {e}")
    return {}


def save_items(items: dict[str, dict]):
    """Save items to JSON file."""
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(items)} items to {OUTPUT_PATH}")


def scrape_all(force_refresh: bool = False, refresh_categories: bool = False) -> dict[str, dict]:
    """Scrape all items from the wiki."""
    # Load existing items to resume if interrupted
    all_items = {} if force_refresh else load_existing_items()

    print("\n=== Fetching item list from Category:Items ===")
    items = get_all_items_from_category(refresh=refresh_categories)
    print(f"Total items to scrape: {len(items)}")

    # Save checkpoint every N items
    checkpoint_interval = 50

    for i, (name, wiki_url) in enumerate(items):
        item_id = slugify(name)

        # Skip if already scraped (unless forcing refresh)
        if not force_refresh and item_id in all_items:
            print(f"  [{i+1}/{len(items)}] {name} (cached)")
            continue

        # Check if already in cache BEFORE fetching
        cache_path = get_cache_path(wiki_url)
        was_cached = cache_path.exists()

        print(f"  [{i+1}/{len(items)}] {name}...")
        item = parse_item_page(name, wiki_url)

        if item:
            all_items[item.id] = item_to_dict(item)

        # Rate limiting (only if we actually fetched from network)
        if not was_cached:
            time.sleep(REQUEST_DELAY)

        # Save checkpoint periodically
        if (i + 1) % checkpoint_interval == 0:
            save_items(all_items)
            print(f"  Checkpoint saved: {len(all_items)} items")

    # Final save
    save_items(all_items)
    print(f"Complete: {len(all_items)} items total")

    return all_items


# =============================================================================
# Entry Point
# =============================================================================


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Scrape Abiotic Factor Wiki')
    parser.add_argument('--force', '-f', action='store_true',
                        help='Force re-parse all items from HTML cache')
    parser.add_argument('--refresh-categories', '-c', action='store_true',
                        help='Refresh the category/items list from wiki')
    args = parser.parse_args()

    print("Starting Abiotic Factor Wiki scraper...")
    print(f"Cache directory: {RAW_PATH}")
    print(f"Output file: {OUTPUT_PATH}")

    if args.force:
        print("\n[Force mode] Re-parsing all items from HTML cache")
    if args.refresh_categories:
        print("\n[Refresh categories] Will fetch category pages from wiki")

    items = scrape_all(force_refresh=args.force, refresh_categories=args.refresh_categories)
    save_items(items)
    print(f"\nDone! Scraped {len(items)} items.")
