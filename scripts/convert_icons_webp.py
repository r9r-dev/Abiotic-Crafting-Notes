#!/usr/bin/env python3
"""
Convert all PNG icons to WebP format with multiple sizes.
Sizes: original, 80, 56, 48, 40, 32, 24, 20
"""

import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

# Configuration
ICONS_DIR = Path(__file__).parent.parent / "data" / "icons"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "icons-webp"
SIZES = [80, 56, 48, 40, 32, 24, 20]
WEBP_QUALITY = 85


def convert_icon(png_path: Path) -> dict:
    """Convert a single PNG to WebP at multiple sizes."""
    results = {"file": png_path.name, "sizes": [], "errors": []}

    try:
        with Image.open(png_path) as img:
            # Convert to RGBA if necessary
            if img.mode != "RGBA":
                img = img.convert("RGBA")

            base_name = png_path.stem

            # Save original size
            original_path = OUTPUT_DIR / f"{base_name}.webp"
            img.save(original_path, "WEBP", quality=WEBP_QUALITY, method=6)
            results["sizes"].append(("original", img.size[0]))

            # Save each target size
            for size in SIZES:
                if size < img.size[0]:  # Only downscale
                    resized = img.resize((size, size), Image.Resampling.LANCZOS)
                    sized_path = OUTPUT_DIR / f"{base_name}-{size}.webp"
                    resized.save(sized_path, "WEBP", quality=WEBP_QUALITY, method=6)
                    results["sizes"].append((size, size))

    except Exception as e:
        results["errors"].append(str(e))

    return results


def main():
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Find all PNG files
    png_files = list(ICONS_DIR.glob("*.png"))
    total = len(png_files)

    if total == 0:
        print(f"No PNG files found in {ICONS_DIR}")
        return

    print(f"Converting {total} icons to WebP...")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Sizes: original + {SIZES}")
    print()

    # Process in parallel
    converted = 0
    errors = 0

    with ThreadPoolExecutor(max_workers=os.cpu_count()) as executor:
        futures = {executor.submit(convert_icon, f): f for f in png_files}

        for future in as_completed(futures):
            result = future.result()
            converted += 1

            if result["errors"]:
                errors += 1
                print(f"[ERROR] {result['file']}: {result['errors']}")

            # Progress
            if converted % 100 == 0 or converted == total:
                print(f"Progress: {converted}/{total} ({converted*100//total}%)")

    # Summary
    print()
    print("=" * 50)
    print(f"Conversion complete!")
    print(f"  - Total icons: {total}")
    print(f"  - Converted: {converted - errors}")
    print(f"  - Errors: {errors}")

    # Size comparison
    original_size = sum(f.stat().st_size for f in png_files)
    webp_size = sum(f.stat().st_size for f in OUTPUT_DIR.glob("*.webp"))

    print(f"  - Original PNG size: {original_size / 1024 / 1024:.1f} MB")
    print(f"  - WebP total size: {webp_size / 1024 / 1024:.1f} MB")
    print(f"  - Compression ratio: {webp_size / original_size * 100:.1f}%")


if __name__ == "__main__":
    main()
