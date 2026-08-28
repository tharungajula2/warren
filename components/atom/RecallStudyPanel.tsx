"use client";

import React, { useState } from "react";

export interface RecallPair {
  q: string;
  a: string;
}

interface RecallStudyPanelProps {
  items: RecallPair[];
  className?: string;
}

export function RecallStudyPanel({ items, className = "" }: RecallStudyPanelProps) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  if (!items || items.length === 0) return null;

  const toggle = (idx: number) => {
    setRevealed((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className={`border border-[#23272D] bg-[#121417] p-3 rounded-[3px] space-y-3 font-mono text-xs ${className}`}>
      <div className="flex items-center justify-between border-b border-[#23272D] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="bg-[#2A1D10] text-[#C9711F] px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold">
            RECALL
          </span>
          <span className="text-[#E6E8EB] font-bold text-[11px]">STUDY PANEL ({items.length})</span>
        </div>
        <span className="text-[10px] text-[#6B747E]">CLICK TO REVEAL</span>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const isOpen = !!revealed[idx];
          return (
            <div
              key={idx}
              onClick={() => toggle(idx)}
              className="border border-[#23272D] bg-[#191C20] hover:border-[#333940] p-2.5 rounded-[3px] cursor-pointer transition-colors space-y-1.5 select-none"
            >
              <div className="text-[11px] text-[#C9711F] font-bold leading-snug flex items-start justify-between gap-1">
                <span>Q: {item.q}</span>
                <span className="text-[10px] text-[#6B747E] shrink-0 font-normal">
                  {isOpen ? "[HIDE]" : "[SHOW]"}
                </span>
              </div>
              {isOpen && (
                <div className="text-[11px] text-[#E6E8EB] font-sans pt-1 border-t border-[#23272D] leading-normal select-text">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
