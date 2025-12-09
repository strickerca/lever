import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Anthropometry, ComparisonResult, Sex } from "@/types";

export interface UserProfile {
  id: string;
  name: string;
  anthropometry: Anthropometry;
  createdAt: number;
}

export type UnitPreference = "metric" | "imperial";

interface LeverStore {
  // State
  currentProfile: UserProfile | null;
  comparisonHistory: ComparisonResult[];
  unitPreference: UnitPreference;

  // Actions
  setProfile: (profile: UserProfile | null) => void;
  addComparison: (result: ComparisonResult) => void;
  clearHistory: () => void;
  setUnits: (preference: UnitPreference) => void;
}

export const useLeverStore = create<LeverStore>()(
  persist(
    (set) => ({
      // Initial state
      currentProfile: null,
      comparisonHistory: [],
      unitPreference: "metric",

      // Actions
      setProfile: (profile) => {
        console.log("[Analytics] profile_created", {
          height: profile?.anthropometry.segments.height,
          sex: profile?.anthropometry.sex,
        });
        set({ currentProfile: profile });
      },

      addComparison: (result) => {
        console.log("[Analytics] comparison_completed", {
          liftFamily: result.lifterA.metrics.demandFactor > 0 ? "success" : "failure",
          advantagePercentage: result.comparison.advantagePercentage,
        });
        set((state) => ({
          comparisonHistory: [result, ...state.comparisonHistory].slice(0, 10), // Keep last 10
        }));
      },

      clearHistory: () => set({ comparisonHistory: [] }),

      setUnits: (preference) => {
        console.log("[Analytics] unit_preference_changed", { preference });
        set({ unitPreference: preference });
      },
    }),
    {
      name: "lever-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        currentProfile: state.currentProfile,
        unitPreference: state.unitPreference,
        // Don't persist comparison history to localStorage (can get large)
      }),
    }
  )
);
