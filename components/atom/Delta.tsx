"use client";

import React from "react";
import { useJurisdiction } from "./JurisdictionContext";

export type JurisdictionCode = "IN" | "UK" | "EU" | "US";

interface DeltaProps {
  j: JurisdictionCode;
  children?: React.ReactNode;
}

const JURISDICTION_STYLES: Record<
  JurisdictionCode,
  { label: string; border: string; text: string; bg: string }
> = {
  IN: {
    label: "JURISDICTION VARIANT: INDIA (RBI)",
    border: "border-l-[#7D5A31]",
    text: "text-[#7D5A31]",
    bg: "bg-[#7D5A31]/10",
  },
  UK: {
    label: "JURISDICTION VARIANT: UNITED KINGDOM (PRA/FCA)",
    border: "border-l-[#315F7D]",
    text: "text-[#315F7D]",
    bg: "bg-[#315F7D]/10",
  },
  EU: {
    label: "JURISDICTION VARIANT: EUROPEAN UNION (EBA/ECB)",
    border: "border-l-[#51518A]",
    text: "text-[#51518A]",
    bg: "bg-[#51518A]/10",
  },
  US: {
    label: "JURISDICTION VARIANT: UNITED STATES (FED/OCC/FDIC)",
    border: "border-l-[#6D4545]",
    text: "text-[#6D4545]",
    bg: "bg-[#6D4545]/10",
  },
};

export function Delta({ j, children }: DeltaProps) {
  const { jurisdiction } = useJurisdiction();

  // Only render when that jurisdiction is active or when reader is in 'all' mode
  const isVisible = jurisdiction === "all" || jurisdiction === j;

  if (!isVisible) {
    return null;
  }

  const style = JURISDICTION_STYLES[j] || JURISDICTION_STYLES.IN;

  return (
    <div
      className={`border border-[#23272D] border-l-4 ${style.border} bg-[#121417] p-4 rounded-[3px] my-5`}
      data-jurisdiction={j}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`font-mono text-[11px] uppercase tracking-wider ${style.text} font-bold select-none`}>
          {style.label}
        </div>
        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[3px] ${style.bg} ${style.text} font-bold`}>
          {j}
        </span>
      </div>
      <div className="text-sm text-[#E6E8EB] leading-relaxed font-sans">
        {children}
      </div>
    </div>
  );
}
