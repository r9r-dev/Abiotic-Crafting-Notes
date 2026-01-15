#!/usr/bin/env python3
"""
Scraper for Abiotic Factor Wiki.
Extracts items, recipes, and crafting information.

Usage:
    python -m scraper.wiki_scraper
"""

import json
import re
import time
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

import httpx
from bs4 import BeautifulSoup


BASE_URL = "https://abioticfactor.wiki.gg"
OUTPUT_PATH = Path(__file__).parent.parent.parent / "data" / "recipes.json"

# Categories to scrape
CATEGORIES = [
    "Resources_and_Sub-components",
    "Furniture_and_Benches",
    "Tools",
    "Light_and_Power",
    "Base_Defense",
    "Weapons_and_Ammo",
    "Armor_and_Gear",
    "Health_and_Medical",
    "Food_and_Cooking",
    "Farming",
    "Travel_and_Vehicles"
]


@dataclass
class Ingredient:
    item_id: str
    item_name: str
    quantity: int


@dataclass
class RecipeVariant:
    ingredients: list[Ingredient]
    station: Optional[str] = None


@dataclass
class Recipe:
    id: str
    name: str
    icon_url: Optional[str]
    category: str
    weight: Optional[float] = None
    stack_size: Optional[int] = None
    durability: Optional[int] = None
    variants: list[RecipeVariant] = None
    repair_material: Optional[str] = None
    repair_quantity: Optional[int] = None
    wiki_url: Optional[str] = None

    def __post_init__(self):
        if self.variants is None:
            self.variants = []


def slugify(name: str) -> str:
    """Convert item name to ID."""
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def fetch_page(url: str, retries: int = 5) -> BeautifulSoup | None:
    """Fetch and parse a wiki page with retry on all errors."""
    for attempt in range(retries):
        try:
            response = httpx.get(url, timeout=30, follow_redirects=True)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'lxml')
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                wait_time = 10 * (attempt + 1)
                print(f"  Rate limited, waiting {wait_time}s...")
            else:
                wait_time = 5 * (attempt + 1)
                print(f"  HTTP error {e.response.status_code}, retry {attempt + 1}/{retries} in {wait_time}s...")
            time.sleep(wait_time)
        except Exception as e:
            wait_time = 5 * (attempt + 1)
            print(f"  Error: {e}, retry {attempt + 1}/{retries} in {wait_time}s...")
            time.sleep(wait_time)
    print(f"  FAILED after {retries} retries: {url}")
    return None


def get_items_from_category(category: str) -> list[tuple[str, str, str]]:
    """Get list of (name, icon_url, wiki_url) from a category page."""
    url = f"{BASE_URL}/wiki/{category}"
    soup = fetch_page(url)
    if not soup:
        return []

    items = []
    # Look for item links with icons
    for link in soup.select('a[href^="/wiki/"]'):
        img = link.find('img')
        if img and 'Itemicon' in img.get('src', ''):
            name = link.get('title', '') or link.get_text(strip=True)
            if name and name not in ['Items', category.replace('_', ' ')]:
                icon_url = img.get('src', '')
                if icon_url.startswith('/'):
                    icon_url = BASE_URL + icon_url
                wiki_url = BASE_URL + link.get('href', '')
                items.append((name, icon_url, wiki_url))

    # Deduplicate
    seen = set()
    unique_items = []
    for item in items:
        if item[0] not in seen:
            seen.add(item[0])
            unique_items.append(item)

    return unique_items


def parse_item_page(name: str, icon_url: str, wiki_url: str, category: str) -> Recipe | None:
    """Parse an individual item page for details."""
    soup = fetch_page(wiki_url)
    if not soup:
        return None

    recipe = Recipe(
        id=slugify(name),
        name=name,
        icon_url=icon_url,
        category=category.replace('_', ' '),
        wiki_url=wiki_url
    )

    # Try to find infobox data
    infobox = soup.select_one('.portable-infobox, .infobox')
    if infobox:
        # Extract properties
        for row in infobox.select('tr, .pi-data'):
            label_elem = row.select_one('th, .pi-data-label')
            value_elem = row.select_one('td, .pi-data-value')

            if not label_elem or not value_elem:
                continue

            label = label_elem.get_text(strip=True).lower()
            value = value_elem.get_text(strip=True)

            if 'weight' in label:
                try:
                    recipe.weight = float(re.search(r'[\d.]+', value).group())
                except:
                    pass
            elif 'stack' in label:
                try:
                    recipe.stack_size = int(re.search(r'\d+', value).group())
                except:
                    pass
            elif 'durability' in label:
                try:
                    recipe.durability = int(re.search(r'\d+', value).group())
                except:
                    pass

    # Try to find crafting recipe
    recipe_section = soup.find(['h2', 'h3'], string=re.compile(r'craft|recipe', re.I))
    if recipe_section:
        # Look for recipe table after section
        next_elem = recipe_section.find_next(['table', 'div'])
        if next_elem:
            # Parse ingredients from recipe display
            ingredients = []
            for item_link in next_elem.select('a[href^="/wiki/"]'):
                item_name = item_link.get('title', '') or item_link.get_text(strip=True)
                if item_name and item_name != name:
                    # Try to find quantity
                    parent_text = item_link.parent.get_text()
                    qty_match = re.search(r'(\d+)\s*x?\s*$|^x?\s*(\d+)', parent_text)
                    qty = int(qty_match.group(1) or qty_match.group(2)) if qty_match else 1

                    ingredients.append(Ingredient(
                        item_id=slugify(item_name),
                        item_name=item_name,
                        quantity=qty
                    ))

            if ingredients:
                recipe.variants.append(RecipeVariant(ingredients=ingredients))

    return recipe


def load_existing_recipes() -> dict[str, dict]:
    """Load existing recipes from file if it exists."""
    if OUTPUT_PATH.exists():
        try:
            with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
                recipes = json.load(f)
                print(f"Loaded {len(recipes)} existing recipes")
                return recipes
        except Exception as e:
            print(f"Could not load existing recipes: {e}")
    return {}


def scrape_all() -> dict[str, dict]:
    """Scrape all items from the wiki."""
    # Load existing recipes to resume if interrupted
    all_recipes = load_existing_recipes()

    for category in CATEGORIES:
        print(f"\n=== Scraping {category} ===")
        items = get_items_from_category(category)
        print(f"Found {len(items)} items")

        for i, (name, icon_url, wiki_url) in enumerate(items):
            item_id = slugify(name)
            # Skip if already scraped
            if item_id in all_recipes:
                print(f"  [{i+1}/{len(items)}] {name} (already scraped)")
                continue

            print(f"  [{i+1}/{len(items)}] {name}...")
            recipe = parse_item_page(name, icon_url, wiki_url, category)
            if recipe:
                all_recipes[recipe.id] = asdict(recipe)

            # Rate limiting
            time.sleep(5)  # Rate limiting - be nice to the wiki

        # Save after each category
        save_recipes(all_recipes)
        print(f"Progress saved: {len(all_recipes)} recipes total")

    return all_recipes


def save_recipes(recipes: dict[str, dict]):
    """Save recipes to JSON file."""
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(recipes)} recipes to {OUTPUT_PATH}")


if __name__ == "__main__":
    print("Starting Abiotic Factor Wiki scraper...")
    recipes = scrape_all()
    save_recipes(recipes)
    print("Done!")
