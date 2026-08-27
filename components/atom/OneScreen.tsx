import React from "react";

interface OneScreenProps {
  children?: React.ReactNode;
  text?: string;
}

export function OneScreen({ children, text }: OneScreenProps) {
  return (
    <div className="border border-[#23272D] border-l-4 border-l-[#C9711F] bg-[#121417] p-4 rounded-[3px] my-4 shadow-none">
      <div className="font-mono text-[11px] uppercase tracking-wider text-[#C9711F] font-semibold mb-1.5 select-none">
        COMPRESSED MENTAL MODEL
      </div>
      <div className="text-sm text-[#E6E8EB] leading-relaxed font-sans">
        {text || children}
      </div>
    </div>
  );
}
