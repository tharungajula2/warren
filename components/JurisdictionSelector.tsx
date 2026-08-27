"use client";

import React from "react";
import { useJurisdiction, ActiveJurisdiction } from "./atom/JurisdictionContext";

const JURISDICTION_OPTIONS: { value: ActiveJurisdiction; label: string; code: string }[] = [
  { value: "universal", label: "Universal (Default)", code: "UNIV" },
  { value: "IN", label: "India (RBI)", code: "IN" },
  { value: "UK", label: "United Kingdom (PRA)", code: "UK" },
  { value: "EU", label: "European Union (EBA)", code: "EU" },
  { value: "US", label: "United States (FED)", code: "US" },
  { value: "all", label: "Show All Variants", code: "ALL" },
];

export function JurisdictionSelector() {
  const { jurisdiction, setJurisdiction } = useJurisdiction();

  return (
    <div className="border border-[#23272D] bg-[#121417] p-3 rounded-[3px] my-4">
      <div className="flex items-center justify-between mb-2 select-none">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#9AA3AD] font-semibold">
          ACTIVE JURISDICTION
        </span>
        <span className="font-mono text-[10px] text-[#6B747E]">COOKIE PERSISTED</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {JURISDICTION_OPTIONS.map((opt) => {
          const isActive = jurisdiction === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setJurisdiction(opt.value)}
              className={`font-mono text-[11px] px-2 py-1.5 rounded-[3px] border text-left flex items-center justify-between transition-colors ${
                isActive
                  ? "bg-[#2A1D10] border-[#C9711F] text-[#C9711F] font-bold"
                  : "bg-[#191C20] border-[#23272D] text-[#9AA3AD] hover:border-[#333940] hover:text-[#E6E8EB]"
              }`}
            >
              <span>{opt.code}</span>
              {isActive && <span className="text-[9px] text-[#C9711F]">●</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
