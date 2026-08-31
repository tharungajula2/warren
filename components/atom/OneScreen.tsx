import React from "react";

interface OneScreenProps {
  children?: React.ReactNode;
  text?: string;
  isHeader?: boolean;
}

export function OneScreen({ children, text, isHeader }: OneScreenProps) {
  if (!isHeader) {
    throw new Error(
      "[MDX COMPONENT ERROR] <OneScreen> must NOT be used inside MDX bodies. The frontmatter 'one_screen' is rendered automatically once directly under the header."
    );
  }

  return (
    <div className="border border-[#23272D] border-l-2 border-l-[#C9711F] bg-[#121417] p-4 rounded-[3px] my-4 shadow-none">
      <div className="font-mono text-[11px] uppercase tracking-wider text-[#C9711F] font-semibold mb-1.5 select-none">
        COMPRESSED MENTAL MODEL
      </div>
      <div className="text-[15px] text-[#E6E8EB] leading-[1.65] font-sans">
        {text || children}
      </div>
    </div>
  );
}
