import L from 'leaflet';
import { GameMap } from './GameMap';
import { GlobalUnitRenderer, IAnimatedUnit } from './GlobalUnitRenderer';
import { LegionType } from '../types/UnitTypes';

export interface IRenderable {
    getPosition(): { lat: number; lng: number };
    getTroops(): number;
    isDestroyed: boolean;
    name?: string; // [NEW] Optional name: "Legion Name"
}

// Singleton reference to the global renderer
let globalRenderer: GlobalUnitRenderer | null = null;

export function initializeGlobalUnitRenderer(gameMap: GameMap): GlobalUnitRenderer {
    if (!globalRenderer) {
        globalRenderer = new GlobalUnitRenderer(gameMap);
    }
    return globalRenderer;
}

export function getGlobalUnitRenderer(): GlobalUnitRenderer | null {
    return globalRenderer;
}

/**
 * UnitRenderer - Now a lightweight state container that registers with GlobalUnitRenderer
 */
export class UnitRenderer implements IAnimatedUnit {
    private map: L.Map;
    private unit: IRenderable;
    public factionId?: string;

    // State Flags
    public isAttacking: boolean = false;
    public isMoving: boolean = false;

    // Battle Info
    public currentBattleType: 'siege' | 'field' | null = null;
    public targetPos: { lat: number; lng: number } | null = null;
    public lastDamageTime?: number; // [NEW]
    public isPlayer: boolean = false; // [NEW] Track player control

    // Movement Tracking
    public lastPosition: { lat: number; lng: number };

    // Optional identifiers
    public id?: string;
    public type?: string;
    // [FIX] name is now a getter, see below
    public legionType?: LegionType; // [UNIT SYSTEM] 兵种类型

    constructor(gameMap: GameMap, unit: IRenderable, zIndex: string = '999', factionId?: string) {
        this.map = gameMap.getLeafletMap();
        this.unit = unit;
        this.factionId = factionId;

        this.isPlayer = (unit as any).isPlayerControlled || false; // [NEW] Track player control

        const pos = unit.getPosition();
        this.lastPosition = { lat: pos.lat, lng: pos.lng };

        // Copy identifiers
        this.id = (unit as any).id;
        this.type = (unit as any).type;
        // [FIX] Don't copy name here - use getter instead to get live value
        this.legionType = (unit as any).legionType; // [UNIT SYSTEM] 兵种类型

        // Register with global renderer
        if (globalRenderer) {
            globalRenderer.register(this);
        }
    }

    // [FIX] Use getter to always return the current unit.name
    public get name(): string | undefined {
        return this.unit.name;
    }

    // IRenderable implementation
    public getPosition(): { lat: number; lng: number } {
        return this.unit.getPosition();
    }

    public getTroops(): number {
        return this.unit.getTroops();
    }

    public get isDestroyed(): boolean {
        return this.unit.isDestroyed;
    }

    public triggerAttack(battleType: 'siege' | 'field' = 'field', targetPos?: { lat: number, lng: number }): void {
        this.isAttacking = true;
        this.currentBattleType = battleType;
        this.targetPos = targetPos || null;
    }

    public stopAttack(): void {
        this.isAttacking = false;
        this.currentBattleType = null;
        this.targetPos = null;
    }

    // Visibility control
    public visible: boolean = true;

    public setVisible(isVisible: boolean): void {
        this.visible = isVisible;
    }

    public destroy(): void {
        if (globalRenderer) {
            globalRenderer.unregister(this);
        }
    }
}
