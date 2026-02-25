"use client";

import { Trash2, RotateCcw } from "lucide-react";
import { ComparisonResult } from "@/types";
import { formatRelativeDate, formatLiftFamily } from "@/lib/formatters";

interface HistoryCardProps {
  entry: ComparisonResult;
  onLoad: () => void;
  onDelete: () => void;
}

export function HistoryCard({ entry, onLoad, onDelete }: HistoryCardProps) {
  const { lifterA, lifterB, comparison } = entry;
  const liftLabel = entry.snapshot?.liftFamily
    ? formatLiftFamily(entry.snapshot.liftFamily)
    : "Comparison";

  const advantageColor =
    comparison.advantageDirection === "advantage_A"
      ? "text-cyan-400"
      : comparison.advantageDirection === "advantage_B"
        ? "text-pink-400"
        : "text-slate-400";

  const advantageBg =
    comparison.advantageDirection === "advantage_A"
      ? "bg-cyan-950/40 border-cyan-800/30"
      : comparison.advantageDirection === "advantage_B"
        ? "bg-pink-950/40 border-pink-800/30"
        : "bg-slate-800/40 border-slate-700/30";

  return (
    <div className="group relative rounded-lg border border-slate-700/50 bg-slate-900/60 p-3 hover:border-slate-600/60 transition-colors">
      {/* Top row: lift badge + timestamp */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
          {liftLabel}
        </span>
        {entry.timestamp && (
          <span className="text-[10px] text-slate-500">
            {formatRelativeDate(entry.timestamp)}
          </span>
        )}
      </div>

      {/* Lifter names */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-cyan-300 truncate max-w-[120px]">
          {lifterA.name}
        </span>
        <span className="text-[10px] text-slate-500">vs</span>
        <span className="text-xs font-medium text-pink-300 truncate max-w-[120px]">
          {lifterB.name}
        </span>
      </div>

      {/* Advantage badge */}
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${advantageBg} ${advantageColor}`}>
        {comparison.advantageDirection === "neutral"
          ? "Even"
          : `${Math.abs(comparison.advantagePercentage).toFixed(1)}% advantage ${comparison.advantageDirection === "advantage_A" ? lifterA.name : lifterB.name}`
        }
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60">
        <button
          onClick={onLoad}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reload
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md text-slate-500 hover:bg-red-950/40 hover:text-red-400 transition-colors cursor-pointer ml-auto"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
