#!/bin/bash
# Convert all PNG icons to WebP format with multiple sizes using ImageMagick.
# Much faster than sips + cwebp thanks to ImageMagick's batch processing.
# Sizes: original, 80, 56, 48, 40, 32, 24, 20

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/../data/icons"
OUTPUT_DIR="$SCRIPT_DIR/../data/icons-webp"
SIZES="80 56 48 40 32 24 20"
WEBP_QUALITY=85
PARALLEL_JOBS=$(sysctl -n hw.ncpu)

# Check for magick
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick is required. Install with: brew install imagemagick"
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

echo "Converting $TOTAL icons to WebP using ImageMagick..."
echo "Output: $OUTPUT_DIR"
echo "Sizes: original + $SIZES"
echo "Parallel jobs: $PARALLEL_JOBS"
echo ""

# Function to convert a single icon
convert_icon() {
    local png_file="$1"
    local output_dir="$2"
    local quality="$3"
    local sizes="$4"

    local base_name=$(basename "$png_file" .png)

    # Convert original to WebP
    magick "$png_file" -quality "$quality" "$output_dir/$base_name.webp" 2>/dev/null

    # Create resized versions
    for size in $sizes; do
        magick "$png_file" -resize "${size}x${size}" -quality "$quality" "$output_dir/$base_name-$size.webp" 2>/dev/null
    done

    echo -n "."
}

export -f convert_icon
export OUTPUT_DIR WEBP_QUALITY SIZES

# Process files in parallel
ls "$ICONS_DIR"/*.png | xargs -P "$PARALLEL_JOBS" -I {} bash -c 'convert_icon "$@"' _ {} "$OUTPUT_DIR" "$WEBP_QUALITY" "$SIZES"

echo ""
echo ""
echo "=================================================="
echo "Conversion complete!"

# Count results
WEBP_COUNT=$(ls -1 "$OUTPUT_DIR"/*.webp 2>/dev/null | wc -l | tr -d ' ')
echo "  - Total WebP files: $WEBP_COUNT"

# Size comparison
ORIGINAL_SIZE=$(du -sh "$ICONS_DIR" | cut -f1)
WEBP_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)
echo "  - Original PNG size: $ORIGINAL_SIZE"
echo "  - WebP total size: $WEBP_SIZE"
