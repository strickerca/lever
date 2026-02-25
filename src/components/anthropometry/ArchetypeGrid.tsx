"use client";

import { Sex, TorsoLegProportion, ArmProportion } from "@/types";
import {
  ARCHETYPE_GRID_MALE,
  ARCHETYPE_GRID_FEMALE,
  type ArchetypeData,
} from "@/lib/archetypes";

interface ArchetypeGridProps {
  sex: Sex;
  currentTorsoLeg: TorsoLegProportion;
  currentArm: ArmProportion;
  onSelect: (torsoLeg: TorsoLegProportion, arm: ArmProportion) => void;
}

// Maps grid row/col indices to the proportion enum values
const ROW_MAP: { key: string; label: string; value: TorsoLegProportion }[] = [
  { key: "1", label: "Long Legs", value: "longLegs" },
  { key: "0", label: "Balanced", value: "average" },
  { key: "minus1", label: "Long Torso", value: "longTorso" },
];

const COL_MAP: { key: string; label: string; value: ArmProportion }[] = [
  { key: "minus1", label: "Short", value: "short" },
  { key: "0", label: "Average", value: "average" },
  { key: "1", label: "Long", value: "long" },
];

function isSelected(
  rowValue: TorsoLegProportion,
  colValue: ArmProportion,
  currentTorsoLeg: TorsoLegProportion,
  currentArm: ArmProportion
): boolean {
  // Map the 5-value proportions to the 3-value grid cells
  const torsoLegMap: Record<TorsoLegProportion, TorsoLegProportion> = {
    veryLongLegs: "longLegs",
    longLegs: "longLegs",
    average: "average",
    longTorso: "longTorso",
    veryLongTorso: "longTorso",
  };
  const armMap: Record<ArmProportion, ArmProportion> = {
    extraShort: "short",
    short: "short",
    average: "average",
    long: "long",
    extraLong: "long",
  };
  return torsoLegMap[currentTorsoLeg] === rowValue && armMap[currentArm] === colValue;
}

export function ArchetypeGrid({
  sex,
  currentTorsoLeg,
  currentArm,
  onSelect,
}: ArchetypeGridProps) {
  const grid = sex === Sex.FEMALE ? ARCHETYPE_GRID_FEMALE : ARCHETYPE_GRID_MALE;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Preset Archetypes
        </h4>
        <span className="text-[10px] text-slate-600">Arms &rarr;</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1">
        <div /> {/* spacer for row labels */}
        {COL_MAP.map((col) => (
          <div
            key={col.key}
            className="text-center text-[9px] font-medium text-slate-500 pb-0.5"
          >
            {col.label}
          </div>
        ))}

        {/* Grid rows */}
        {ROW_MAP.map((row) => {
          const gridRow = grid[row.key];
          if (!gridRow) return null;

          return [
            // Row label
            <div
              key={`label-${row.key}`}
              className="flex items-center text-[9px] font-medium text-slate-500 pr-1 whitespace-nowrap"
            >
              {row.label}
            </div>,
            // Grid cells
            ...COL_MAP.map((col) => {
              const archetype = gridRow[col.key] as ArchetypeData | undefined;
              if (!archetype) return <div key={`${row.key}-${col.key}`} />;

              const selected = isSelected(row.value, col.value, currentTorsoLeg, currentArm);

              return (
                <button
                  key={`${row.key}-${col.key}`}
                  type="button"
                  onClick={() => onSelect(row.value, col.value)}
                  className={`
                    relative px-1 py-1.5 rounded-md text-center transition-all duration-150 cursor-pointer
                    border text-[10px] font-bold uppercase tracking-wide leading-tight
                    ${selected
                      ? `bg-gradient-to-r ${archetype.theme.colors.background} ${archetype.theme.colors.accent} ${archetype.theme.colors.text} ring-1 ring-white/20 shadow-md ${archetype.theme.colors.glow}`
                      : "bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                    }
                  `}
                  title={archetype.description}
                >
                  {archetype.name}
                </button>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}
