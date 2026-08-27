import React from "react";
import { CurrentnessStatus } from "@/lib/schema";

interface CurrentnessMarkerProps {
  status: CurrentnessStatus;
  asOf?: string | null;
}

const CURRENTNESS_STYLES: Record<
  CurrentnessStatus,
  { label: string; dot: string; text: string }
> = {
  fresh: {
    label: "FRESH",
    dot: "text-[#3E7D5A]",
    text: "text-[#3E7D5A]",
  },
  ageing: {
    label: "AGEING",
    dot: "text-[#8A6D2F]",
    text: "text-[#8A6D2F]",
  },
  stale: {
    label: "STALE",
    dot: "text-[#A6503C]",
    text: "text-[#A6503C]",
  },
  future: {
    label: "FUTURE REVISION",
    dot: "text-[#C9711F]",
    text: "text-[#C9711F]",
  },
  durable: {
    label: "DURABLE",
    dot: "text-[#6B747E]",
    text: "text-[#6B747E]",
  },
};

export function CurrentnessMarker({ status, asOf }: CurrentnessMarkerProps) {
  const style = CURRENTNESS_STYLES[status] || CURRENTNESS_STYLES.durable;

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] select-none tabular-nums">
      <span className={`${style.dot} text-[12px] font-bold leading-none`}>●</span>
      <span className={`${style.text} font-semibold uppercase tracking-wider`}>
        {style.label}
      </span>
      {asOf && status !== "durable" && (
        <span className="text-[#6B747E] text-[10px]">({asOf})</span>
      )}
    </span>
  );
}
