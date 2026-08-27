import React from "react";

interface RecallProps {
  q?: string;
  a?: string;
  children?: React.ReactNode;
}

export function Recall({ q, a, children }: RecallProps) {
  return (
    <details className="group border border-[#23272D] bg-[#121417] rounded-[3px] my-4 p-4 cursor-pointer select-none">
      <summary className="font-mono text-xs uppercase tracking-wider text-[#C9711F] font-semibold flex items-center justify-between outline-none list-none cursor-pointer">
        <span className="flex items-center gap-2">
          <span className="bg-[#2A1D10] text-[#C9711F] px-1.5 py-0.5 rounded-[3px] text-[10px]">
            RECALL
          </span>
          <span>{q || "Self-Assessment Practice"}</span>
        </span>
        <span className="text-[#6B747E] font-mono text-[10px] group-open:hidden">
          [SHOW ANSWER]
        </span>
        <span className="text-[#6B747E] font-mono text-[10px] hidden group-open:inline">
          [HIDE ANSWER]
        </span>
      </summary>
      <div className="mt-3 pt-3 border-t border-[#23272D] text-sm text-[#E6E8EB] select-text font-sans leading-relaxed">
        {a || children}
      </div>
    </details>
  );
}
