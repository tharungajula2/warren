import React from "react";

interface NeverConfuseProps {
  a: string;
  b: string;
  children?: React.ReactNode;
}

export function NeverConfuse({ a, b, children }: NeverConfuseProps) {
  const childArray = React.Children.toArray(children);
  const hrIndex = childArray.findIndex(
    (child) => React.isValidElement(child) && child.type === "hr"
  );

  let leftContent: React.ReactNode[] = [];
  let rightContent: React.ReactNode[] = [];

  if (hrIndex !== -1) {
    leftContent = childArray.slice(0, hrIndex);
    rightContent = childArray.slice(hrIndex + 1);
  } else {
    // If no explicit hr divider, split evenly if possible
    const mid = Math.ceil(childArray.length / 2);
    leftContent = childArray.slice(0, mid);
    rightContent = childArray.slice(mid);
  }

  return (
    <div className="border border-[#23272D] border-l-4 border-l-[#8A6D2F] bg-[#121417] p-4 rounded-[3px] my-5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-[#8A6D2F] font-semibold mb-3 select-none">
        DO NOT CONFUSE
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-[#23272D]">
        <div className="pt-2 md:pt-0 md:pr-3">
          <h4 className="font-mono text-xs uppercase tracking-wider text-[#8A6D2F] font-bold mb-2 pb-1 border-b border-[#23272D]">
            {a}
          </h4>
          <div className="text-sm text-[#E6E8EB] space-y-2">{leftContent}</div>
        </div>
        <div className="pt-4 md:pt-0 md:pl-4">
          <h4 className="font-mono text-xs uppercase tracking-wider text-[#8A6D2F] font-bold mb-2 pb-1 border-b border-[#23272D]">
            {b}
          </h4>
          <div className="text-sm text-[#E6E8EB] space-y-2">{rightContent}</div>
        </div>
      </div>
    </div>
  );
}
