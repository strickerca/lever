"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Clock, UserCircle } from "lucide-react";
import { ComparisonResult, SavedProfile } from "@/types";
import { HistoryTab } from "./HistoryTab";
import { ProfilesTab } from "./ProfilesTab";

interface PersistenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "history" | "profiles";
  onLoadHistory: (result: ComparisonResult) => void;
  onLoadProfileAsA: (profile: SavedProfile) => void;
  onLoadProfileAsB: (profile: SavedProfile) => void;
}

export function PersistenceDrawer({
  isOpen,
  onClose,
  initialTab = "history",
  onLoadHistory,
  onLoadProfileAsA,
  onLoadProfileAsB,
}: PersistenceDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "profiles">(initialTab);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleLoadHistory = (result: ComparisonResult) => {
    onLoadHistory(result);
    onClose();
  };

  const tabs = [
    { id: "history" as const, label: "History", icon: Clock },
    { id: "profiles" as const, label: "Profiles", icon: UserCircle },
  ];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[199] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[200] w-full sm:w-96 bg-slate-950 border-l border-slate-800/60 shadow-2xl shadow-black/40 flex flex-col transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide">Data Console</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? "border-cyan-500 text-cyan-400 bg-cyan-950/10"
                    : "border-transparent text-slate-500 hover:text-slate-400 hover:bg-slate-900/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "history" ? (
            <HistoryTab onLoadHistory={handleLoadHistory} />
          ) : (
            <ProfilesTab
              onLoadProfileAsA={onLoadProfileAsA}
              onLoadProfileAsB={onLoadProfileAsB}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
