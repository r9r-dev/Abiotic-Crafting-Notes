"""SEO endpoints: sitemap.xml and OG image generation."""

import io
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Response, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Item, NPC, CompendiumEntry, NpcConversation

router = APIRouter(tags=["seo"])

BASE_URL = "https://abioticscience.fr"


@router.get("/sitemap.xml", response_class=Response)
def generate_sitemap(db: Session = Depends(get_db)):
    """Generate dynamic sitemap.xml with all indexable URLs."""
    now = datetime.utcnow().strftime("%Y-%m-%d")

    # Static pages
    urls = [
        {"loc": BASE_URL, "priority": "1.0", "changefreq": "daily"},
    ]

    # Items
    items = db.query(Item.row_id).all()
    for item in items:
        urls.append({
            "loc": f"{BASE_URL}/item/{item.row_id}",
            "priority": "0.8",
            "changefreq": "weekly",
        })

    # NPCs
    npcs = db.query(NPC.row_id).all()
    for npc in npcs:
        urls.append({
            "loc": f"{BASE_URL}/npc/{npc.row_id}",
            "priority": "0.7",
            "changefreq": "weekly",
        })

    # Compendium entries
    compendium = db.query(CompendiumEntry.row_id).all()
    for entry in compendium:
        urls.append({
            "loc": f"{BASE_URL}/compendium/{entry.row_id}",
            "priority": "0.7",
            "changefreq": "weekly",
        })

    # Dialogues
    dialogues = db.query(NpcConversation.row_id).all()
    for dialogue in dialogues:
        urls.append({
            "loc": f"{BASE_URL}/dialogue/{dialogue.row_id}",
            "priority": "0.6",
            "changefreq": "monthly",
        })

    # Build XML
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

    xml_content = "\n".join(xml_parts)

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/og-image/default")
def generate_default_og_image():
    """Generate default OG image for the site."""
    from PIL import Image, ImageDraw, ImageFont

    # Create image
    width, height = 1200, 630
    bg_color = (10, 15, 20)  # #0a0f14
    accent_color = (59, 130, 246)  # Blue

    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Draw gradient-like effect with rectangles
    for i in range(50):
        alpha = int(255 * (1 - i / 50))
        draw.rectangle(
            [(0, height - i * 3), (width, height - i * 3 + 3)],
            fill=(accent_color[0], accent_color[1], accent_color[2]),
        )

    # Try to load a custom font, fallback to default
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
    except (OSError, IOError):
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()

    # Title
    title = "Abiotic Factor Database"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(
        ((width - title_width) // 2, 220),
        title,
        fill=(255, 255, 255),
        font=title_font,
    )

    # Subtitle
    subtitle = "Base de données complète pour Abiotic Factor"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    draw.text(
        ((width - subtitle_width) // 2, 320),
        subtitle,
        fill=(180, 180, 180),
        font=subtitle_font,
    )

    # URL
    url = "abioticscience.fr"
    url_bbox = draw.textbbox((0, 0), url, font=subtitle_font)
    url_width = url_bbox[2] - url_bbox[0]
    draw.text(
        ((width - url_width) // 2, 420),
        url,
        fill=accent_color,
        font=subtitle_font,
    )

    # Save to bytes
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
    from PIL import Image, ImageDraw, ImageFont
    import os

    # Get entity info
    name = None
    description = None
    icon_path = None
    category = None

    if entity_type == "item":
        item = db.query(Item.name, Item.description, Item.icon_path, Item.category).filter(
            Item.row_id == row_id
        ).first()
        if item:
            name = item.name
            description = item.description
            icon_path = item.icon_path
            category = item.category.value if item.category else "Item"
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
            category = entry.category or "Compendium"
    elif entity_type == "dialogue":
        dialogue = db.query(NpcConversation.name).filter(
            NpcConversation.row_id == row_id
        ).first()
        if dialogue:
            name = dialogue.name
            category = "Dialogue"

    if not name:
        raise HTTPException(status_code=404, detail=f"{entity_type} '{row_id}' not found")

    # Create image
    width, height = 1200, 630
    bg_color = (10, 15, 20)  # #0a0f14
    accent_color = (59, 130, 246)  # Blue

    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Draw accent bar at bottom
    draw.rectangle([(0, height - 8), (width, height)], fill=accent_color)

    # Try to load icon if available
    icon_loaded = False
    if icon_path:
        # Try multiple possible paths
        possible_paths = [
            f"/app/data/icons/{icon_path}.png",
            f"/app/data/icons/{icon_path}",
            f"data/icons/{icon_path}.png",
            f"data/icons/{icon_path}",
        ]
        for path in possible_paths:
            if os.path.exists(path):
                try:
                    icon = Image.open(path).convert("RGBA")
                    # Resize icon to fit
                    icon_size = 200
                    icon = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
                    # Paste with alpha
                    icon_x = 100
                    icon_y = (height - icon_size) // 2 - 20
                    img.paste(icon, (icon_x, icon_y), icon)
                    icon_loaded = True
                    break
                except Exception:
                    pass

    # Text position depends on whether icon was loaded
    text_x = 350 if icon_loaded else 100

    # Try to load fonts
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56)
        category_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        desc_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except (OSError, IOError):
        title_font = ImageFont.load_default()
        category_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()

    # Category badge
    if category:
        category_text = category.upper()
        draw.text((text_x, 180), category_text, fill=accent_color, font=category_font)

    # Title (truncate if too long)
    max_title_width = width - text_x - 100
    title_text = name
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    while title_bbox[2] - title_bbox[0] > max_title_width and len(title_text) > 10:
        title_text = title_text[:-4] + "..."
        title_bbox = draw.textbbox((0, 0), title_text, font=title_font)

    draw.text((text_x, 230), title_text, fill=(255, 255, 255), font=title_font)

    # Description (truncate and wrap)
    if description:
        max_desc_width = width - text_x - 100
        # Truncate to ~150 chars
        desc_text = description[:150] + "..." if len(description) > 150 else description
        # Simple word wrap
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

        y_offset = 320
        for line in lines:
            draw.text((text_x, y_offset), line, fill=(180, 180, 180), font=desc_font)
            y_offset += 35

    # Site URL
    url = "abioticscience.fr"
    draw.text((text_x, height - 80), url, fill=(120, 120, 120), font=category_font)

    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG", optimize=True)
    img_bytes.seek(0)

    return StreamingResponse(
        img_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )
