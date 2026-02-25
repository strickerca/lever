"use client";

import Link from "next/link";
import { useUnits } from "@/hooks/useUnits";
import { Ruler } from "lucide-react";

export function GlobalHeader() {
  const { preference, toggle } = useUnits();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-11 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-bold tracking-[0.2em] text-slate-300 hover:text-white transition-colors uppercase"
        >
          LEVER
        </Link>

        <button
          onClick={toggle}
          aria-label={`Switch to ${preference === "metric" ? "imperial" : "metric"} units`}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border border-slate-700/60 text-slate-400 hover:border-cyan-800/60 hover:text-cyan-300 transition-all duration-200 cursor-pointer"
        >
          <Ruler className="w-3 h-3" />
          {preference === "metric" ? "Metric" : "Imperial"}
        </button>
      </div>
    </header>
  );
}
