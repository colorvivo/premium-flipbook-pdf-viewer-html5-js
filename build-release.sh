#!/bin/bash

# Premium FlipBook - Release Build Script
# This script creates a distribution ZIP file

VERSION="1.0.0"
OUTPUT_DIR="website"
ZIP_NAME="premium-flipbook-v${VERSION}.zip"

echo "Building Premium FlipBook v${VERSION}..."

# Build production files (if npm is available)
if command -v npm &> /dev/null; then
    echo "Running npm build..."
    npm run build 2>/dev/null || echo "Skipping npm build (may not be configured)"
fi

# Create ZIP package
echo "Creating distribution package..."
zip -r "${OUTPUT_DIR}/${ZIP_NAME}" \
    dist/ \
    src/ \
    examples/ \
    docs/ \
    README.md \
    LICENSE \
    CHANGELOG.md \
    package.json \
    vite.config.js \
    -x "*.DS_Store" \
    -x "node_modules/*" \
    -x ".git/*" \
    -x ".claude/*"

# Get file size
SIZE=$(ls -lh "${OUTPUT_DIR}/${ZIP_NAME}" | awk '{print $5}')

echo ""
echo "======================================"
echo "Release package created successfully!"
echo "======================================"
echo "File: ${OUTPUT_DIR}/${ZIP_NAME}"
echo "Size: ${SIZE}"
echo ""
echo "Contents:"
echo "  - dist/        Production builds (ESM, IIFE, CSS)"
echo "  - src/         Source files"
echo "  - examples/    Demo gallery and documentation"
echo "  - docs/        Markdown documentation"
echo "  - README.md    Project readme"
echo "  - LICENSE      MIT License"
echo ""
