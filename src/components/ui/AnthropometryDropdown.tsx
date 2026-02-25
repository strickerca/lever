"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
    label: string;
    value: string;
    subLabel?: string;
}

interface AnthropometryDropdownProps {
    label: string;
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    onPreview: (value: string) => void;
    onHoverEnd: () => void;
    className?: string;
}

export function AnthropometryDropdown({
    label,
    value,
    options,
    onChange,
    onPreview,
    onHoverEnd,
    className = "",
}: AnthropometryDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                onHoverEnd();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onHoverEnd]);

    const selectedOption = options.find((o) => o.value === value) || options[0];

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                {label}
            </label>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs border border-slate-700 bg-slate-950 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white hover:border-slate-600 transition-colors"
            >
                <span className="truncate flex items-baseline gap-2">
                    <span>{selectedOption.label}</span>
                    {selectedOption.subLabel && (
                        <span className="text-[10px] text-slate-500 font-normal">{selectedOption.subLabel}</span>
                    )}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between group
                  ${option.value === value ? "bg-blue-900/20 text-blue-200" : "text-slate-300 hover:bg-slate-800 hover:text-white"}
                `}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                    onHoverEnd();
                                }}
                                onMouseEnter={() => onPreview(option.value)}
                            >
                                <span>{option.label}</span>
                                {option.subLabel && (
                                    <span className={`text-[10px] ${option.value === value ? "text-blue-400" : "text-slate-600 group-hover:text-slate-500"}`}>
                                        {option.subLabel}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
