import React from "react";
import { getCorpusManifest } from "@/lib/corpus";
import { CorpusGraph } from "@/components/CorpusGraph";

export const metadata = {
  title: "Full Corpus Constellation Graph — WARREN",
  description: "Interactive high-performance clustered graph constellation of all knowledge atoms.",
};

export default function GraphPage() {
  const manifest = getCorpusManifest();

  return (
    <div className="w-full h-[calc(100vh-48px)] flex flex-col bg-[#0B0C0E]">
      <CorpusGraph atoms={manifest.atoms} isEmbedded={false} />
    </div>
  );
}
