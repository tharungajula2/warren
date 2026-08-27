import React from "react";
import { AtomType } from "@/lib/schema";

interface TypeBadgeProps {
  type: AtomType;
}

const TYPE_BORDER_COLORS: Record<AtomType, string> = {
  concept: "border-[#315F7D]",
  mechanism: "border-[#51518A]",
  procedure: "border-[#3E7D5A]",
  delta: "border-[#7D5A31]",
  example: "border-[#C9711F]",
  reference: "border-[#6B747E]",
};

export function TypeBadge({ type }: TypeBadgeProps) {
  const borderColor = TYPE_BORDER_COLORS[type] || "border-[#23272D]";

  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-wider text-[#9AA3AD] border ${borderColor} bg-transparent px-2 py-0.5 rounded-[3px] font-semibold select-none`}
    >
      {type}
    </span>
  );
}
