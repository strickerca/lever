import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ComparisonResult, ComparisonSnapshot, SavedProfile } from "@/types";

export type UnitPreference = "metric" | "imperial";

interface LeverStore {
  // State
  savedProfiles: SavedProfile[];
  comparisonHistory: ComparisonResult[];
  unitPreference: UnitPreference;

  // Profile actions
  saveProfile: (profile: Omit<SavedProfile, "id" | "createdAt" | "updatedAt">) => string;
  updateProfile: (id: string, updates: Partial<Omit<SavedProfile, "id" | "createdAt">>) => void;
  deleteProfile: (id: string) => void;

  // History actions
  addComparison: (result: ComparisonResult, snapshot?: ComparisonSnapshot) => void;
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;

  // Unit actions
  setUnits: (preference: UnitPreference) => void;
}

export const useLeverStore = create<LeverStore>()(
  persist(
    (set) => ({
      // Initial state
      savedProfiles: [],
      comparisonHistory: [],
      unitPreference: "metric",

      // Profile actions
      saveProfile: (profileData) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const profile: SavedProfile = { ...profileData, id, createdAt: now, updatedAt: now };
        set((state) => ({
          savedProfiles: [...state.savedProfiles, profile],
        }));
        return id;
      },

      updateProfile: (id, updates) => {
        set((state) => ({
          savedProfiles: state.savedProfiles.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        }));
      },

      deleteProfile: (id) => {
        set((state) => ({
          savedProfiles: state.savedProfiles.filter((p) => p.id !== id),
        }));
      },

      // History actions
      addComparison: (result, snapshot) => {
        const enriched: ComparisonResult = {
          ...result,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          snapshot: snapshot ?? result.snapshot,
        };
        set((state) => ({
          comparisonHistory: [enriched, ...state.comparisonHistory].slice(0, 10),
        }));
      },

      deleteHistoryEntry: (id) => {
        set((state) => ({
          comparisonHistory: state.comparisonHistory.filter((entry) => entry.id !== id),
        }));
      },

      clearHistory: () => set({ comparisonHistory: [] }),

      // Unit actions
      setUnits: (preference) => {
        set({ unitPreference: preference });
      },
    }),
    {
      name: "lever-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedProfiles: state.savedProfiles,
        comparisonHistory: state.comparisonHistory,
        unitPreference: state.unitPreference,
      }),
    }
  )
);
