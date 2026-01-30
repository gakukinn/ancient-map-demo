
/**
 * Centralized Z-Index configuration for Map Layers.
 * Leaflet Default Panes:
 * - tilePane: 200
 * - overlayPane: 400 (Polygons, Lines)
 * - shadowPane: 500
 * - markerPane: 600 (Markers)
 * - tooltipPane: 650
 * - popupPane: 700
 */
export const MAP_LAYER_ZINDEX = {
    // Terrain & Base
    GRID_LINES: 300,
    TERRITORY_POLYGON: 350,  // Below standard overlay? Default is 400.

    // Infrastructure
    CONNECTIONS: 450,        // Above territory, below markers

    // Objects
    CITY_MARKER: 600,        // Default MarkerPane

    // Units Low (Siege Battle - Behind City)
    UNITS_LOW: 580,

    // Units (Custom Pane 'unitsPane')
    // Must be above City Markers (600) but below Tooltips (650) to avoid blocking UI?
    // User wants Units ABOVE Cities.
    UNITS: 620,

    // Effects
    BATTLE_EFFECT: 630,      // Above units

    // Labels
    // City Labels are often implemented as Tooltips or custom markers.
    // If they are markers with offset, they live in markerPane (600) + offset.
    // If we want a strict layer, we should put them in a separate pane.
    CITY_LABEL: 640,

    // UI Highlights
    SELECTION_HIGHLIGHT: 645,

    // High Priority
    // Tooltips are 650
    // Popups are 700
} as const;

export const MAP_PANES = {
    UNITS: 'unitsPane',
    UNITS_LOW: 'unitsLowPane',
    EFFECTS: 'effectsPane',
    LABELS: 'labelsPane',
    UI: 'uiPane'
} as const;
