"use client";

import { Pencil, Trash2, UserCircle } from "lucide-react";
import { SavedProfile, Sex } from "@/types";
import { formatHeight, formatWeight } from "@/lib/formatters";
import { useUnits } from "@/hooks/useUnits";

interface ProfileCardProps {
  profile: SavedProfile;
  onLoadAsA: () => void;
  onLoadAsB: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProfileCard({ profile, onLoadAsA, onLoadAsB, onEdit, onDelete }: ProfileCardProps) {
  const { height: heightUnit, weight: weightUnit } = useUnits();

  const sexLabel = profile.sex === Sex.MALE ? "M" : "F";
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="group rounded-lg border border-slate-700/50 bg-slate-900/60 p-3 hover:border-slate-600/60 transition-colors">
      {/* Header: avatar + name + sex */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-900/60 to-slate-800 flex items-center justify-center text-[11px] font-bold text-cyan-300 border border-cyan-800/30 shrink-0">
          {initials || <UserCircle className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200 truncate">{profile.name}</p>
          <p className="text-[11px] text-slate-500">
            {formatHeight(profile.height, heightUnit)} · {formatWeight(profile.weight, weightUnit)} · {sexLabel}
          </p>
        </div>
        {/* Edit/Delete */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Edit profile"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
            aria-label="Delete profile"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Mode badge */}
      <div className="mb-2.5">
        <span className="text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-500 border border-slate-700/40">
          {profile.customSegments ? "Custom Segments" : "Standard Proportions"}
        </span>
      </div>

      {/* Load buttons */}
      <div className="flex gap-2 pt-2 border-t border-slate-800/60">
        <button
          onClick={onLoadAsA}
          className="flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-md bg-cyan-950/30 text-cyan-400 border border-cyan-800/30 hover:bg-cyan-900/40 hover:border-cyan-700/40 transition-colors cursor-pointer"
        >
          Load as A
        </button>
        <button
          onClick={onLoadAsB}
          className="flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-md bg-pink-950/30 text-pink-400 border border-pink-800/30 hover:bg-pink-900/40 hover:border-pink-700/40 transition-colors cursor-pointer"
        >
          Load as B
        </button>
      </div>
    </div>
  );
}
