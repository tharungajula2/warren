import React from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { OneScreen } from "./OneScreen";
import { Flow } from "./Flow";
import { Rule } from "./Rule";
import { Trap } from "./Trap";
import { NeverConfuse } from "./NeverConfuse";
import { Worked } from "./Worked";
import { Recall } from "./Recall";
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
  Recall,
  Delta,
  Formula,
  Source,
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
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
          },
        }}
      />
    </div>
  );
}
