"use client";

import { useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import { useLeverStore } from "@/store";
import { ComparisonResult } from "@/types";
import { HistoryCard } from "./HistoryCard";

interface HistoryTabProps {
  onLoadHistory: (result: ComparisonResult) => void;
}

export function HistoryTab({ onLoadHistory }: HistoryTabProps) {
  const comparisonHistory = useLeverStore((s) => s.comparisonHistory);
  const deleteHistoryEntry = useLeverStore((s) => s.deleteHistoryEntry);
  const clearHistory = useLeverStore((s) => s.clearHistory);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = () => {
    if (confirmClear) {
      clearHistory();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  if (comparisonHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 text-slate-500" />
        </div>
        <p className="text-sm text-slate-400 mb-1">No comparisons yet</p>
        <p className="text-xs text-slate-500">Run a comparison to see it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-slate-500">
          {comparisonHistory.length} comparison{comparisonHistory.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={handleClearAll}
          className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
            confirmClear
              ? "bg-red-950/60 text-red-400 border border-red-800/40"
              : "text-slate-500 hover:text-red-400 hover:bg-red-950/30"
          }`}
        >
          <Trash2 className="w-3 h-3" />
          {confirmClear ? "Confirm Clear" : "Clear All"}
        </button>
      </div>

      {/* History list */}
      {comparisonHistory.map((entry, idx) => (
        <HistoryCard
          key={entry.id ?? idx}
          entry={entry}
          onLoad={() => onLoadHistory(entry)}
          onDelete={() => entry.id && deleteHistoryEntry(entry.id)}
        />
      ))}
    </div>
  );
}
