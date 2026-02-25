"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";
import { SavedProfile, Sex, TorsoLegProportion, ArmProportion } from "@/types";
import { useUnits } from "@/hooks/useUnits";

interface ProfileEditorProps {
  initial?: SavedProfile;
  onSave: (data: Omit<SavedProfile, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

const TORSO_LEG_OPTIONS: { label: string; value: TorsoLegProportion }[] = [
  { label: "Very Long Legs", value: "veryLongLegs" },
  { label: "Long Legs", value: "longLegs" },
  { label: "Average", value: "average" },
  { label: "Long Torso", value: "longTorso" },
  { label: "Very Long Torso", value: "veryLongTorso" },
];

const ARM_OPTIONS: { label: string; value: ArmProportion }[] = [
  { label: "Extra Short", value: "extraShort" },
  { label: "Short", value: "short" },
  { label: "Average", value: "average" },
  { label: "Long", value: "long" },
  { label: "Extra Long", value: "extraLong" },
];

export function ProfileEditor({ initial, onSave, onCancel }: ProfileEditorProps) {
  const { height: heightUnit, weight: weightUnit } = useUnits();

  const [name, setName] = useState(initial?.name ?? "");
  const [height, setHeight] = useState(() => {
    const m = initial?.height ?? 1.75;
    return heightUnit === "inches" ? String(Math.round(m * 39.3701)) : String(Math.round(m * 100));
  });
  const [weight, setWeight] = useState(() => {
    const kg = initial?.weight ?? 77;
    return weightUnit === "lbs" ? String(Math.round(kg * 2.20462)) : String(Math.round(kg));
  });
  const [sex, setSex] = useState<Sex>(initial?.sex ?? Sex.MALE);
  const [torsoLegRatio, setTorsoLegRatio] = useState<TorsoLegProportion>(initial?.torsoLegRatio ?? "average");
  const [armLength, setArmLength] = useState<ArmProportion>(initial?.armLength ?? "average");
  const [useCustom, setUseCustom] = useState(!!initial?.customSegments);
  const [segments, setSegments] = useState(initial?.customSegments ?? {
    torso: 0.50, upperArm: 0.32, forearm: 0.25, femur: 0.43, tibia: 0.43,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (name.length > 50) errs.name = "Name too long (max 50)";

    const heightNum = parseFloat(height);
    const heightM = heightUnit === "inches" ? heightNum / 39.3701 : heightNum / 100;
    if (isNaN(heightM) || heightM < 0.91 || heightM > 3.05) {
      errs.height = heightUnit === "inches" ? "36-120 inches" : "91-305 cm";
    }

    const weightNum = parseFloat(weight);
    const weightKg = weightUnit === "lbs" ? weightNum / 2.20462 : weightNum;
    if (isNaN(weightKg) || weightKg < 20 || weightKg > 500) {
      errs.weight = weightUnit === "lbs" ? "44-1100 lbs" : "20-500 kg";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const heightNum = parseFloat(height);
    const heightM = heightUnit === "inches" ? heightNum / 39.3701 : heightNum / 100;
    const weightNum = parseFloat(weight);
    const weightKg = weightUnit === "lbs" ? weightNum / 2.20462 : weightNum;

    onSave({
      name: name.trim(),
      height: heightM,
      weight: weightKg,
      sex,
      torsoLegRatio,
      armLength,
      customSegments: useCustom ? segments : undefined,
    });
  };

  const segmentKeys = ["torso", "upperArm", "forearm", "femur", "tibia"] as const;

  return (
    <div className="rounded-lg border border-cyan-800/30 bg-slate-900/80 p-4">
      <h4 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
        {initial ? "Edit Profile" : "New Profile"}
      </h4>

      <div className="space-y-3">
        {/* Name */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Measurements"
            maxLength={50}
            className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-800 focus:border-transparent outline-none"
          />
          {errors.name && <p className="text-[10px] text-red-400 mt-0.5">{errors.name}</p>}
        </div>

        {/* Height + Weight row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
              Height ({heightUnit})
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-800 focus:border-transparent outline-none"
            />
            {errors.height && <p className="text-[10px] text-red-400 mt-0.5">{errors.height}</p>}
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
              Weight ({weightUnit})
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-800 focus:border-transparent outline-none"
            />
            {errors.weight && <p className="text-[10px] text-red-400 mt-0.5">{errors.weight}</p>}
          </div>
        </div>

        {/* Sex */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Sex</label>
          <div className="flex gap-2">
            {[Sex.MALE, Sex.FEMALE].map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  sex === s
                    ? "bg-cyan-950/40 border-cyan-700/50 text-cyan-300"
                    : "bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {s === Sex.MALE ? "Male" : "Female"}
              </button>
            ))}
          </div>
        </div>

        {/* Proportions */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Torso/Leg Ratio</label>
            <select
              value={torsoLegRatio}
              onChange={(e) => setTorsoLegRatio(e.target.value as TorsoLegProportion)}
              className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-800 focus:border-transparent outline-none cursor-pointer"
            >
              {TORSO_LEG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Arm Length</label>
            <select
              value={armLength}
              onChange={(e) => setArmLength(e.target.value as ArmProportion)}
              className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-800 focus:border-transparent outline-none cursor-pointer"
            >
              {ARM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom segments toggle */}
        <div>
          <button
            onClick={() => setUseCustom(!useCustom)}
            className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <div className={`w-7 h-4 rounded-full transition-colors ${useCustom ? "bg-cyan-800" : "bg-slate-700"}`}>
              <div className={`w-3 h-3 mt-0.5 rounded-full bg-white transition-transform ${useCustom ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </div>
            Custom segment lengths
          </button>

          {useCustom && (
            <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-slate-800">
              {segmentKeys.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-[10px] text-slate-500 w-16 capitalize">
                    {key === "upperArm" ? "Upper Arm" : key}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={segments[key]}
                    onChange={(e) => setSegments({ ...segments, [key]: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-2 py-1 text-[11px] bg-slate-950 border border-slate-700 rounded text-white focus:ring-1 focus:ring-cyan-800 outline-none"
                  />
                  <span className="text-[10px] text-slate-600">m</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {initial ? "Update" : "Save Profile"}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
