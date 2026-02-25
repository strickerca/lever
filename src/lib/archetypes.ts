import { Sex } from "../types";

// Map arm proportions to numerical SD modifiers
export const ARM_PROPORTION_TO_SD: Record<string, number> = {
    extraShort: -2,
    short: -1,
    average: 0,
    long: 1,
    extraLong: 2,
};

// Map torso-leg proportions to numerical SD modifiers (for legs)
// We key off "legs" SD for the grid lookup.
export const TORSO_LEG_TO_SD: Record<string, { torso: number; legs: number }> = {
    veryLongLegs: { torso: -2, legs: 2 },
    longLegs: { torso: -1, legs: 1 },
    average: { torso: 0, legs: 0 },
    longTorso: { torso: 1, legs: -1 },
    veryLongTorso: { torso: 2, legs: -2 },
};

export interface ArchetypeTheme {
    colors: {
        background: string; // Background gradient or solid color
        text: string;       // Text color
        accent: string;     // Border/Highlight color
        glow: string;       // Box shadow color
    };
}

export interface ArchetypeData {
    name: string;
    description: string;
    ratios: {
        femur: number;
        torso: number;
        arm: number;
    };
    theme: ArchetypeTheme;
}

// Consolidated 3x3 Grid - MALE
export const ARCHETYPE_GRID_MALE: Record<string, Record<string, ArchetypeData>> = {
    // Row -1: Torso Dominant (Short Legs / Long Torso)
    minus1: {
        // Short Arms / Short Legs
        minus1: {
            name: "DREADNOUGHT",
            description: "A compact, heavily armored fortress. Your reduced range of motion grants immense stability and pressing power.",
            ratios: { femur: 0.259, torso: 0.307, arm: 0.933 },
            theme: { colors: { background: "from-slate-900 to-stone-800", text: "text-orange-100", accent: "border-orange-600", glow: "shadow-orange-900/40" } }
        },
        // Avg Arms / Short Legs
        0: {
            name: "SENTINEL",
            description: "The unyielding guardian. Your imposing torso and balanced reach create a formidable defensive wall.",
            ratios: { femur: 0.259, torso: 0.307, arm: 1.00 },
            theme: { colors: { background: "from-blue-950 to-slate-900", text: "text-blue-100", accent: "border-blue-500", glow: "shadow-blue-600/30" } }
        },
        // Long Arms / Short Legs
        1: {
            name: "TITAN",
            description: "A colossus of myth. With a massive frame and colossal reach, you dominate space like a giant.",
            ratios: { femur: 0.259, torso: 0.307, arm: 1.068 },
            theme: { colors: { background: "from-yellow-950 to-stone-900", text: "text-yellow-100", accent: "border-yellow-600", glow: "shadow-yellow-600/30" } }
        },
    },
    // Row 0: Balanced
    0: {
        // Short Arms / Avg Legs
        minus1: {
            name: "BREACHER",
            description: "Built for explosive entry. Short limbs maximize your leverage for rapid, forceful movements.",
            ratios: { femur: 0.276, torso: 0.288, arm: 0.933 },
            theme: { colors: { background: "from-neutral-900 to-red-950", text: "text-red-100", accent: "border-red-600", glow: "shadow-red-600/40" } }
        },
        // Avg Arms / Avg Legs
        0: {
            name: "OPERATOR",
            description: "The tactical standard. Balanced proportions allow you to adapt effectively to any physical demand.",
            ratios: { femur: 0.276, torso: 0.288, arm: 1.00 },
            theme: { colors: { background: "from-emerald-950 to-stone-900", text: "text-emerald-100", accent: "border-emerald-600", glow: "shadow-emerald-600/30" } }
        },
        // Long Arms / Avg Legs
        1: {
            name: "LANCER",
            description: "The piercing spear. Your extended reach allows you to strike comfortably from a distance.",
            ratios: { femur: 0.276, torso: 0.288, arm: 1.068 },
            theme: { colors: { background: "from-sky-950 to-blue-900", text: "text-sky-100", accent: "border-sky-500", glow: "shadow-sky-500/40" } }
        },
    },
    // Row 1: Leg Dominant (Long Legs)
    1: {
        // Short Arms / Long Legs
        minus1: {
            name: "STRIKER",
            description: "Agile and kinetic. Your long stride and compact upper body maximize speed and rotational power.",
            ratios: { femur: 0.293, torso: 0.269, arm: 0.933 },
            theme: { colors: { background: "from-cyan-950 to-slate-900", text: "text-cyan-100", accent: "border-cyan-500", glow: "shadow-cyan-500/40" } }
        },
        // Avg Arms / Long Legs
        0: {
            name: "RANGER",
            description: "The mobile scout. Built for endurance and traversing formidable terrain with efficient stride.",
            ratios: { femur: 0.293, torso: 0.269, arm: 1.00 },
            theme: { colors: { background: "from-green-950 to-amber-950", text: "text-green-100", accent: "border-green-600", glow: "shadow-green-600/30" } }
        },
        // Long Arms / Long Legs
        1: {
            name: "WRAITH",
            description: "A phantom of the void. Your elongated limbs provide unmatched leverage for deadly, sweeping pulls.",
            ratios: { femur: 0.293, torso: 0.269, arm: 1.068 },
            theme: { colors: { background: "from-purple-950 to-zinc-950", text: "text-purple-200", accent: "border-purple-600", glow: "shadow-purple-600/40" } }
        },
    }
} as const;

// Consolidated 3x3 Grid - FEMALE
export const ARCHETYPE_GRID_FEMALE: Record<string, Record<string, ArchetypeData>> = {
    // Row -1: Torso Dominant (Short Legs / Long Torso)
    minus1: {
        // Short Arms / Short Legs
        minus1: {
            name: "AEGIS",
            description: "The divine shield. Compact and unbreakable, your frame is designed to weather any storm.",
            ratios: { femur: 0.259, torso: 0.307, arm: 0.933 },
            theme: { colors: { background: "from-teal-950 to-slate-900", text: "text-teal-100", accent: "border-teal-400", glow: "shadow-teal-500/30" } }
        },
        // Avg Arms / Short Legs
        0: {
            name: "WARDEN",
            description: "The vigilant protector. Your commanding presence and solid foundation hold the line effortlessly.",
            ratios: { femur: 0.259, torso: 0.307, arm: 1.00 },
            theme: { colors: { background: "from-violet-950 to-slate-900", text: "text-violet-100", accent: "border-violet-400", glow: "shadow-violet-500/30" } }
        },
        // Long Arms / Short Legs
        1: {
            name: "SERAPH",
            description: "Angelic grace with immense power. Your wingspan is vast, casting a shadow of awe.",
            ratios: { femur: 0.259, torso: 0.307, arm: 1.068 },
            theme: { colors: { background: "from-amber-950 to-yellow-900", text: "text-amber-100", accent: "border-amber-400", glow: "shadow-amber-500/40" } }
        },
    },
    // Row 0: Balanced
    0: {
        // Short Arms / Avg Legs
        minus1: {
            name: "BANSHEE",
            description: "A piercing force. Short levers allow you to generate shrieking velocity and explosive power.",
            ratios: { femur: 0.276, torso: 0.288, arm: 0.933 },
            theme: { colors: { background: "from-fuchsia-950 to-rose-950", text: "text-fuchsia-100", accent: "border-fuchsia-500", glow: "shadow-fuchsia-500/30" } }
        },
        // Avg Arms / Avg Legs
        0: {
            name: "SPECTRE",
            description: "The unseen presence. Perfectly balanced to move through the world like a ghost, adaptive and fluid.",
            ratios: { femur: 0.276, torso: 0.288, arm: 1.00 },
            theme: { colors: { background: "from-slate-900 to-zinc-800", text: "text-slate-300", accent: "border-slate-500", glow: "shadow-slate-500/30" } }
        },
        // Long Arms / Avg Legs
        1: {
            name: "VALKYRIE",
            description: "Chooser of the slain. Your reach extends like wings, striking from above with divine judgment.",
            ratios: { femur: 0.276, torso: 0.288, arm: 1.068 },
            theme: { colors: { background: "from-sky-950 to-indigo-950", text: "text-sky-200", accent: "border-sky-400", glow: "shadow-sky-500/40" } }
        },
    },
    // Row 1: Leg Dominant (Long Legs)
    1: {
        // Short Arms / Long Legs
        minus1: {
            name: "FURY",
            description: "Relentless wrath. Your long legs drive you forward while compact arms deliver furious, rapid blows.",
            ratios: { femur: 0.293, torso: 0.269, arm: 0.933 },
            theme: { colors: { background: "from-red-950 to-black", text: "text-red-100", accent: "border-red-600", glow: "shadow-red-600/50" } }
        },
        // Avg Arms / Long Legs
        0: {
            name: "HUNTRESS",
            description: "Apex predator of the wilds. Built for the chase, your efficiency in movement is unmatched.",
            ratios: { femur: 0.293, torso: 0.269, arm: 1.00 },
            theme: { colors: { background: "from-emerald-950 to-teal-950", text: "text-emerald-100", accent: "border-emerald-500", glow: "shadow-emerald-500/30" } }
        },
        // Long Arms / Long Legs
        1: {
            name: "WIDOW",
            description: "Elegant and deadly. Your elongated limbs weave a web of control that few can escape.",
            ratios: { femur: 0.293, torso: 0.269, arm: 1.068 },
            theme: { colors: { background: "from-purple-950 to-indigo-950", text: "text-purple-100", accent: "border-purple-500", glow: "shadow-purple-500/40" } }
        },
    }
} as const;


/**
 * Maps numeric inputs (-2 to 2) to ARCHETYPE_GRID keys (-1, 0, 1).
 */
export function getArchetype(torsoLegRatio: string, armLength: string, sex: Sex = Sex.MALE): ArchetypeData {
    // Get raw SDs (-2 to 2)
    const legSD = TORSO_LEG_TO_SD[torsoLegRatio]?.legs ?? 0;
    const armSD = ARM_PROPORTION_TO_SD[armLength] ?? 0;

    // Consolidate Input to 3x3 Grid (-1, 0, 1)
    const consolidate = (n: number): -1 | 0 | 1 => {
        if (n <= -1) return -1;
        if (n >= 1) return 1;
        return 0;
    };

    const rowIdx = consolidate(legSD);
    const colIdx = consolidate(armSD);

    // Map index to internal grid string keys
    const toKey = (n: number): "minus1" | "0" | "1" => {
        if (n === -1) return "minus1";
        return n === 0 ? "0" : "1";
    };

    const rowKey = toKey(rowIdx);
    const colKey = toKey(colIdx);

    const grid = sex === Sex.FEMALE ? ARCHETYPE_GRID_FEMALE : ARCHETYPE_GRID_MALE;

    // Default Fallback
    const fallback: ArchetypeData = {
        name: "THE UNKNOWN",
        description: "An undefinable anomaly.",
        ratios: { femur: 0.276, torso: 0.288, arm: 1.00 },
        theme: {
            colors: {
                background: "from-gray-800 to-gray-900",
                text: "text-gray-300",
                accent: "border-gray-600",
                glow: "shadow-none"
            }
        }
    };

    // Safe Lookup
    const baseArchetype = grid[rowKey]?.[colKey] ?? fallback;

    const finalRatios = { ...baseArchetype.ratios };
    let requestModification = false;

    // 1. Dynamic Arm Scaling (-2, +2)
    const ARM_STEP = 0.068;
    if (armSD !== colIdx) {
        // Calculate difference (e.g., 2 - 1 = 1 step)
        const diff = armSD - colIdx;
        finalRatios.arm += (diff * ARM_STEP);
        requestModification = true;
    }

    // 2. Dynamic Leg/Torso Scaling (-2, +2)
    // Positive LegSD = Longer Legs (+Femur), Shorter Torso (-Torso)
    const FEMUR_STEP = 0.017;
    const TORSO_STEP = 0.019;

    if (legSD !== rowIdx) {
        const diff = legSD - rowIdx;
        finalRatios.femur += (diff * FEMUR_STEP);
        finalRatios.torso -= (diff * TORSO_STEP);
        requestModification = true;
    }

    if (requestModification) {
        return {
            ...baseArchetype,
            ratios: finalRatios
        };
    }

    return baseArchetype;
}
