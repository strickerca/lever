"use client";

import { SDModifiers } from "@/types";
import * as Slider from "@radix-ui/react-slider";
import { SD_MULTIPLIER_COEFFICIENT } from "@/lib/biomechanics/constants";

interface SDSlidersProps {
  values: SDModifiers;
  onChange: (values: SDModifiers) => void;
}

const SD_LABELS: Record<string, Record<number, string>> = {
  arms: {
    "-3": "T-Rex",
    "-2": "Short",
    "-1": "Below Avg",
    "0": "Average",
    "1": "Above Avg",
    "2": "Long",
    "3": "Orangutan",
  },
  legs: {
    "-3": "Stumpy",
    "-2": "Short",
    "-1": "Below Avg",
    "0": "Average",
    "1": "Above Avg",
    "2": "Long",
    "3": "Stilt",
  },
  torso: {
    "-3": "Compact",
    "-2": "Short",
    "-1": "Below Avg",
    "0": "Average",
    "1": "Above Avg",
    "2": "Long",
    "3": "Lengthy",
  },
};

function calculateMultiplier(sd: number): number {
  return 1 + sd * SD_MULTIPLIER_COEFFICIENT;
}

interface SliderRowProps {
  label: string;
  segment: keyof SDModifiers;
  value: number;
  onChange: (value: number) => void;
}

function SliderRow({ label, segment, value, onChange }: SliderRowProps) {
  const multiplier = calculateMultiplier(value);
  const labelText = SD_LABELS[segment][value] || "";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{labelText}</span>
          <span className="ml-2 text-gray-500">
            ({multiplier.toFixed(3)}×)
          </span>
        </div>
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[value]}
        onValueChange={(vals) => onChange(vals[0]!)}
        min={-3}
        max={3}
        step={1}
      >
        <Slider.Track className="bg-gray-200 relative grow rounded-full h-1">
          <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className="block w-5 h-5 bg-white border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          aria-label={label}
        />
      </Slider.Root>
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>-3</span>
        <span>-2</span>
        <span>-1</span>
        <span>0</span>
        <span>+1</span>
        <span>+2</span>
        <span>+3</span>
      </div>
    </div>
  );
}

export function SDSliders({ values, onChange }: SDSlidersProps) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        Adjust segment lengths by standard deviations from population average
      </div>

      <SliderRow
        label="Arms"
        segment="arms"
        value={values.arms}
        onChange={(arms) => onChange({ ...values, arms })}
      />

      <SliderRow
        label="Legs"
        segment="legs"
        value={values.legs}
        onChange={(legs) => onChange({ ...values, legs })}
      />

      <SliderRow
        label="Torso"
        segment="torso"
        value={values.torso}
        onChange={(torso) => onChange({ ...values, torso })}
      />
    </div>
  );
}
