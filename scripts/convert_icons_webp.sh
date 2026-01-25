#!/bin/bash
# Convert all PNG icons to WebP format with multiple sizes.
# Uses sips (macOS) for resizing and cwebp for WebP conversion.
# Sizes: original, 80, 56, 48, 40, 32, 24, 20

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/../data/icons"
OUTPUT_DIR="$SCRIPT_DIR/../data/icons-webp"
SIZES=(80 56 48 40 32 24 20)
WEBP_QUALITY=85

# Check for cwebp
if ! command -v cwebp &> /dev/null; then
    echo "Error: cwebp is required. Install with: brew install webp"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Count files
TOTAL=$(ls -1 "$ICONS_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
if [ "$TOTAL" -eq 0 ]; then
    echo "No PNG files found in $ICONS_DIR"
    exit 1
fi

echo "Converting $TOTAL icons to WebP..."
echo "Output: $OUTPUT_DIR"
echo "Sizes: original + ${SIZES[*]}"
echo ""

CONVERTED=0
ERRORS=0

# Process each PNG file
for png_file in "$ICONS_DIR"/*.png; do
    base_name=$(basename "$png_file" .png)

    # Convert original to WebP
    if cwebp -q $WEBP_QUALITY "$png_file" -o "$OUTPUT_DIR/$base_name.webp" 2>/dev/null; then
        # Create resized versions
        for size in "${SIZES[@]}"; do
            # Create temp resized PNG
            temp_file=$(mktemp).png
            if sips -z $size $size "$png_file" --out "$temp_file" 2>/dev/null; then
                # Convert to WebP
                cwebp -q $WEBP_QUALITY "$temp_file" -o "$OUTPUT_DIR/$base_name-$size.webp" 2>/dev/null || true
            fi
            rm -f "$temp_file"
        done
        ((CONVERTED++))
    else
        ((ERRORS++))
        echo "[ERROR] $base_name"
    fi

    # Progress
    if [ $((CONVERTED % 100)) -eq 0 ] || [ "$CONVERTED" -eq "$TOTAL" ]; then
        echo "Progress: $CONVERTED/$TOTAL ($((CONVERTED * 100 / TOTAL))%)"
    fi
done

echo ""
echo "=================================================="
echo "Conversion complete!"
echo "  - Total icons: $TOTAL"
echo "  - Converted: $CONVERTED"
echo "  - Errors: $ERRORS"

# Size comparison
ORIGINAL_SIZE=$(du -sh "$ICONS_DIR" | cut -f1)
WEBP_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)
echo "  - Original PNG size: $ORIGINAL_SIZE"
echo "  - WebP total size: $WEBP_SIZE"
