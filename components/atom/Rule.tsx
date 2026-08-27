import React from "react";

interface RuleProps {
  children?: React.ReactNode;
  label?: string;
}

export function Rule({ children, label = "PERMANENT RULE" }: RuleProps) {
  return (
    <div className="border border-[#23272D] border-l-4 border-l-[#3E7D5A] bg-[#121417] p-4 rounded-[3px] my-5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-[#3E7D5A] font-semibold mb-1.5 select-none">
        {label}
      </div>
      <div className="text-sm text-[#E6E8EB] leading-relaxed font-sans">
        {children}
      </div>
    </div>
  );
}
