import React from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

import { OneScreen } from "./OneScreen";
import { Flow } from "./Flow";
import { Rule } from "./Rule";
import { Trap } from "./Trap";
import { NeverConfuse } from "./NeverConfuse";
import { Worked } from "./Worked";
import { Delta } from "./Delta";
import { Formula } from "./Formula";
import { Source } from "./Source";

const mdxComponents = {
  OneScreen,
  Flow,
  Rule,
  Trap,
  NeverConfuse,
  Worked,
  Recall: () => null,
  Delta,
  Formula,
  Source,
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-5 w-full overflow-x-auto border border-[#23272D] rounded-[3px]">
      <table className="w-full text-left text-xs border-collapse font-sans" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-[#121417] border-b border-[#23272D] text-[#9AA3AD] font-mono uppercase text-[11px] tracking-wider" {...props} />
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-3 py-2 font-medium border-r border-[#23272D] last:border-r-0" {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-3 py-2 border-b border-r border-[#23272D] last:border-r-0 text-[#E6E8EB] tabular-nums" {...props} />
  ),
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="hover:bg-[#191C20]/50 transition-colors last:children:border-b-0" {...props} />
  ),
};

interface MdxRendererProps {
  source: string;
}

export function MdxRenderer({ source }: MdxRendererProps) {
  return (
    <div className="prose-warren font-sans leading-relaxed text-[#E6E8EB] space-y-4">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkMath],
            rehypePlugins: [rehypeKatex],
          },
        }}
      />
    </div>
  );
}
