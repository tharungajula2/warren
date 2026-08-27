import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCorpusManifest } from "@/lib/corpus";
import { TypeBadge } from "@/components/TypeBadge";
import { CurrentnessMarker } from "@/components/CurrentnessMarker";

export const metadata = {
  title: "Author Cockpit — WARREN Studio",
  description: "Internal authoring dashboard, manifest metrics, compiler linting, and orphan diagnostics.",
};

export default function StudioPage() {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const manifest = getCorpusManifest();
  const { atoms, domainTree, lintWarnings } = manifest;

  const allAtomsList = Object.values(atoms);
  const totalAtomsCount = allAtomsList.length;

  // Status breakdown
  const statusCounts = {
    published: allAtomsList.filter((a) => a.status === "published").length,
    draft: allAtomsList.filter((a) => a.status === "draft").length,
  };

  // Currentness breakdown
  const currentnessCounts = {
    fresh: allAtomsList.filter((a) => a.currentness === "fresh").length,
    ageing: allAtomsList.filter((a) => a.currentness === "ageing").length,
    stale: allAtomsList.filter((a) => a.currentness === "stale").length,
    future: allAtomsList.filter((a) => a.currentness === "future").length,
    durable: allAtomsList.filter((a) => a.currentness === "durable").length,
  };

  // Domain counts
  const domainCounts = domainTree
    .map((dom) => {
      const count = allAtomsList.filter((a) => a.domain === dom.domain).length;
      return { domain: dom.domain, count };
    })
    .sort((a, b) => a.count - b.count); // fewest first

  // Orphan atoms
  const orphanWarnings = lintWarnings.filter((w) => w.rule === "ORPHAN_ATOM");

  return (
    <div className="max-w-[1366px] mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Cockpit Top Header */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#C9711F] font-bold">
            <span>WARREN // AUTHOR COCKPIT</span>
            <span className="bg-[#2A1D10] text-[#C9711F] px-2 py-0.5 rounded-[3px] text-[10px] border border-[#C9711F]">
              DEV ENVIRONMENT ONLY
            </span>
          </div>
          <span className="text-[#6B747E] tabular-nums">
            GENERATED: {new Date(manifest.generatedAt).toLocaleString()}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
          Corpus Diagnostics & Authoring Studio
        </h1>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
        {/* Total Atoms */}
        <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-1">
          <div className="text-[10px] uppercase text-[#6B747E]">TOTAL ATOMS</div>
          <div className="text-2xl font-bold text-[#E6E8EB] tabular-nums">
            {totalAtomsCount}
          </div>
          <div className="text-[11px] text-[#9AA3AD] pt-1 border-t border-[#23272D]">
            {statusCounts.published} Published | {statusCounts.draft} Draft
          </div>
        </div>

        {/* Currentness Breakdown */}
        <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-1">
          <div className="text-[10px] uppercase text-[#6B747E]">TRUST & CURRENTNESS</div>
          <div className="text-2xl font-bold text-[#3E7D5A] tabular-nums">
            {currentnessCounts.fresh} FRESH
          </div>
          <div className="text-[11px] text-[#9AA3AD] pt-1 border-t border-[#23272D] space-x-2">
            <span className="text-[#8A6D2F]">{currentnessCounts.ageing} Ageing</span>
            <span className="text-[#A6503C]">{currentnessCounts.stale} Stale</span>
            <span className="text-[#6B747E]">{currentnessCounts.durable} Durable</span>
          </div>
        </div>

        {/* Compiler Warnings */}
        <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-1">
          <div className="text-[10px] uppercase text-[#6B747E]">COMPILER LINT REPORTS</div>
          <div className="text-2xl font-bold text-[#C9711F] tabular-nums">
            {lintWarnings.length}
          </div>
          <div className="text-[11px] text-[#9AA3AD] pt-1 border-t border-[#23272D]">
            {orphanWarnings.length} Orphan Atoms Detected
          </div>
        </div>

        {/* Domain Coverage */}
        <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-1">
          <div className="text-[10px] uppercase text-[#6B747E]">INDEXED DOMAINS</div>
          <div className="text-2xl font-bold text-[#E6E8EB] tabular-nums">
            {domainTree.length}
          </div>
          <div className="text-[11px] text-[#9AA3AD] pt-1 border-t border-[#23272D]">
            Fewest: {domainCounts[0]?.domain} ({domainCounts[0]?.count})
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Compiler Lint Warnings */}
        <section className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#23272D] pb-2">
            <h2 className="uppercase tracking-wider text-[#C9711F] font-bold">
              COMPILER LINT REPORT ({lintWarnings.length})
            </h2>
            <span className="text-[#6B747E]">PASSED BUILD WITHOUT ERROR</span>
          </div>

          <div className="divide-y divide-[#23272D] border border-[#23272D] bg-[#121417] rounded-[3px] max-h-[480px] overflow-y-auto">
            {lintWarnings.length === 0 ? (
              <div className="p-4 text-center text-[#3E7D5A]">
                ✓ Zero lint warnings detected across corpus.
              </div>
            ) : (
              lintWarnings.map((warning, idx) => (
                <div key={idx} className="p-3 space-y-1 hover:bg-[#191C20] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[#C9711F] font-bold text-[10px] border border-[#C9711F]/40 px-1.5 py-0.2 rounded-[3px] bg-[#2A1D10]">
                      {warning.rule}
                    </span>
                    {warning.atomId && (
                      <Link
                        href={`/atom/${warning.atomId}`}
                        className="text-[#E6E8EB] hover:underline font-bold"
                      >
                        {warning.atomId} →
                      </Link>
                    )}
                  </div>
                  <p className="text-[#9AA3AD] font-sans text-xs">
                    {warning.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Domains with Fewest Atoms & Orphan Atoms */}
        <div className="space-y-6 font-mono text-xs">
          {/* Domains Coverage */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#23272D] pb-2">
              <h2 className="uppercase tracking-wider text-[#9AA3AD] font-bold">
                DOMAINS BY ATOM COUNT (FEWEST FIRST)
              </h2>
              <span className="text-[#6B747E]">AUTHOR EXPANSION TARGETS</span>
            </div>

            <div className="divide-y divide-[#23272D] border border-[#23272D] bg-[#121417] rounded-[3px]">
              {domainCounts.map((item) => (
                <div key={item.domain} className="p-3 flex items-center justify-between">
                  <span className="text-[#E6E8EB] uppercase font-bold">{item.domain}</span>
                  <span className="text-[#C9711F] tabular-nums font-semibold bg-[#191C20] border border-[#23272D] px-2 py-0.5 rounded-[3px]">
                    {item.count} {item.count === 1 ? "ATOM" : "ATOMS"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Orphan Atoms */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#23272D] pb-2">
              <h2 className="uppercase tracking-wider text-[#A6503C] font-bold">
                ORPHAN ATOMS ({orphanWarnings.length})
              </h2>
              <span className="text-[#6B747E]">UNLINKED ROOT NODES</span>
            </div>

            <div className="divide-y divide-[#23272D] border border-[#23272D] bg-[#121417] rounded-[3px]">
              {orphanWarnings.length === 0 ? (
                <div className="p-4 text-center text-[#6B747E]">
                  No orphan unlinked atoms detected.
                </div>
              ) : (
                orphanWarnings.map((w, i) => (
                  <div key={i} className="p-3 flex items-center justify-between">
                    <div>
                      <Link href={`/atom/${w.atomId}`} className="text-[#C9711F] font-bold hover:underline">
                        {w.atomId}
                      </Link>
                      <span className="text-[#9AA3AD] font-sans text-xs ml-2">
                        {atoms[w.atomId || ""]?.title}
                      </span>
                    </div>
                    <span className="text-[#A6503C] text-[10px] uppercase font-bold">UNLINKED</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
