import React from "react";
import Link from "next/link";
import { getCorpusManifest } from "@/lib/corpus";
import { TypeBadge } from "@/components/TypeBadge";
import { CurrentnessMarker } from "@/components/CurrentnessMarker";

export const metadata = {
  title: "Corpus Index — WARREN",
  description: "Complete domain-indexed catalog of technical banking knowledge atoms.",
};

export default function AtomsIndexPage() {
  const manifest = getCorpusManifest();
  const { domainTree, atoms } = manifest;

  const totalAtoms = Object.keys(atoms).length;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      <div className="mb-8 border-b border-[#23272D] pb-6">
        <div className="font-mono text-xs text-[#C9711F] uppercase tracking-wider mb-1 font-semibold">
          SYSTEM CATALOG
        </div>
        <h1 className="text-2xl font-bold text-[#E6E8EB] tracking-tight">
          Knowledge Corpus Index
        </h1>
        <p className="text-sm text-[#9AA3AD] mt-1">
          Structured teachable units across regulatory frameworks, credit risk, market risk, operational risk, legal netting, and quantitative foundations.
        </p>
      </div>

      {/* Domain Grouped Sections */}
      {domainTree.length === 0 ? (
        <div className="border border-[#23272D] bg-[#121417] p-8 text-center rounded-[3px] font-mono text-xs text-[#6B747E] space-y-2">
          <div className="text-[#C9711F] font-bold text-sm uppercase">NO ATOMS INDEXED YET</div>
          <p>The corpus is currently empty. Run importer scripts to scaffold new atoms.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {domainTree.map((domainNode) => (
            <section
              key={domainNode.domain}
              id={`domain-${domainNode.domain}`}
              className="border border-[#23272D] bg-[#121417] rounded-[3px] overflow-hidden"
            >
              {/* Domain Header */}
              <div className="bg-[#191C20] px-5 py-3 border-b border-[#23272D] flex items-center justify-between font-mono text-xs">
                <h2 className="uppercase tracking-wider text-[#C9711F] font-bold text-sm">
                  DOMAIN: {domainNode.domain}
                </h2>
                <span className="text-[#6B747E]">
                  {domainNode.subdomains.length} SUBDOMAINS
                </span>
              </div>

              {/* Subdomains & Atoms Table */}
              <div className="divide-y divide-[#23272D]">
                {domainNode.subdomains.map((subdomainNode) => (
                  <div key={subdomainNode.subdomain} className="p-5">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-[#9AA3AD] font-semibold mb-3">
                      SUBDOMAIN // {subdomainNode.subdomain}
                    </h3>

                    <div className="overflow-x-auto max-w-full">
                      <table className="w-full text-left font-mono text-xs border-collapse tabular-nums">
                        <thead>
                          <tr className="border-b border-[#23272D] text-[#6B747E] text-[11px]">
                            <th className="py-2 pr-4 font-semibold w-24">ID</th>
                            <th className="py-2 px-4 font-semibold">TITLE</th>
                            <th className="py-2 px-4 font-semibold w-28">TYPE</th>
                            <th className="py-2 px-4 font-semibold w-32">CURRENTNESS</th>
                            <th className="py-2 px-4 font-semibold w-20">DEPTH</th>
                            <th className="py-2 px-4 font-semibold w-24">READ TIME</th>
                            <th className="py-2 pl-4 font-semibold w-24">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#23272D]/50">
                          {subdomainNode.atoms.map((item) => {
                            const atom = atoms[item.id];
                            if (!atom) return null;
                            return (
                              <tr
                                key={atom.id}
                                className="hover:bg-[#191C20] transition-colors"
                              >
                                <td className="py-2.5 pr-4">
                                  <Link
                                    href={`/atom/${atom.id}`}
                                    className="font-bold text-[#C9711F] hover:underline"
                                  >
                                    {atom.id}
                                  </Link>
                                </td>
                                <td className="py-2.5 px-4 font-sans font-medium text-[#E6E8EB]">
                                  <Link
                                    href={`/atom/${atom.id}`}
                                    className="hover:text-[#C9711F] transition-colors"
                                  >
                                    {atom.title}
                                  </Link>
                                </td>
                                <td className="py-2.5 px-4">
                                  <TypeBadge type={atom.type} />
                                </td>
                                <td className="py-2.5 px-4">
                                  <CurrentnessMarker status={atom.currentness} />
                                </td>
                                <td className="py-2.5 px-4 text-[#9AA3AD]">
                                  L{atom.depth}
                                </td>
                                <td className="py-2.5 px-4 text-[#9AA3AD]">
                                  {atom.reading_minutes}m
                                </td>
                                <td className="py-2.5 pl-4">
                                  {atom.status === "draft" ? (
                                    <span className="text-[#A6503C] font-semibold text-[10px] uppercase">
                                      DRAFT
                                    </span>
                                  ) : (
                                    <span className="text-[#3E7D5A] font-semibold text-[10px] uppercase">
                                      PUBLISHED
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
