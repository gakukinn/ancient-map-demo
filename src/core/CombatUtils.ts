import { Player } from './Player';
import { CityManager } from './CityManager';
import { GameConfig } from '../config/GameConfig';
import { getEuclideanDistance, cityToLatLng } from './DistanceUtils';

export class CombatUtils {
    /**
     * Checks if the player should participate in a battle based on proximity and faction.
     * Returns the participation data (ratio) or undefined.
     * 
     * @param player The player instance
     * @param attackerFactionId Faction ID of the attacker
     * @param defenderFactionId Faction ID of the defender
     * @param battleLocation Location of the battle/target (lat/lng)
     */
    public static checkPlayerParticipation(
        player: Player,
        attackerFactionId: string,
        defenderFactionId: string,
        battleLocation: { lat: number; lng: number },
        attackerTroops?: number,
        defenderTroops?: number
    ): { type: 'attacker' | 'defender', ratio: number } | undefined {
        const playerFaction = player.getFaction();
        if (!playerFaction) return undefined;

        // Player is not involved if not in either faction
        if (playerFaction !== attackerFactionId && playerFaction !== defenderFactionId) {
            return undefined;
        }

        const playerPos = player.getPosition();
        // Calculate distance strictly
        const distToBattle = getEuclideanDistance(
            { lat: playerPos.latitude, lng: playerPos.longitude },
            battleLocation
        );

        // Check if player is near enough OR is auto-marching (which implies intent to join)
        const isNearby = distToBattle < GameConfig.DISTANCE.COMBAT_PARTICIPATION;
        const isAutoMarching = player.isAutoMarching;

        // If not nearby and not auto-marching, don't join
        if (!isNearby && !isAutoMarching) return undefined;

        const playerTroops = player.getTroops();

        // Player is Attacker
        if (playerFaction === attackerFactionId) {
            let ratio = 0;
            if (attackerTroops) {
                // Ratio: Player / (Player + AI)
                // Note: attackerTroops usually includes the AI legion troops. 
                // We assume attackerTroops passed in is the AI's troop count.
                ratio = playerTroops / (playerTroops + attackerTroops);
            }
            console.log(`[CombatUtils] Player joining as ATTACKER (Dist: ${distToBattle.toFixed(2)}, Modes: Nearby=${isNearby}, Auto=${isAutoMarching})`);
            return { type: 'attacker', ratio };
        }

        // Player is Defender
        if (playerFaction === defenderFactionId) {
            let ratio = 0;
            if (defenderTroops) {
                ratio = playerTroops / (playerTroops + defenderTroops);
            }
            console.log(`[CombatUtils] Player joining as DEFENDER (Dist: ${distToBattle.toFixed(2)}, Modes: Nearby=${isNearby}, Auto=${isAutoMarching})`);
            return { type: 'defender', ratio };
        }

        return undefined;
    }

    /**
     * Retreats the player to the nearest friendly city.
     * @param player The player instance
     * @param cityManager The CityManager instance to find cities
     */
    public static retreatPlayerToNearestCity(player: Player, cityManager: CityManager): void {
        const playerFaction = player.getFaction();
        if (!playerFaction) return;

        const playerPos = player.getPosition();
        const nearestCity = cityManager.getNearestCity(playerFaction, {
            latitude: playerPos.latitude,
            longitude: playerPos.longitude
        });

        if (nearestCity) {
            console.log(`🏃 Player retreating to ${nearestCity.name}`);
            player.moveTo(nearestCity.latitude, nearestCity.longitude);
        } else {
            console.log(`⚠️ No friendly city found for retreat!`);
        }
    }
}
