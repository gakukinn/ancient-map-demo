# Combat System Unification Walkthrough

## Overview
We have successfully unified the combat logic across the game. Previously, combat was handled disparately in `HistoricalEventManager` (for wars) and `main.ts` (for NPC battles), with no real combat logic for the player other than simple subtraction.

Now, a central `CombatSystem` manages all battles, ensuring consistent rules for damage calculation, duration, and resolution.

## Key Components

### 1. CombatSystem (`src/core/CombatSystem.ts`)
- **`IBattleUnit` Interface**: Defines the standard contract for any entity that can fight.
    - `id`, `name`, `factionId`, `troops`, `maxTroops`
    - `setTroops(count)`
    - `onBattleStart()`, `onBattleEnd(result, opponent)`
- **`Battle` Class**: Manages a single engagement between two units.
    - Calculates duration based on total troops.
    - Handles "tick" updates to apply damage.
    - Determines advantage (currently simple, can be expanded).
- **`CombatSystem` Class**: Manages the list of active battles and updates them each frame.

### 2. Entity Integration

#### Player (`src/core/Player.ts`)
- Implements `IBattleUnit`.
- `factionId` getter added.
- `onBattleEnd` callback support for UI updates.

#### NPC (`src/core/NPCManager.ts`)
- `NPC` interface extends `IBattleUnit`.
- Implemented `setTroops` to update tooltip.
- Implemented `onBattleEnd` to remove self on defeat.

#### Army (`src/core/Army.ts`)
- Implemented `IBattleUnit`.
- Removed internal `handleBattleTick` and `resolveCombat` logic.
- Visual feedback (red color) during battle via `onBattleStart`/`onBattleEnd`.

#### City (via `HistoricalEventManager.ts`)
- Cities are adapted to `IBattleUnit` on the fly using a `CityBattleAdapter` in `HistoricalEventManager`.
- This allows cities to defend against armies using the same combat system without rewriting the entire `City` data structure.

### 3. Main Loop Integration (`src/main.ts`)
- `combatSystem` is instantiated and updated in the `gameLoop`.
- NPC interactions now trigger `combatSystem.startBattle(player, npc)` instead of instant resolution.

## Verification
- **Player vs NPC**: Clicking an NPC moves the player there and starts a **Field Battle** where the player (attacker) has advantage. The disadvantaged NPC only deals 60-100% of normal damage.
- **Army vs City**: Historical events spawn armies. When they arrive at a city, a **Siege Battle** starts where the city (defender) has advantage. The disadvantaged army only deals 60-100% of normal damage.
- **Battle Duration**: Scales with total troops involved (15-45 seconds game time).
- **Visual Feedback**: Armies turn red during combat.

## Battle Advantage System
The combat system now properly distinguishes between two types of battles:

### Field Battle (野战)
- **Participants**: Player vs NPC, Army vs NPC
- **Advantage**: Attacker
- **Logic**: The attacker deals full damage (1.0x), while the defender deals reduced damage (0.6-1.0x random)
- **Example**: When a player attacks a bandit NPC, the player has the advantage

### Siege Battle (攻城战)
- **Participants**: Army vs City
- **Advantage**: Defender  
- **Logic**: The defender (city) deals full damage (1.0x), while the attacker (army) deals reduced damage (0.6-1.0x random)
- **Example**: When a historical war event spawns an army to attack a city, the city has defensive advantage

The advantage determination is automatic based on the defender's characteristics:
- If defender ID starts with `npc_` → Field Battle
- If defender has maxTroops >= 20000 and is a known city ID → Siege Battle
- Otherwise → No advantage (equal combat)

## Future Improvements
- **Visuals**: Add a "சords crossing" icon or effect over battling units.
- **Field Battles**: Allow Army vs Army or Player vs Army battles.
- **Complex Advantage**: Implement terrain bonuses, general stats, and unit type counters in `CombatSystem`.
