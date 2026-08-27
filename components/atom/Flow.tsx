import React from "react";

interface FlowProps {
  children?: React.ReactNode;
}

export function Flow({ children }: FlowProps) {
  return (
    <div className="my-6 border border-[#23272D] bg-[#121417] rounded-[3px] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-[#23272D] bg-[#191C20] flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#9AA3AD] font-semibold select-none">
          STRUCTURE DIAGRAM
        </span>
        <span className="font-mono text-[10px] text-[#6B747E]">ASCII FLOW</span>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-[12px] leading-[18px] text-[#E6E8EB] whitespace-pre tabular-nums m-0 select-text">
          {children}
        </pre>
      </div>
    </div>
  );
}
