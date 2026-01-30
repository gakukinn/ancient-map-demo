---
title: Tile Map Usage Notes (Single Layer)
summary: Practical checklist for working with the zoom 9 tile set only.
owner: GAKU
status: active
last_updated: 2025-11-19
phase: production
---
# Tile Map Usage Notes

## Current Setup
- Runtime only consumes `9dixingtu/Google Terrain Maps without labels  roads and POI  512px`.
- `TileMapConfig.js` exposes only zoom level 9, so all loaders/renderers inherit the same constraint.
- Other zoom folders remain on disk strictly as archival material; do not point new scripts to them.

## Loading Tiles in Debug Utilities
1. Start a local server (`py -3 -m http.server 8000` or similar).
2. Open `test_tilemap.html` to verify that zoom 9 tiles respond (other zoom tests are deprecated).
3. When testing asset alignment, confirm the image path resolves to `/9dixingtu/.../{x}/{y}.jpg`.

## Adding New Tiles
- Drop new 512px tiles into the existing `9dixingtu` folder hierarchy.
- Ensure `TileMapLoader` can read them without extra configuration—paths are computed automatically via `getTilePath`.
- If a different geographic window is needed, update `COVERAGE_BOUNDS[9]` and keep the same naming convention.

## Troubleshooting Checklist
- **Missing tile** → open the browser console and confirm `Tile path unavailable for zoom=...` is not triggered (only zoom 9 is valid).
- **Wheel zoom does nothing** → expected; renderer logs a hint because only one layer is active.
- **Player stuck** → verify gameplay coordinates (lat/lng) are still within the zoom 9 coverage window.

## Next Steps
1. Optionally delete unused tile folders after archiving (keep at least one external backup).
2. Consider baking a mini-map or shading overlay if designers still need multiple zoom contexts.
3. When multi-layer support is reintroduced, restore the removed config sections from version control history instead of editing live data.
