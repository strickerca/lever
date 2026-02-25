"use client";

import { Clock, User } from "lucide-react";

interface PersistenceTriggerProps {
  onClick: () => void;
  historyCount: number;
  profileCount: number;
}

export function PersistenceTrigger({ onClick, historyCount, profileCount }: PersistenceTriggerProps) {
  const totalCount = historyCount + profileCount;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200 bg-slate-900/50 hover:bg-slate-800/50 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <User className="w-3.5 h-3.5" />
      </div>
      <span>History & Profiles</span>
      {totalCount > 0 && (
        <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-800/40">
          {totalCount}
        </span>
      )}
    </button>
  );
}
