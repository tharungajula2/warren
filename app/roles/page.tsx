import React from "react";
import Link from "next/link";
import { getCorpusManifest } from "@/lib/corpus";
import { buildRequirementSet, matchRoles } from "@/lib/jd-matcher";

export const metadata = {
  title: "Role Family Catalog — WARREN",
  description: "12 banking role families, required knowledge maps, and coverage metrics.",
};

export default function RolesIndexPage() {
  const manifest = getCorpusManifest();
  const { roles } = manifest;

  const roleStats = roles.map((role) => {
    // Fake a single match to get requirement set
    const mockMatch = [{ role, score: 10, matchedSignals: role.signals }];
    const reqSet = buildRequirementSet(mockMatch, role.jurisdiction_hint, manifest);

    const totalRequiredCount = role.atoms.length;
    const coveredCount = reqSet.coveredAtoms.filter((c) => !c.isPrerequisite).length;
    const coveragePct = Math.round((coveredCount / totalRequiredCount) * 100);

    return {
      role,
      reqSet,
      totalRequiredCount,
      coveredCount,
      coveragePct,
    };
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Top Header */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#9AA3AD]">
          <Link href="/atoms" className="hover:text-[#C9711F]">
            INDEX
          </Link>
          <span>&gt;</span>
          <span className="text-[#E6E8EB]">ROLE FAMILIES</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div>
            <div className="font-mono text-xs text-[#C9711F] uppercase tracking-wider font-bold mb-1">
              CURRICULUM CATALOG
            </div>
            <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
              Banking & Risk Role Families ({roles.length})
            </h1>
          </div>
          <Link
            href="/compile"
            className="font-mono text-xs bg-[#C9711F] hover:bg-[#b06118] text-[#0B0C0E] font-bold px-4 py-2 rounded-[3px] transition-colors uppercase"
          >
            PASTE JOB DESCRIPTION TO COMPILE →
          </Link>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roleStats.map(({ role, reqSet, totalRequiredCount, coveredCount, coveragePct }) => (
          <div
            key={role.id}
            className="border border-[#23272D] bg-[#121417] p-5 rounded-[3px] flex flex-col justify-between space-y-4 hover:border-[#333940] transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#C9711F] font-bold uppercase">
                  {role.id}
                </span>
                <span className="text-[#9AA3AD] tabular-nums font-semibold bg-[#191C20] border border-[#23272D] px-2 py-0.5 rounded-[3px]">
                  {coveragePct}% COVERAGE
                </span>
              </div>

              <h2 className="text-lg font-bold text-[#E6E8EB] font-sans">
                {role.label}
              </h2>

              <p className="text-xs text-[#9AA3AD] font-sans leading-relaxed">
                {role.description}
              </p>
            </div>

            {/* Metrics Footer & Link */}
            <div className="border-t border-[#23272D] pt-3 flex items-center justify-between font-mono text-xs">
              <div className="text-[#6B747E] tabular-nums text-[11px] space-x-2">
                <span>{coveredCount}/{totalRequiredCount} DIRECT ATOMS</span>
                <span>•</span>
                <span>{reqSet.totalReadingMinutes} MIN READ</span>
              </div>

              <Link
                href={`/role/${role.id}`}
                className="text-[#C9711F] hover:underline font-bold text-xs"
              >
                VIEW CURRICULUM →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
