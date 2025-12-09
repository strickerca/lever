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
          border: "border-blue-200",
          bg: "bg-blue-50",
          icon: "text-blue-600",
          text: "text-blue-900",
        };
      case "advantage_B":
        return {
          border: "border-orange-200",
          bg: "bg-orange-50",
          icon: "text-orange-600",
          text: "text-orange-900",
        };
      case "neutral":
        return {
          border: "border-gray-200",
          bg: "bg-gray-50",
          icon: "text-gray-600",
          text: "text-gray-900",
        };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
        <div className="text-center text-gray-500 text-sm py-8">
          No significant differences detected
        </div>
      )}
    </div>
  );
}
