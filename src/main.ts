import 'leaflet/dist/leaflet.css';
import { GameApp } from './core/GameApp';
import { CUSTOM_ROADS_DATA } from './data/RoadData';
import { roadRegistry } from './core/RoadRegistry';

console.log(`[DEBUG] Main Entry: CUSTOM_ROADS_DATA length = ${CUSTOM_ROADS_DATA.length}`);

// Debug Helper
(window as any).debugRoad = () => {
    console.log(`[DEBUG] RoadRegistry Size: ${roadRegistry.getCustomRoadHexes().size}`);
    const checkHex = "-7,30"; // Start of Yinshan road
    console.log(`[DEBUG] Check Hex ${checkHex}: ${roadRegistry.getCustomRoadHexes().has(checkHex)}`);
}

document.addEventListener('DOMContentLoaded', () => {
    // Force clear localStorage to avoid warning noise (optional)
    // localStorage.removeItem('mapwar_road_hexes'); 

    const app = new GameApp();
    app.start();
});
