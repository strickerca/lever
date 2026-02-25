"use client";

import { useState } from "react";
import { Plus, UserCircle } from "lucide-react";
import { useLeverStore } from "@/store";
import { SavedProfile } from "@/types";
import { ProfileCard } from "./ProfileCard";
import { ProfileEditor } from "./ProfileEditor";
import { showToast } from "@/components/ui/Toast";

interface ProfilesTabProps {
  onLoadProfileAsA: (profile: SavedProfile) => void;
  onLoadProfileAsB: (profile: SavedProfile) => void;
  onClose: () => void;
}

export function ProfilesTab({ onLoadProfileAsA, onLoadProfileAsB, onClose }: ProfilesTabProps) {
  const savedProfiles = useLeverStore((s) => s.savedProfiles);
  const saveProfile = useLeverStore((s) => s.saveProfile);
  const updateProfile = useLeverStore((s) => s.updateProfile);
  const deleteProfile = useLeverStore((s) => s.deleteProfile);

  const [editingProfile, setEditingProfile] = useState<SavedProfile | "new" | null>(null);

  const handleSave = (data: Omit<SavedProfile, "id" | "createdAt" | "updatedAt">) => {
    if (editingProfile && editingProfile !== "new") {
      updateProfile(editingProfile.id, data);
      showToast("success", `Updated "${data.name}"`);
    } else {
      saveProfile(data);
      showToast("success", `Saved "${data.name}"`);
    }
    setEditingProfile(null);
  };

  const handleDelete = (profile: SavedProfile) => {
    deleteProfile(profile.id);
    showToast("info", `Deleted "${profile.name}"`);
  };

  const handleLoadAsA = (profile: SavedProfile) => {
    onLoadProfileAsA(profile);
    showToast("success", `Loaded "${profile.name}" as Lifter A`);
    onClose();
  };

  const handleLoadAsB = (profile: SavedProfile) => {
    onLoadProfileAsB(profile);
    showToast("success", `Loaded "${profile.name}" as Lifter B`);
    onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* New Profile button */}
      {editingProfile === null && (
        <button
          onClick={() => setEditingProfile("new")}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold rounded-lg border border-dashed border-slate-700 text-slate-400 hover:border-cyan-800/60 hover:text-cyan-400 hover:bg-cyan-950/20 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Profile
        </button>
      )}

      {/* Editor (shown inline) */}
      {editingProfile !== null && (
        <ProfileEditor
          initial={editingProfile === "new" ? undefined : editingProfile}
          onSave={handleSave}
          onCancel={() => setEditingProfile(null)}
        />
      )}

      {/* Profile list */}
      {savedProfiles.length === 0 && editingProfile === null ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center mb-3">
            <UserCircle className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400 mb-1">No saved profiles</p>
          <p className="text-xs text-slate-500">Save your measurements to quickly load them.</p>
        </div>
      ) : (
        savedProfiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onLoadAsA={() => handleLoadAsA(profile)}
            onLoadAsB={() => handleLoadAsB(profile)}
            onEdit={() => setEditingProfile(profile)}
            onDelete={() => handleDelete(profile)}
          />
        ))
      )}
    </div>
  );
}
