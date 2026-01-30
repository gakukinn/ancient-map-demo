---
title: MAPWAR Tile Zoom Guide
summary: Simplified single-layer tile strategy focused on zoom level 9 assets.
owner: GAKU
status: active
last_updated: 2025-11-19
phase: production
---
# MAPWAR Tile Zoom Guide

## Single-Layer Update
- 2025-11-19: project locked to one tile layer to reduce scripting bugs and movement issues.
- Zoom wheel still works, but TileMapRenderer now clamps to the only available entry, so players always see level 9 detail.
- Directories 5dixingtu/6dixingtu/7dixingtu/8dixingtu/10dixingtu/11dixingtu/12dixingtu stay in the repo only as backups and are no longer referenced by runtime code.

## Active Layer Specification
| Field | Value |
| --- | --- |
| Zoom level | 9 (CORE) |
| Tiles path | `/9dixingtu/Google Terrain Maps without labels  roads and POI  512px` |
| Tile size | 512 px |
| Coverage | x: 359-443, y: 173-229 |
| Default center | lat 34.26, lng 108.94 |

## Engine Touch Points
1. `src/map/TileMapConfig.js`
   - Only exposes zoom 9 in `TILE_PATHS`, `ZOOM_LEVELS`, and `COVERAGE_BOUNDS`.
   - `MIN_ZOOM`, `MAX_ZOOM`, and `DEFAULT_ZOOM` are all set to 9.
2. `src/map/TileMapRenderer.js`
   - Reads available zooms from config and ignores scroll input when only one layer exists.
   - Initializes the viewport with zoom 9 if config data is missing or mismatched.
3. Terrain overlay + gameplay code continue to consume lat/lng positions; no extra work is required for the single-layer change.

## File Cleanup Checklist
- [ ] Archive or zip the unused tile directories once backups are verified.
- [x] Remove config references to deprecated zoom levels.
- [x] Document the new behaviour for designers and scripters.

## Migration Notes for Designers
- Any scripts that referenced `ZOOM_LEVELS.COUNTRY`/`...CITY` must now use hard-coded zoom 9 values or derive behaviour from gameplay scale instead of map zoom.
- Debug HTML files (test_zoom7/test_tilemap/etc.) still exist for historical comparison but are not maintained; open them only when investigating legacy behaviour.
- When new tile art is prepared, prefer exporting it directly into the `9dixingtu` folder to avoid confusion.
