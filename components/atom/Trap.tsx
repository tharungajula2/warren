import React from "react";

interface TrapProps {
  children?: React.ReactNode;
  label?: string;
}

export function Trap({ children, label = "TRAP" }: TrapProps) {
  return (
    <div className="border border-[#23272D] border-l-4 border-l-[#A6503C] bg-[#121417] p-4 rounded-[3px] my-5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-[#A6503C] font-semibold mb-1.5 select-none">
        {label}
      </div>
      <div className="text-sm text-[#E6E8EB] leading-relaxed font-sans">
        {children}
      </div>
    </div>
  );
}
