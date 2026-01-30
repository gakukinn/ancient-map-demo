import { resolvePath } from '../utils/PathUtils';
﻿// ==================== ç²¾çµå›¾è·¯å¾„ (Sprite Paths) ====================
export const SPRITE_PATHS = {
    PLAYER_ZHONGHUA: {
        // [NEW 8-DIRECTION SYSTEM] S10DB Assets
        // 0:South -> 7:SE (Standard S10DB mapping)
        // Move: 460-467
        // Attack: 468-475
        // Idle: 484-491
        // Damage: 492-499
        // Death: 500-507
        // Format: /SUCAI/S10DB/{ID}-1.png

        MOVE: [460, 461, 462, 463, 464, 465, 466, 467].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        ATTACK: [468, 469, 470, 471, 472, 473, 474, 475].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        IDLE: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        DAMAGE: [492, 493, 494, 495, 496, 497, 498, 499].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        DEATH: [500, 501, 502, 503, 504, 505, 506, 507].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        // Keep 'frames' for compatibility if needed, but we should switch to using the arrays above.
        // We can alias frames to IDLE for safety
        frames: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
    },
    // [NEW] Use same assets for standard LEGION units
    LEGION: {
        MOVE: [460, 461, 462, 463, 464, 465, 466, 467].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        ATTACK: [468, 469, 470, 471, 472, 473, 474, 475].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        IDLE: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        DAMAGE: [492, 493, 494, 495, 496, 497, 498, 499].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        DEATH: [500, 501, 502, 503, 504, 505, 506, 507].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
    },
    // [NEW] Player General Sprite (S10DB)
    PLAYER_GENERAL: {
        MOVE: [240, 241, 242, 243, 244, 245, 246, 247].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        ATTACK: [248, 249, 250, 251, 252, 253, 254, 255].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        IDLE: [256, 257, 258, 259, 260, 261, 262, 263].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        DAMAGE: [264, 265, 266, 267, 268, 269, 270, 271].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        DEATH: [272, 273, 274, 275, 276, 277, 278, 279].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
    },
    PLAYER_DEFAULT: {
        frames: [
            resolvePath('/assets/soldier.png'),
            resolvePath('/assets/soldier_2.png'),
            resolvePath('/assets/soldier_3.png'),
        ] as const,
        attacks: [
            resolvePath('/assets/attack_1.png'),
            resolvePath('/assets/attack_2.png'),
            resolvePath('/assets/attack_3.png'),
        ] as const,
    },
    PHALANX: {
        // format: /SUCAI/S10DB/{ID}-1.png
        // 8 directions: South(0) -> SE(7)
        // éª‘å…µè´´å›¾ (Cavalry sprites): 154-193
        MOVE: [154, 155, 156, 157, 158, 159, 160, 161].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        ATTACK: [162, 163, 164, 165, 166, 167, 168, 169].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        IDLE: [170, 171, 172, 173, 174, 175, 176, 177].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        DAMAGE: [178, 179, 180, 181, 182, 183, 184, 185].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        DEATH: [186, 187, 188, 189, 190, 191, 192, 193].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        FLAG: {
            POLE: resolvePath('/SUCAI/S10QZ/1-1.png'),
            BODY: resolvePath('/SUCAI/S10QZ/7-1.png'), // 
            TEXT: resolvePath('/SUCAI/S10QZ/59-1.png'), // 59-1 Text
        }
    },
    // [NEW] Granular Unit Asset Configuration
    // Allows defining sprites for specific unit types (e.g. 'huaxia_infantry', 'roman_legion')
    UNIT_ASSETS: {
        'huaxia_infantry': {
            // Using 8-direction mapping (S10DB IDs)
            // 0:S, 1:SE, 2:E, 3:NE, 4:N, 5:NW, 6:W, 7:SW
            MOVE: [460, 461, 462, 463, 464, 465, 466, 467].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [468, 469, 470, 471, 472, 473, 474, 475].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [492, 493, 494, 495, 496, 497, 498, 499].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [500, 501, 502, 503, 504, 505, 506, 507].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // Secondary sprites for Mixed formations (e.g. Back Row Crossbows)
            // Secondary: CROSSBOWS (342-397)
            SECONDARY: {
                MOVE: [342, 343, 344, 345, 346, 347, 348, 349].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [350, 351, 352, 353, 354, 355, 356, 357].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [366, 367, 368, 369, 370, 371, 372, 373].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [374, 375, 376, 377, 378, 379, 380, 381].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [382, 383, 384, 385, 386, 387, 388, 389].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [390, 391, 392, 393, 394, 395, 396, 397].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'huaxia_mixed': {
            // Huaxia Mixed (NEW): Front Infantry, Middle Cavalry, Back Crossbows
            // PRIMARY (Front): Infantry (460..)
            MOVE: [460, 461, 462, 463, 464, 465, 466, 467].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [468, 469, 470, 471, 472, 473, 474, 475].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [492, 493, 494, 495, 496, 497, 498, 499].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [500, 501, 502, 503, 504, 505, 506, 507].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // SECONDARY (Middle): Cavalry (154..)
            SECONDARY: {
                MOVE: [154, 155, 156, 157, 158, 159, 160, 161].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [162, 163, 164, 165, 166, 167, 168, 169].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [170, 171, 172, 173, 174, 175, 176, 177].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [178, 179, 180, 181, 182, 183, 184, 185].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [186, 187, 188, 189, 190, 191, 192, 193].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            },

            // TERTIARY (Back): Crossbows (342..) - Huaxia Special
            TERTIARY: {
                MOVE: [342, 343, 344, 345, 346, 347, 348, 349].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [350, 351, 352, 353, 354, 355, 356, 357].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [366, 367, 368, 369, 370, 371, 372, 373].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [374, 375, 376, 377, 378, 379, 380, 381].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [382, 383, 384, 385, 386, 387, 388, 389].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [390, 391, 392, 393, 394, 395, 396, 397].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'huaxia_cavalry': {
            // Huaxia Cavalry: Pure Cavalry
            MOVE: [154, 155, 156, 157, 158, 159, 160, 161].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [162, 163, 164, 165, 166, 167, 168, 169].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [170, 171, 172, 173, 174, 175, 176, 177].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [178, 179, 180, 181, 182, 183, 184, 185].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [186, 187, 188, 189, 190, 191, 192, 193].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        },

        // === YUENAN FACTION (è¶Šå—) ===
        'yuenan_infantry': {
            // Yuenan Infantry: Primary = Nanman Vine Armor (å—è›®è—¤ç”²å…µ), Secondary = Crossbows
            MOVE: [562, 563, 564, 565, 566, 567, 568, 569].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [570, 571, 572, 573, 574, 575, 576, 577].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [586, 587, 588, 589, 590, 591, 592, 593].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [594, 595, 596, 597, 598, 599, 600, 601].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [602, 603, 604, 605, 606, 607, 608, 609].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // Secondary: Crossbows for back row
            SECONDARY: {
                MOVE: [342, 343, 344, 345, 346, 347, 348, 349].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [350, 351, 352, 353, 354, 355, 356, 357].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [366, 367, 368, 369, 370, 371, 372, 373].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [374, 375, 376, 377, 378, 379, 380, 381].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [382, 383, 384, 385, 386, 387, 388, 389].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [390, 391, 392, 393, 394, 395, 396, 397].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },

        // === HUIHUI FACTION (å›žå›žå¼“éª‘) ===
        'huihui_cavalry': {
            // Huihui Cavalry: Beidi Mounted Archers (åŒ—ç‹„å¼“éª‘å…µ)
            // 6-person cavalry formation, combat cycle: shoot -> charge -> attack
            MOVE: [664, 665, 666, 667, 668, 669, 670, 671].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [672, 673, 674, 675, 676, 677, 678, 679].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [680, 681, 682, 683, 684, 685, 686, 687].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            CHARGE: [688, 689, 690, 691, 692, 693, 694, 695].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [696, 697, 698, 699, 700, 701, 702, 703].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            SHOOT: [704, 705, 706, 707, 708, 709, 710, 711].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [712, 713, 714, 715, 716, 717, 718, 719].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        },

        // === HUIHUI MIXED (å›žå›žæ­¥éª‘) ===
        'huihui_mixed': {
            // Huihui Mixed: Uses generically Zhonghua Mixed assets (Infantry + Cavalry + Archers)
            // PRIMARY (Front): Infantry (460..)
            MOVE: [460, 461, 462, 463, 464, 465, 466, 467].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [468, 469, 470, 471, 472, 473, 474, 475].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [492, 493, 494, 495, 496, 497, 498, 499].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [500, 501, 502, 503, 504, 505, 506, 507].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // SECONDARY (Middle): Cavalry (154..)
            // SECONDARY (Middle): Huihui Cavalry (Mounted Archer)
            SECONDARY: {
                MOVE: [664, 665, 666, 667, 668, 669, 670, 671].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [672, 673, 674, 675, 676, 677, 678, 679].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [680, 681, 682, 683, 684, 685, 686, 687].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                CHARGE: [688, 689, 690, 691, 692, 693, 694, 695].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [696, 697, 698, 699, 700, 701, 702, 703].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [704, 705, 706, 707, 708, 709, 710, 711].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)), // Added SHOOT just in case
                DEATH: [712, 713, 714, 715, 716, 717, 718, 719].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            },

            // TERTIARY (Back): Archers (283..)
            TERTIARY: {
                MOVE: [283, 284, 285, 286, 287, 288, 289, 290].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [291, 292, 293, 294, 295, 296, 297, 298].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [307, 308, 309, 310, 311, 312, 313, 314].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [315, 316, 317, 318, 319, 320, 321, 322].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [323, 324, 325, 326, 327, 328, 329, 330].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [331, 332, 333, 334, 335, 336, 337, 338].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'zhonghua_infantry': {
            // Zhonghua Infantry: Front Infantry, Back Archers
            MOVE: [460, 461, 462, 463, 464, 465, 466, 467].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [468, 469, 470, 471, 472, 473, 474, 475].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [492, 493, 494, 495, 496, 497, 498, 499].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [500, 501, 502, 503, 504, 505, 506, 507].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            SECONDARY: {
                MOVE: [283, 284, 285, 286, 287, 288, 289, 290].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [291, 292, 293, 294, 295, 296, 297, 298].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [307, 308, 309, 310, 311, 312, 313, 314].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [315, 316, 317, 318, 319, 320, 321, 322].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [323, 324, 325, 326, 327, 328, 329, 330].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [331, 332, 333, 334, 335, 336, 337, 338].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'tianchao_infantry': {
            // Tianchao Infantry (Wu): Same as Zhonghua Infantry for now
            MOVE: [460, 461, 462, 463, 464, 465, 466, 467].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [468, 469, 470, 471, 472, 473, 474, 475].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [492, 493, 494, 495, 496, 497, 498, 499].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [500, 501, 502, 503, 504, 505, 506, 507].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            SECONDARY: {
                MOVE: [283, 284, 285, 286, 287, 288, 289, 290].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [291, 292, 293, 294, 295, 296, 297, 298].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [307, 308, 309, 310, 311, 312, 313, 314].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [315, 316, 317, 318, 319, 320, 321, 322].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [323, 324, 325, 326, 327, 328, 329, 330].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [331, 332, 333, 334, 335, 336, 337, 338].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'zhonghua_mixed': {
            // Zhonghua Mixed (NEW): Front Infantry, Middle Cavalry, Back Archers
            // PRIMARY (Front): Infantry (460..)
            MOVE: [460, 461, 462, 463, 464, 465, 466, 467].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [468, 469, 470, 471, 472, 473, 474, 475].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [492, 493, 494, 495, 496, 497, 498, 499].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [500, 501, 502, 503, 504, 505, 506, 507].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // SECONDARY (Middle): Cavalry (154..)
            SECONDARY: {
                MOVE: [154, 155, 156, 157, 158, 159, 160, 161].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [162, 163, 164, 165, 166, 167, 168, 169].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [170, 171, 172, 173, 174, 175, 176, 177].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [178, 179, 180, 181, 182, 183, 184, 185].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [186, 187, 188, 189, 190, 191, 192, 193].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            },

            // TERTIARY (Back): Crossbowmen (342..)
            TERTIARY: {
                MOVE: [342, 343, 344, 345, 346, 347, 348, 349].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [350, 351, 352, 353, 354, 355, 356, 357].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [366, 367, 368, 369, 370, 371, 372, 373].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [374, 375, 376, 377, 378, 379, 380, 381].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [382, 383, 384, 385, 386, 387, 388, 389].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [390, 391, 392, 393, 394, 395, 396, 397].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'song_infantry': {
            // Song Infantry: Front (103..), Back (342.. Crossbows)
            // PRIMARY (Front)
            MOVE: [103, 104, 105, 106, 107, 108, 109, 110].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [111, 112, 113, 114, 115, 116, 117, 118].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [127, 128, 129, 130, 131, 132, 133, 134].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [135, 136, 137, 138, 139, 140, 141, 142].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [143, 144, 145, 146, 147, 148, 149, 150].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // SECONDARY (Back): Crossbows (342..) - Same as Zhonghua Mixed/Infantry secondary logical equivalent
            SECONDARY: {
                MOVE: [342, 343, 344, 345, 346, 347, 348, 349].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [350, 351, 352, 353, 354, 355, 356, 357].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [366, 367, 368, 369, 370, 371, 372, 373].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [374, 375, 376, 377, 378, 379, 380, 381].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [382, 383, 384, 385, 386, 387, 388, 389].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [390, 391, 392, 393, 394, 395, 396, 397].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'shu_infantry': {
            // Shu Infantry: Front (52-99), Back (342.. Crossbows)
            // PRIMARY (Front)
            MOVE: [52, 53, 54, 55, 56, 57, 58, 59].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [60, 61, 62, 63, 64, 65, 66, 67].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [76, 77, 78, 79, 80, 81, 82, 83].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [84, 85, 86, 87, 88, 89, 90, 91].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [92, 93, 94, 95, 96, 97, 98, 99].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // SECONDARY (Back): Crossbows (342..)
            SECONDARY: {
                MOVE: [342, 343, 344, 345, 346, 347, 348, 349].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [350, 351, 352, 353, 354, 355, 356, 357].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [366, 367, 368, 369, 370, 371, 372, 373].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [374, 375, 376, 377, 378, 379, 380, 381].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [382, 383, 384, 385, 386, 387, 388, 389].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [390, 391, 392, 393, 394, 395, 396, 397].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'zhou_infantry': {
            // Zhou Infantry (Huaxia 3x3 logic)
            // Front (Primary): 460.. (Zhonghua Inf)
            MOVE: [460, 461, 462, 463, 464, 465, 466, 467].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [468, 469, 470, 471, 472, 473, 474, 475].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)), // Using 468-475 standard
            IDLE: [484, 485, 486, 487, 488, 489, 490, 491].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [492, 493, 494, 495, 496, 497, 498, 499].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [500, 501, 502, 503, 504, 505, 506, 507].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // Back (Secondary): Archers (283..)
            SECONDARY: {
                MOVE: [283, 284, 285, 286, 287, 288, 289, 290].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [291, 292, 293, 294, 295, 296, 297, 298].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [307, 308, 309, 310, 311, 312, 313, 314].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [315, 316, 317, 318, 319, 320, 321, 322].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [323, 324, 325, 326, 327, 328, 329, 330].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [331, 332, 333, 334, 335, 336, 337, 338].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'yue_infantry': {
            // Yue Infantry (Huaxia 3x3)
            // Front (Primary): 52.. (Custom Infantry)
            MOVE: [52, 53, 54, 55, 56, 57, 58, 59].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [60, 61, 62, 63, 64, 65, 66, 67].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [76, 77, 78, 79, 80, 81, 82, 83].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [84, 85, 86, 87, 88, 89, 90, 91].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [92, 93, 94, 95, 96, 97, 98, 99].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // Back (Secondary): Archers (283..)
            SECONDARY: {
                MOVE: [283, 284, 285, 286, 287, 288, 289, 290].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [291, 292, 293, 294, 295, 296, 297, 298].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [307, 308, 309, 310, 311, 312, 313, 314].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [315, 316, 317, 318, 319, 320, 321, 322].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [323, 324, 325, 326, 327, 328, 329, 330].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [331, 332, 333, 334, 335, 336, 337, 338].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'riben_infantry': {
            // Riben Infantry: All same assets (No Back Row split)
            MOVE: [562, 563, 564, 565, 566, 567, 568, 569].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [570, 571, 572, 573, 574, 575, 576, 577].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [586, 587, 588, 589, 590, 591, 592, 593].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [594, 595, 596, 597, 598, 599, 600, 601].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [602, 603, 604, 605, 606, 607, 608, 609].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        },
        'e_infantry': {
            // E Infantry (Huaxia 3x3)
            // Front (Primary): 103.. (Custom Infantry)
            MOVE: [103, 104, 105, 106, 107, 108, 109, 110].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [111, 112, 113, 114, 115, 116, 117, 118].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [127, 128, 129, 130, 131, 132, 133, 134].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [135, 136, 137, 138, 139, 140, 141, 142].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [143, 144, 145, 146, 147, 148, 149, 150].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // Back (Secondary): Archers (283..)
            SECONDARY: {
                MOVE: [283, 284, 285, 286, 287, 288, 289, 290].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [291, 292, 293, 294, 295, 296, 297, 298].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [307, 308, 309, 310, 311, 312, 313, 314].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [315, 316, 317, 318, 319, 320, 321, 322].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [323, 324, 325, 326, 327, 328, 329, 330].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [331, 332, 333, 334, 335, 336, 337, 338].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'zhonghua_cavalry': {
            // Zhonghua Cavalry: Pure Cavalry
            MOVE: [154, 155, 156, 157, 158, 159, 160, 161].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [162, 163, 164, 165, 166, 167, 168, 169].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [170, 171, 172, 173, 174, 175, 176, 177].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [178, 179, 180, 181, 182, 183, 184, 185].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [186, 187, 188, 189, 190, 191, 192, 193].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        },
        'chaoxian_cavalry': {
            // Chaoxian Cavalry (Yan): From Zhonghua Cavalry
            MOVE: [154, 155, 156, 157, 158, 159, 160, 161].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [162, 163, 164, 165, 166, 167, 168, 169].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [170, 171, 172, 173, 174, 175, 176, 177].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [178, 179, 180, 181, 182, 183, 184, 185].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [186, 187, 188, 189, 190, 191, 192, 193].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        },
        'liang_cavalry': {
            // Liang Axe Cavalry
            MOVE: [197, 198, 199, 200, 201, 202, 203, 204].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [205, 206, 207, 208, 209, 210, 211, 212].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [213, 214, 215, 216, 217, 218, 219, 220].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [221, 222, 223, 224, 225, 226, 227, 228].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [229, 230, 231, 232, 233, 234, 235, 236].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        },
        'wei_cavalry': {
            // Wei Tiger Cavalry
            MOVE: [240, 241, 242, 243, 244, 245, 246, 247].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [248, 249, 250, 251, 252, 253, 254, 255].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [256, 257, 258, 259, 260, 261, 262, 263].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [264, 265, 266, 267, 268, 269, 270, 271].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [272, 273, 274, 275, 276, 277, 278, 279].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
        },
        'tujue_cavalry': {
            // Tujue Mixed Cavalry (Front: Axe, Back: Mounted Archer)
            // Front: Same as Liang (197..)
            MOVE: [197, 198, 199, 200, 201, 202, 203, 204].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [205, 206, 207, 208, 209, 210, 211, 212].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [213, 214, 215, 216, 217, 218, 219, 220].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [221, 222, 223, 224, 225, 226, 227, 228].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [229, 230, 231, 232, 233, 234, 235, 236].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // Back: Mounted Archers (664..)
            SECONDARY: {
                MOVE: [664, 665, 666, 667, 668, 669, 670, 671].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [672, 673, 674, 675, 676, 677, 678, 679].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [680, 681, 682, 683, 684, 685, 686, 687].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                CHARGE: [688, 689, 690, 691, 692, 693, 694, 695].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [696, 697, 698, 699, 700, 701, 702, 703].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [704, 705, 706, 707, 708, 709, 710, 711].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [712, 713, 714, 715, 716, 717, 718, 719].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'tian_cavalry': {
            // Tian Mixed Cavalry (Front: Wei Assets, Back: Mounted Archer)
            // Front: Same as Wei (240..)
            MOVE: [240, 241, 242, 243, 244, 245, 246, 247].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [248, 249, 250, 251, 252, 253, 254, 255].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [256, 257, 258, 259, 260, 261, 262, 263].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [264, 265, 266, 267, 268, 269, 270, 271].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [272, 273, 274, 275, 276, 277, 278, 279].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // Back: Mounted Archers (664..)
            SECONDARY: {
                MOVE: [664, 665, 666, 667, 668, 669, 670, 671].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [672, 673, 674, 675, 676, 677, 678, 679].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [680, 681, 682, 683, 684, 685, 686, 687].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                CHARGE: [688, 689, 690, 691, 692, 693, 694, 695].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [696, 697, 698, 699, 700, 701, 702, 703].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [704, 705, 706, 707, 708, 709, 710, 711].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [712, 713, 714, 715, 716, 717, 718, 719].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'xiyu_cavalry': {
            // Xiyu Mixed Cavalry (Front: 154.., Back: Mounted Archer 664..)
            // Front Row
            MOVE: [154, 155, 156, 157, 158, 159, 160, 161].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            ATTACK: [162, 163, 164, 165, 166, 167, 168, 169].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            IDLE: [170, 171, 172, 173, 174, 175, 176, 177].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DAMAGE: [178, 179, 180, 181, 182, 183, 184, 185].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            DEATH: [186, 187, 188, 189, 190, 191, 192, 193].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),

            // Back Row: Mounted Archers (664..) - Same as Tujue/Tian back row
            SECONDARY: {
                MOVE: [664, 665, 666, 667, 668, 669, 670, 671].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                ATTACK: [672, 673, 674, 675, 676, 677, 678, 679].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                IDLE: [680, 681, 682, 683, 684, 685, 686, 687].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                CHARGE: [688, 689, 690, 691, 692, 693, 694, 695].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DAMAGE: [696, 697, 698, 699, 700, 701, 702, 703].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                SHOOT: [704, 705, 706, 707, 708, 709, 710, 711].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
                DEATH: [712, 713, 714, 715, 716, 717, 718, 719].map(id => resolvePath(`/SUCAI/S10DB/${id}-1.png`)),
            }
        },
        'xiyang_legion': {
            // [NOTE] S8 ASSETS (ä¸‰å›½8å…µæ¨¡) - HANDLED MANUALLY IN LegionPhalanxDrawer.ts
            // Files 1-80 are stitched at runtime.
            MOVE: [],
            ATTACK: [],
            IDLE: [],
            DAMAGE: [],
            DEATH: [],
        },
        'han_legion': {
            // [NOTE] Handled manually in LegionAssetManager (S8YD + S8GJ)
            MOVE: [],
            ATTACK: [],
            IDLE: [],
            DAMAGE: [],
            DEATH: [],
        },
        'yuenan_legion': {
            // [NOTE] Handled manually in LegionAssetManager (S8YD)
            MOVE: [],
            ATTACK: [],
            IDLE: [],
            DAMAGE: [],
            DEATH: [],
        },
        'qiangzang_legion': {
            // [NOTE] Handled manually in LegionAssetManager (S8YD)
            MOVE: [],
            ATTACK: [],
            IDLE: [],
            DAMAGE: [],
            DEATH: [],
        },
        'zang_legion': {
            // [NOTE] Handled manually in LegionAssetManager (S8YD)
            MOVE: [],
            ATTACK: [],
            IDLE: [],
            DAMAGE: [],
            DEATH: [],
        },
        'gao_legion': {
            // [NOTE] Handled manually in LegionAssetManager (S8YD)
            MOVE: [],
            ATTACK: [],
            IDLE: [],
            DAMAGE: [],
            DEATH: [],
        },
    },
    BANDIT: {
        MOVE: resolvePath('/assets/NPC/daozei1.png'),
        ATTACK: [
            resolvePath('/assets/NPC/daozei2.png'),
            resolvePath('/assets/NPC/daozei3.png')
        ],
        DAMAGE: resolvePath('/assets/NPC/daozei3.png')
    },
    RAIDER: {
        MOVE: resolvePath('/assets/NPC/luikou1.png'),
        ATTACK: [
            resolvePath('/assets/NPC/luikou2.png'),
            resolvePath('/assets/NPC/luikou3.png')
        ],
        DAMAGE: resolvePath('/assets/NPC/luikou3.png')
    },
    OUTLAW: {
        MOVE: resolvePath('/assets/NPC/tufei1.png'),
        ATTACK: [
            resolvePath('/assets/NPC/tufei2.png'),
            resolvePath('/assets/NPC/tufei3.png')
        ],
        DAMAGE: resolvePath('/assets/NPC/tufei3.png')
    },
    REBEL: {
        MOVE: resolvePath('/assets/NPC/panjun1.png'),
        ATTACK: [
            resolvePath('/assets/NPC/panjun2.png'),
            resolvePath('/assets/NPC/panjun3.png')
        ],
        DAMAGE: resolvePath('/assets/NPC/panjun3.png')
    },
    BARBARIAN: {
        MOVE: resolvePath('/assets/NPC/yizu1.png'),
        ATTACK: [
            resolvePath('/assets/NPC/yizu2.png'),
            resolvePath('/assets/NPC/yizu3.png')
        ],
        DAMAGE: resolvePath('/assets/NPC/yizu3.png')
    },
    GENERAL: {
        IDLE: resolvePath('/SUCAI/S10B/42-1.png'),
        MOVE: resolvePath('/SUCAI/S10B/43-1.png'),
        ATTACK: resolvePath('/SUCAI/S10B/42-1.png'),
        DAMAGE: resolvePath('/SUCAI/S10B/92-1.png')
    }
} as const;
