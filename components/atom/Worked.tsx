import React from "react";

interface WorkedProps {
  title?: string;
  children?: React.ReactNode;
}

export function Worked({ title = "WORKED NUMERICAL EXAMPLE", children }: WorkedProps) {
  return (
    <div className="border border-[#23272D] bg-[#121417] rounded-[3px] my-5 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-[#23272D] bg-[#191C20] flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#9AA3AD] font-semibold select-none">
          {title}
        </span>
        <span className="font-mono text-[10px] text-[#6B747E]">NUMERICAL DEMONSTRATION</span>
      </div>
      <div className="p-4 font-mono text-xs text-[#E6E8EB] leading-relaxed tabular-nums whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}
