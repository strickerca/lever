"use client";

import Link from "next/link";

interface ComparisonModeSelectorProps {
  currentMode: "quick" | "detailed";
}

export function ComparisonModeSelector({ currentMode }: ComparisonModeSelectorProps) {
  return (
    <div className="bg-transparent border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Biomechanical Comparison
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quick Comparison */}
          <Link
            href="/compare/quick"
            className={`p-4 rounded-lg border transition-all ${currentMode === "quick"
                ? "border-blue-500 bg-blue-900/20 shadow-md shadow-blue-900/20"
                : "border-slate-800 bg-slate-900/50 hover:border-blue-500/50 hover:bg-slate-800/80"
              }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center mt-0.5 ${currentMode === "quick"
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-slate-600 bg-transparent"
                }`}>
                {currentMode === "quick" && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${currentMode === "quick" ? "text-blue-400" : "text-slate-200"
                  }`}>
                  Quick Comparison
                </h3>
                <p className={`text-sm ${currentMode === "quick" ? "text-blue-200" : "text-slate-400"
                  }`}>
                  Simple height & weight inputs with standard proportions. Fast and easy for most comparisons.
                </p>
              </div>
            </div>
          </Link>

          {/* Detailed Comparison */}
          <Link
            href="/compare/detailed"
            className={`p-4 rounded-lg border transition-all ${currentMode === "detailed"
                ? "border-blue-500 bg-blue-900/20 shadow-md shadow-blue-900/20"
                : "border-slate-800 bg-slate-900/50 hover:border-blue-500/50 hover:bg-slate-800/80"
              }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center mt-0.5 ${currentMode === "detailed"
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-slate-600 bg-transparent"
                }`}>
                {currentMode === "detailed" && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${currentMode === "detailed" ? "text-blue-400" : "text-slate-200"
                  }`}>
                  Detailed Comparison
                </h3>
                <p className={`text-sm ${currentMode === "detailed" ? "text-blue-200" : "text-slate-400"
                  }`}>
                  Advanced mode with individual segment length modifiers and cross-lift variant comparisons.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
