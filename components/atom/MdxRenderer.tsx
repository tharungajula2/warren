import React from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

import { Delta } from "./Delta";

const mdxComponents = {
  Recall: () => null,
  Delta,
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-xl font-bold text-[#E6E8EB] mt-8 mb-3 tracking-tight" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-lg font-bold text-[#E6E8EB] mt-6 mb-2 tracking-tight border-b border-[#23272D] pb-1.5" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9AA3AD] font-mono mt-6 mb-2 border-b border-[#23272D] pb-1" {...props} />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9AA3AD] font-mono mt-4 mb-2" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-[15px] leading-[1.7] text-[#E6E8EB] my-3.5" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside space-y-1.5 my-3.5 text-[15px] leading-[1.7] text-[#E6E8EB]" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside space-y-1.5 my-3.5 text-[15px] leading-[1.7] text-[#E6E8EB]" {...props} />
  ),
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="border-t border-[#23272D] my-6" {...props} />
  ),
  blockquote: (props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 border-[#C9711F] pl-4 py-1.5 my-4 text-[#9AA3AD] italic text-[15px] leading-[1.65]" {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="bg-[#121417] border border-[#23272D] p-3.5 rounded-[3px] my-4 text-[11px] font-mono text-[#E6E8EB] leading-[17px] whitespace-pre-wrap break-words tabular-nums" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="font-mono text-[12px] bg-[#191C20] text-[#E6E8EB] px-1.5 py-0.5 rounded-[3px] border border-[#23272D]" {...props} />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-5 w-full overflow-x-auto border border-[#23272D] rounded-[3px]">
      <table className="w-full text-left text-[14px] border-collapse font-sans" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-[#121417] border-b border-[#23272D] text-[#9AA3AD] font-mono uppercase text-[12px] tracking-wider font-semibold" {...props} />
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-3.5 py-2.5 font-semibold border-r border-[#23272D] last:border-r-0" {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-3.5 py-2.5 border-b border-r border-[#23272D] last:border-r-0 text-[#E6E8EB] tabular-nums leading-relaxed" {...props} />
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
