import React from "react";

interface SourceProps {
  id: string | number;
}

export function Source({ id }: SourceProps) {
  return (
    <sup className="ml-0.5 select-none">
      <a
        href={`#source-${id}`}
        className="font-mono text-[10px] font-semibold text-[#C9711F] hover:text-[#E6E8EB] underline decoration-dotted transition-colors"
        title={`View Source ${id}`}
      >
        [{id}]
      </a>
    </sup>
  );
}
