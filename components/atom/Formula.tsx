import React from "react";
import katex from "katex";

interface FormulaProps {
  math?: string;
  children?: React.ReactNode;
}

export function Formula({ math, children }: FormulaProps) {
  const latexSource = math || (typeof children === "string" ? children : "");

  let renderedHtml = "";
  if (latexSource) {
    try {
      renderedHtml = katex.renderToString(latexSource.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch (e) {
      renderedHtml = `<code className="text-red-400">${latexSource}</code>`;
    }
  }

  return (
    <div className="my-5 p-4 border border-[#23272D] bg-[#121417] rounded-[3px] overflow-x-auto text-center font-mono">
      {renderedHtml ? (
        <div
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
          className="inline-block text-[#E6E8EB]"
        />
      ) : (
        <div className="text-sm text-[#E6E8EB]">{children}</div>
      )}
    </div>
  );
}
