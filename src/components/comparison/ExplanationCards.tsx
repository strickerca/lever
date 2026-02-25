"use client";

import { ComparisonResult } from "@/types";
import { Info } from "lucide-react";

interface ExplanationCardsProps {
  explanations: ComparisonResult["explanations"];
}

export function ExplanationCards({ explanations }: ExplanationCardsProps) {
  const getCardStyle = (
    impact: "advantage_A" | "advantage_B" | "neutral"
  ) => {
    switch (impact) {
      case "advantage_A":
        return {
          border: "border-blue-500/30",
          bg: "bg-blue-900/20",
          icon: "text-blue-400",
          text: "text-blue-200",
        };
      case "advantage_B":
        return {
          border: "border-orange-500/30",
          bg: "bg-orange-900/20",
          icon: "text-orange-400",
          text: "text-orange-200",
        };
      case "neutral":
        return {
          border: "border-slate-700",
          bg: "bg-slate-800/50",
          icon: "text-slate-500",
          text: "text-slate-300",
        };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">
        Biomechanical Analysis
      </h3>

      {explanations.map((explanation, index) => {
        const style = getCardStyle(explanation.impact);

        return (
          <div
            key={index}
            className={`${style.border} ${style.bg} border rounded-lg p-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-start gap-3">
              <Info className={`${style.icon} w-5 h-5 flex-shrink-0 mt-0.5`} />
              <p className={`${style.text} text-sm leading-relaxed`}>
                {explanation.message}
              </p>
            </div>
          </div>
        );
      })}

      {explanations.length === 0 && (
        <div className="text-center text-slate-500 text-sm py-8">
          No significant differences detected
        </div>
      )}
    </div>
  );
}
