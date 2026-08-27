import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCorpusManifest, getPrerequisiteTrail } from "@/lib/corpus";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const manifest = getCorpusManifest();
  return Object.keys(manifest.atoms).map((id) => ({
    id,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const manifest = getCorpusManifest();
  const atom = manifest.atoms[id];
  if (!atom) return { title: "Prerequisite Trail — WARREN" };
  return {
    title: `Prerequisite Trail for ${atom.id}: ${atom.title} — WARREN`,
    description: `Full ordered reading path from root prerequisites to ${atom.id}.`,
  };
}

export default async function PrerequisiteTrailPage({ params }: PageProps) {
  const { id } = await params;
  const manifest = getCorpusManifest();
  const targetAtom = manifest.atoms[id];

  if (!targetAtom) {
    notFound();
  }

  // Compute full topological prerequisite trail
  const { trail, totalAtoms, totalReadingMinutes } = getPrerequisiteTrail([id]);

  return (
    <div className="max-w-[68ch] mx-auto px-4 py-8 space-y-8">
      {/* Top Header & Breadcrumb */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#9AA3AD]">
          <Link href="/atoms" className="hover:text-[#C9711F]">
            INDEX
          </Link>
          <span>&gt;</span>
          <Link href={`/atom/${targetAtom.id}`} className="text-[#C9711F] font-bold">
            {targetAtom.id}
          </Link>
          <span>&gt;</span>
          <span className="text-[#E6E8EB]">PREREQUISITE TRAIL</span>
        </div>

        <h1 className="text-xl font-bold text-[#E6E8EB] font-sans">
          Recommended Reading Order to Master {targetAtom.id}
        </h1>

        {/* Summary Running Totals */}
        <div className="flex items-center gap-3 pt-2 text-[#C9711F] tabular-nums font-semibold">
          <span className="bg-[#2A1D10] border border-[#C9711F] px-2 py-1 rounded-[3px]">
            {totalAtoms} {totalAtoms === 1 ? "ATOM" : "ATOMS"} IN TRAIL
          </span>
          <span className="text-[#6B747E]">|</span>
          <span className="bg-[#191C20] border border-[#23272D] text-[#9AA3AD] px-2 py-1 rounded-[3px]">
            {totalReadingMinutes} MINUTES TOTAL READ TIME
          </span>
        </div>
      </div>

      {/* Numbered Vertical Trail */}
      <div className="relative border-l-2 border-[#3E7D5A] pl-6 ml-3 space-y-8">
        {trail.map((atom, idx) => {
          const isTarget = atom.id === targetAtom.id;

          return (
            <div key={atom.id} className="relative group">
              {/* Step Number Badge */}
              <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-[#121417] border-2 border-[#3E7D5A] text-[#3E7D5A] font-mono text-[11px] font-bold flex items-center justify-center select-none tabular-nums">
                {idx + 1}
              </div>

              {/* Step Card */}
              <div
                className={`border bg-[#121417] p-5 rounded-[3px] space-y-3 transition-colors ${
                  isTarget
                    ? "border-[#C9711F] border-l-4 border-l-[#C9711F] bg-[#191C20]"
                    : "border-[#23272D] hover:border-[#333940]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between font-mono text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#191C20] border border-[#333940] text-[#C9711F] px-2 py-0.5 rounded-[3px] font-bold">
                      {atom.id}
                    </span>
                    <span className="text-[#9AA3AD] uppercase border border-[#23272D] px-1.5 py-0.5 rounded-[3px] text-[10px]">
                      {atom.type}
                    </span>
                    <span className="text-[#6B747E] text-[11px]">
                      DEPTH {atom.depth}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#6B747E] tabular-nums">
                    <span>{atom.reading_minutes} MIN READ</span>
                    <Link
                      href={`/atom/${atom.id}`}
                      className="text-[#C9711F] hover:underline font-bold text-xs"
                    >
                      OPEN ATOM →
                    </Link>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#E6E8EB] font-sans">
                  {atom.title}
                </h3>

                <p className="text-xs text-[#9AA3AD] font-sans leading-relaxed border-t border-[#23272D] pt-2.5">
                  {atom.one_screen}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Conclusion */}
      <div className="border border-[#3E7D5A] bg-[#121417] p-4 rounded-[3px] font-mono text-xs text-center">
        <span className="text-[#3E7D5A] font-bold">✓ END OF TRAIL — </span>
        <span className="text-[#E6E8EB]">
          You have completed all prerequisite foundations for {targetAtom.id}.
        </span>
      </div>
    </div>
  );
}
