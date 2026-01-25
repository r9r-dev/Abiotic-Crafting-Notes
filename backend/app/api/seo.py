"""SEO endpoints: sitemap.xml, OG image generation, and SSR for crawlers."""

import html
import io
import os
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Response, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, NPC, CompendiumEntry, NpcConversation

router = APIRouter(tags=["seo"])

BASE_URL = "https://abioticscience.fr"


def generate_ssr_html(
    title: str,
    description: str,
    url: str,
    og_image: str,
    entity_type: Optional[str] = None,
    structured_data: Optional[dict] = None,
) -> str:
    """Generate HTML with proper meta tags for crawlers."""
    title_escaped = html.escape(title)
    desc_escaped = html.escape(description[:200] if description else "")
    url_escaped = html.escape(url)
    og_image_escaped = html.escape(og_image)

    structured_data_script = ""
    if structured_data:
        import json
        structured_data_script = f'''
    <script type="application/ld+json">
    {json.dumps(structured_data, ensure_ascii=False, indent=2)}
    </script>'''

    # Path for SPA redirect (remove base URL)
    path = url.replace(BASE_URL, "")

    return f'''<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/logo.png" />
    <link rel="apple-touch-icon" href="/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0a0f14" />

    <!-- SEO Meta Tags -->
    <title>{title_escaped} - Abiotic Science</title>
    <meta name="description" content="{desc_escaped}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="{url_escaped}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{url_escaped}" />
    <meta property="og:title" content="{title_escaped}" />
    <meta property="og:description" content="{desc_escaped}" />
    <meta property="og:image" content="{og_image_escaped}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:site_name" content="Abiotic Science" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="{url_escaped}" />
    <meta name="twitter:title" content="{title_escaped}" />
    <meta name="twitter:description" content="{desc_escaped}" />
    <meta name="twitter:image" content="{og_image_escaped}" />
    {structured_data_script}

    <!-- Redirect real users to SPA (crawlers don't execute JS) -->
    <script>
      window.location.replace('/?ssr=0#' + '{path}');
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0;url=/?ssr=0#{path}">
    </noscript>

    <style>
      html, body {{ margin: 0; padding: 0; background-color: #0a0f14; color: #fff; font-family: system-ui, sans-serif; }}
      .container {{ max-width: 800px; margin: 0 auto; padding: 2rem; text-align: center; }}
      h1 {{ color: #22c55e; }}
      a {{ color: #22c55e; }}
      .loading {{ animation: pulse 1.5s ease-in-out infinite; }}
      @keyframes pulse {{ 0%, 100% {{ opacity: 0.4; }} 50% {{ opacity: 1; }} }}
    </style>
  </head>
  <body>
    <div class="container">
      <p class="loading">Chargement...</p>
      <noscript>
        <h1>{title_escaped}</h1>
        <p>{desc_escaped}</p>
        <p><a href="{url_escaped}">Voir sur Abiotic Science</a></p>
      </noscript>
    </div>
  </body>
</html>'''

# Colors
BG_COLOR = (10, 15, 20)  # #0a0f14
ACCENT_COLOR = (34, 197, 94)  # Green #22c55e
TEXT_COLOR = (255, 255, 255)
MUTED_COLOR = (148, 163, 184)  # #94a3b8
DARK_ACCENT = (20, 83, 45)  # Dark green


def get_font(size: int, bold: bool = False):
    """Load Inter font with fallback."""
    from PIL import ImageFont

    font_paths = [
        # Inter fonts (installed via fonts-inter)
        "/usr/share/fonts/truetype/inter/Inter-Bold.ttf" if bold else "/usr/share/fonts/truetype/inter/Inter-Regular.ttf",
        "/usr/share/fonts/opentype/inter/Inter-Bold.otf" if bold else "/usr/share/fonts/opentype/inter/Inter-Regular.otf",
        # Fallback to DejaVu
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]

    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except (OSError, IOError):
                continue

    return ImageFont.load_default()


def draw_rounded_rect(draw, xy, radius, fill):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = xy
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    draw.ellipse([x1, y1, x1 + radius * 2, y1 + radius * 2], fill=fill)
    draw.ellipse([x2 - radius * 2, y1, x2, y1 + radius * 2], fill=fill)
    draw.ellipse([x1, y2 - radius * 2, x1 + radius * 2, y2], fill=fill)
    draw.ellipse([x2 - radius * 2, y2 - radius * 2, x2, y2], fill=fill)


@router.get("/sitemap.xml", response_class=Response)
def generate_sitemap(db: Session = Depends(get_db)):
    """Generate dynamic sitemap.xml with all indexable URLs."""
    now = datetime.utcnow().strftime("%Y-%m-%d")

    urls = [
        {"loc": BASE_URL, "priority": "1.0", "changefreq": "daily"},
    ]

    # Items
    for item in db.query(Item.row_id).all():
        urls.append({
            "loc": f"{BASE_URL}/item/{item.row_id}",
            "priority": "0.8",
            "changefreq": "weekly",
        })

    # NPCs
    for npc in db.query(NPC.row_id).all():
        urls.append({
            "loc": f"{BASE_URL}/npc/{npc.row_id}",
            "priority": "0.7",
            "changefreq": "weekly",
        })

    # Compendium
    for entry in db.query(CompendiumEntry.row_id).all():
        urls.append({
            "loc": f"{BASE_URL}/compendium/{entry.row_id}",
            "priority": "0.7",
            "changefreq": "weekly",
        })

    # Dialogues
    for dialogue in db.query(NpcConversation.row_id).all():
        urls.append({
            "loc": f"{BASE_URL}/dialogue/{dialogue.row_id}",
            "priority": "0.6",
            "changefreq": "monthly",
        })

    xml_parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for url in urls:
        xml_parts.append("  <url>")
        xml_parts.append(f"    <loc>{url['loc']}</loc>")
        xml_parts.append(f"    <lastmod>{now}</lastmod>")
        xml_parts.append(f"    <changefreq>{url['changefreq']}</changefreq>")
        xml_parts.append(f"    <priority>{url['priority']}</priority>")
        xml_parts.append("  </url>")

    xml_parts.append("</urlset>")

    return Response(
        content="\n".join(xml_parts),
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/og-image/default")
def generate_default_og_image():
    """Generate default OG image for the site."""
    from PIL import Image, ImageDraw

    width, height = 1200, 630
    img = Image.new("RGB", (width, height), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Background pattern - subtle grid
    for x in range(0, width, 40):
        draw.line([(x, 0), (x, height)], fill=(20, 25, 30), width=1)
    for y in range(0, height, 40):
        draw.line([(0, y), (width, y)], fill=(20, 25, 30), width=1)

    # Accent gradient at bottom
    for i in range(100):
        alpha = 1 - (i / 100)
        color = (
            int(DARK_ACCENT[0] * alpha + BG_COLOR[0] * (1 - alpha)),
            int(DARK_ACCENT[1] * alpha + BG_COLOR[1] * (1 - alpha)),
            int(DARK_ACCENT[2] * alpha + BG_COLOR[2] * (1 - alpha)),
        )
        draw.rectangle([(0, height - 100 + i), (width, height - 100 + i + 1)], fill=color)

    # Bottom accent bar
    draw.rectangle([(0, height - 6), (width, height)], fill=ACCENT_COLOR)

    # Fonts
    title_font = get_font(64, bold=True)
    subtitle_font = get_font(28)
    url_font = get_font(24, bold=True)

    # Title
    title = "ABIOTIC SCIENCE"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(
        ((width - title_width) // 2, 200),
        title,
        fill=TEXT_COLOR,
        font=title_font,
    )

    # Subtitle
    subtitle = "Base de données complète pour Abiotic Factor"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    draw.text(
        ((width - subtitle_width) // 2, 290),
        subtitle,
        fill=MUTED_COLOR,
        font=subtitle_font,
    )

    # Features
    features = ["Items", "Recettes", "NPCs", "Compendium"]
    feature_font = get_font(20)
    total_width = 0
    feature_widths = []
    for f in features:
        bbox = draw.textbbox((0, 0), f, font=feature_font)
        w = bbox[2] - bbox[0] + 40
        feature_widths.append(w)
        total_width += w
    total_width += 20 * (len(features) - 1)

    x_start = (width - total_width) // 2
    y_pos = 380
    for i, f in enumerate(features):
        w = feature_widths[i]
        draw_rounded_rect(draw, (x_start, y_pos, x_start + w, y_pos + 36), 18, DARK_ACCENT)
        bbox = draw.textbbox((0, 0), f, font=feature_font)
        text_w = bbox[2] - bbox[0]
        draw.text((x_start + (w - text_w) // 2, y_pos + 8), f, fill=ACCENT_COLOR, font=feature_font)
        x_start += w + 20

    # URL
    url = "abioticscience.fr"
    url_bbox = draw.textbbox((0, 0), url, font=url_font)
    url_width = url_bbox[2] - url_bbox[0]
    draw.text(
        ((width - url_width) // 2, 480),
        url,
        fill=ACCENT_COLOR,
        font=url_font,
    )

    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG", optimize=True)
    img_bytes.seek(0)

    return StreamingResponse(
        img_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/og-image/{entity_type}/{row_id}")
def generate_entity_og_image(
    entity_type: Literal["item", "npc", "compendium", "dialogue"],
    row_id: str,
    db: Session = Depends(get_db),
):
    """Generate dynamic OG image for an entity."""
    from PIL import Image, ImageDraw

    # Get entity info
    name: Optional[str] = None
    description: Optional[str] = None
    icon_path: Optional[str] = None
    category: Optional[str] = None

    if entity_type == "item":
        item = db.query(Item.name, Item.description, Item.icon_path, Item.category).filter(
            Item.row_id == row_id
        ).first()
        if item:
            name = item.name
            description = item.description
            icon_path = item.icon_path
            category = item.category.value.upper() if item.category else "ITEM"
    elif entity_type == "npc":
        npc = db.query(NPC.name).filter(NPC.row_id == row_id).first()
        if npc:
            name = npc.name
            category = "NPC"
    elif entity_type == "compendium":
        entry = db.query(CompendiumEntry.title, CompendiumEntry.category).filter(
            CompendiumEntry.row_id == row_id
        ).first()
        if entry:
            name = entry.title
            category = (entry.category or "COMPENDIUM").upper()
    elif entity_type == "dialogue":
        dialogue = db.query(NpcConversation.npc_name).filter(
            NpcConversation.row_id == row_id
        ).first()
        if dialogue:
            name = dialogue.npc_name
            category = "DIALOGUE"

    if not name:
        raise HTTPException(status_code=404, detail=f"{entity_type} '{row_id}' not found")

    width, height = 1200, 630
    img = Image.new("RGB", (width, height), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Background pattern
    for x in range(0, width, 40):
        draw.line([(x, 0), (x, height)], fill=(20, 25, 30), width=1)
    for y in range(0, height, 40):
        draw.line([(0, y), (width, y)], fill=(20, 25, 30), width=1)

    # Bottom accent bar
    draw.rectangle([(0, height - 6), (width, height)], fill=ACCENT_COLOR)

    # Try to load icon
    icon_loaded = False
    icon_size = 180
    icon_x = 80
    icon_y = (height - icon_size) // 2 - 20

    if icon_path:
        possible_paths = [
            f"/app/data/icons/{icon_path}.png",
            f"/app/data/icons/{icon_path}",
        ]
        for path in possible_paths:
            if os.path.exists(path):
                try:
                    icon = Image.open(path).convert("RGBA")
                    icon = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)

                    # Draw icon background
                    draw_rounded_rect(
                        draw,
                        (icon_x - 20, icon_y - 20, icon_x + icon_size + 20, icon_y + icon_size + 20),
                        20,
                        (30, 35, 40)
                    )

                    img.paste(icon, (icon_x, icon_y), icon)
                    icon_loaded = True
                    break
                except Exception:
                    pass

    # Text position
    text_x = icon_x + icon_size + 80 if icon_loaded else 100

    # Fonts
    title_font = get_font(48, bold=True)
    category_font = get_font(20, bold=True)
    desc_font = get_font(22)
    url_font = get_font(18)

    # Category badge
    if category:
        cat_bbox = draw.textbbox((0, 0), category, font=category_font)
        cat_width = cat_bbox[2] - cat_bbox[0] + 24
        cat_height = 32
        cat_y = 180
        draw_rounded_rect(draw, (text_x, cat_y, text_x + cat_width, cat_y + cat_height), 16, DARK_ACCENT)
        draw.text((text_x + 12, cat_y + 6), category, fill=ACCENT_COLOR, font=category_font)

    # Title
    max_title_width = width - text_x - 80
    title_text = name
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    while title_bbox[2] - title_bbox[0] > max_title_width and len(title_text) > 10:
        title_text = title_text[:-4] + "..."
        title_bbox = draw.textbbox((0, 0), title_text, font=title_font)

    draw.text((text_x, 230), title_text, fill=TEXT_COLOR, font=title_font)

    # Description
    if description:
        max_desc_width = width - text_x - 80
        desc_text = description[:200] + "..." if len(description) > 200 else description

        words = desc_text.split()
        lines = []
        current_line = ""
        for word in words:
            test_line = f"{current_line} {word}".strip()
            test_bbox = draw.textbbox((0, 0), test_line, font=desc_font)
            if test_bbox[2] - test_bbox[0] <= max_desc_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
            if len(lines) >= 3:
                break
        if current_line and len(lines) < 3:
            lines.append(current_line)

        y_offset = 310
        for line in lines:
            draw.text((text_x, y_offset), line, fill=MUTED_COLOR, font=desc_font)
            y_offset += 32

    # Site branding
    draw.text((text_x, height - 70), "abioticscience.fr", fill=(100, 100, 100), font=url_font)

    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG", optimize=True)
    img_bytes.seek(0)

    return StreamingResponse(
        img_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/ssr/{entity_type}/{row_id}", response_class=HTMLResponse)
def generate_ssr_page(
    entity_type: Literal["item", "npc", "compendium", "dialogue"],
    row_id: str,
    db: Session = Depends(get_db),
):
    """Generate HTML page with proper meta tags for crawlers (Twitter, Facebook, etc.)."""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    structured_data: Optional[dict] = None

    if entity_type == "item":
        item = db.query(Item.name, Item.description, Item.category).filter(
            Item.row_id == row_id
        ).first()
        if item:
            name = item.name
            description = item.description or f"Informations sur {item.name} dans Abiotic Factor"
            category = item.category.value if item.category else "item"
            # Use Article instead of Product to avoid Google requiring offers/review/aggregateRating
            structured_data = {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": name,
                "description": description,
                "image": f"{BASE_URL}/api/og-image/item/{row_id}",
                "url": f"{BASE_URL}/item/{row_id}",
                "author": {
                    "@type": "Person",
                    "name": "Ronan Lamour",
                    "url": "https://ronan.lamour.bzh"
                },
            }
    elif entity_type == "npc":
        npc = db.query(NPC.name).filter(NPC.row_id == row_id).first()
        if npc:
            name = npc.name
            description = f"Informations sur {npc.name}, un NPC dans Abiotic Factor"
            category = "NPC"
            structured_data = {
                "@context": "https://schema.org",
                "@type": "Thing",
                "name": name,
                "description": description,
                "url": f"{BASE_URL}/npc/{row_id}",
            }
    elif entity_type == "compendium":
        entry = db.query(CompendiumEntry.title, CompendiumEntry.category).filter(
            CompendiumEntry.row_id == row_id
        ).first()
        if entry:
            name = entry.title
            description = f"Entrée du Compendium: {entry.title}"
            category = entry.category or "Compendium"
            structured_data = {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": name,
                "description": description,
                "url": f"{BASE_URL}/compendium/{row_id}",
            }
    elif entity_type == "dialogue":
        dialogue = db.query(NpcConversation.npc_name).filter(
            NpcConversation.row_id == row_id
        ).first()
        if dialogue:
            name = f"Dialogue: {dialogue.npc_name}"
            description = f"Dialogue avec {dialogue.npc_name} dans Abiotic Factor"
            category = "Dialogue"

    if not name:
        raise HTTPException(status_code=404, detail=f"{entity_type} '{row_id}' not found")

    url = f"{BASE_URL}/{entity_type}/{row_id}"
    og_image = f"{BASE_URL}/api/og-image/{entity_type}/{row_id}"

    return HTMLResponse(
        content=generate_ssr_html(
            title=name,
            description=description or "",
            url=url,
            og_image=og_image,
            entity_type=entity_type,
            structured_data=structured_data,
        ),
        headers={"Cache-Control": "public, max-age=3600"},
    )
