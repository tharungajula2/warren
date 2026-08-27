import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCorpusManifest } from "@/lib/corpus";
import { buildRequirementSet } from "@/lib/jd-matcher";
import { TypeBadge } from "@/components/TypeBadge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const manifest = getCorpusManifest();
  return manifest.roles.map((r) => ({
    id: r.id,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const manifest = getCorpusManifest();
  const role = manifest.roles.find((r) => r.id === id);
  if (!role) return { title: "Role Not Found — WARREN" };
  return {
    title: `${role.label} Curriculum — WARREN`,
    description: role.description,
  };
}

export default async function RolePage({ params }: PageProps) {
  const { id } = await params;
  const manifest = getCorpusManifest();
  const role = manifest.roles.find((r) => r.id === id);

  if (!role) {
    notFound();
  }

  // Build requirement set for this role
  const mockMatch = [{ role, score: 10, matchedSignals: role.signals }];
  const reqSet = buildRequirementSet(mockMatch, role.jurisdiction_hint, manifest);

  return (
    <div className="max-w-[1024px] mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Top Breadcrumb & Header */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#9AA3AD]">
          <Link href="/roles" className="hover:text-[#C9711F]">
            ROLE FAMILIES
          </Link>
          <span>&gt;</span>
          <span className="text-[#E6E8EB]">{role.id}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div>
            <div className="font-mono text-xs text-[#C9711F] uppercase tracking-wider font-bold mb-1">
              CURRICULUM SPECIFICATION
            </div>
            <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
              {role.label}
            </h1>
            <p className="text-xs text-[#9AA3AD] font-sans mt-1 max-w-[68ch]">
              {role.description}
            </p>
          </div>

          <Link
            href="/compile"
            className="font-mono text-xs bg-[#191C20] border border-[#C9711F] text-[#C9711F] font-bold px-3 py-1.5 rounded-[3px] hover:bg-[#2A1D10] transition-colors"
          >
            COMPILE CUSTOM JD →
          </Link>
        </div>
      </div>

      {/* Signal Phrases */}
      <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-2 font-mono text-xs">
        <div className="text-[10px] uppercase text-[#6B747E] font-bold">
          IDENTIFYING KEYWORD SIGNALS ({role.signals.length}):
        </div>
        <div className="flex flex-wrap gap-1.5">
          {role.signals.map((sig, i) => (
            <span
              key={i}
              className="bg-[#191C20] border border-[#23272D] text-[#9AA3AD] px-2 py-0.5 rounded-[3px]"
            >
              {sig}
            </span>
          ))}
        </div>
      </div>

      {/* Reading Path */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2 font-mono text-xs">
          <h2 className="uppercase tracking-wider text-[#3E7D5A] font-bold">
            CURRICULUM READING PATH ({reqSet.coveredAtoms.length} COVERED)
          </h2>
          <span className="text-[#C9711F] font-bold tabular-nums">
            {reqSet.totalReadingMinutes} MINUTES READ TIME
          </span>
        </div>

        <div className="relative border-l-2 border-[#3E7D5A] pl-6 ml-3 space-y-6">
          {reqSet.coveredAtoms.map((item, idx) => {
            const badgeLabel = item.weight === 3 ? "CORE" : item.weight === 2 ? "SUPPORTING" : "OPTIONAL";
            const badgeBorder = item.weight === 3 ? "border-[#C9711F] text-[#C9711F]" : item.weight === 2 ? "border-[#3E7D5A] text-[#3E7D5A]" : "border-[#6B747E] text-[#6B747E]";

            return (
              <div key={item.atom.id} className="relative group">
                <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-[#121417] border-2 border-[#3E7D5A] text-[#3E7D5A] font-mono text-[11px] font-bold flex items-center justify-center select-none tabular-nums">
                  {idx + 1}
                </div>

                <div className="border border-[#23272D] bg-[#121417] p-5 rounded-[3px] space-y-2 hover:border-[#333940] transition-colors">
                  <div className="flex flex-wrap items-center justify-between font-mono text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-[3px] ${badgeBorder}`}>
                        {badgeLabel}
                      </span>
                      <span className="text-[#C9711F] font-bold">{item.atom.id}</span>
                      <TypeBadge type={item.atom.type} />
                    </div>

                    <div className="flex items-center gap-3 text-[#6B747E] tabular-nums">
                      <span>{item.atom.reading_minutes} MIN READ</span>
                      <Link
                        href={`/atom/${item.atom.id}`}
                        className="text-[#C9711F] hover:underline font-bold text-xs"
                      >
                        READ ATOM →
                      </Link>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#E6E8EB] font-sans">
                    {item.atom.title}
                  </h3>

                  <p className="text-xs text-[#9AA3AD] font-sans leading-relaxed border-t border-[#23272D] pt-2">
                    {item.atom.one_screen}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gap Report */}
      <div className="border border-[#A6503C] bg-[#121417] p-5 rounded-[3px] space-y-3 font-mono text-xs">
        <div className="text-[#A6503C] font-bold uppercase tracking-wider border-b border-[#23272D] pb-2 flex items-center justify-between">
          <span>CURRICULUM CONTENT GAPS ({reqSet.gapAtoms.length})</span>
          <span className="text-[10px] text-[#6B747E]">AUTHOR ROADMAP</span>
        </div>

        {reqSet.gapAtoms.length === 0 ? (
          <p className="text-xs text-[#3E7D5A] font-sans">
            ✓ Full coverage! All required atoms for this role exist in the corpus.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-sans text-[#9AA3AD]">
              The following topics are specified in this role curriculum but are not yet authored in the current 12 fixture atoms:
            </p>
            <ul className="space-y-1.5 border-l-2 border-[#A6503C] pl-3">
              {reqSet.gapAtoms.map((gap) => (
                <li key={gap.id} className="text-[#E6E8EB] text-xs">
                  • Warren does not yet have an atom for <strong className="text-[#A6503C] font-mono">{gap.id}</strong> (Weight {gap.weight}).
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
