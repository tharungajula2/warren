import React from "react";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { getCorpusManifest } from "@/lib/corpus";
import { TypeBadge } from "@/components/TypeBadge";

export const metadata = {
  title: "Author Cockpit — WARREN Studio",
  description: "Internal authoring dashboard, draft review queue, manifest metrics, and compiler linting.",
};

interface PrereqSuggestion {
  prereqId: string;
  evidence: string;
  confidence: string;
}

interface SubdomainSuggestion {
  proposedSubdomain: string;
  confidenceScore: number;
  matchedKeywords: string;
}

export default function StudioPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const manifest = getCorpusManifest();
  const { atoms, domainTree, lintWarnings } = manifest;

  // Load prerequisite suggestions
  let prereqSuggestions: Record<string, PrereqSuggestion[]> = {};
  const prereqPath = path.join(process.cwd(), "public", "prereq-suggestions.json");
  if (fs.existsSync(prereqPath)) {
    try {
      prereqSuggestions = JSON.parse(fs.readFileSync(prereqPath, "utf-8"));
    } catch (e) {
      console.error("Failed to parse prereq-suggestions.json", e);
    }
  }

  // Load subdomain suggestions
  let subdomainSuggestions: Record<string, SubdomainSuggestion> = {};
  const subPath = path.join(process.cwd(), "public", "subdomain-suggestions.json");
  if (fs.existsSync(subPath)) {
    try {
      subdomainSuggestions = JSON.parse(fs.readFileSync(subPath, "utf-8"));
    } catch (e) {
      console.error("Failed to parse subdomain-suggestions.json", e);
    }
  }

  const allAtomsList = Object.values(atoms);
  const totalAtomsCount = allAtomsList.length;

  // Status breakdown
  const statusCounts = {
    published: allAtomsList.filter((a) => a.status === "published").length,
    fixture: allAtomsList.filter((a) => a.status === "fixture").length,
    draft: allAtomsList.filter((a) => a.status === "draft").length,
  };

  // Drafts missing prerequisites
  const draftsMissingPrereqs = allAtomsList.filter(
    (a) => a.status === "draft" && (!a.prerequisites || a.prerequisites.length === 0)
  ).length;

  // Draft atoms list for review queue
  const draftAtoms = allAtomsList
    .filter((a) => a.status === "draft")
    .map((atom) => {
      const hasOneScreen = !!atom.one_screen && atom.one_screen.length > 10;
      const hasPrereqs = atom.prerequisites && atom.prerequisites.length > 0;
      const hasSources = atom.sources && atom.sources.length > 0;

      // Completeness score out of 6
      let score = 0;
      if (atom.title) score++;
      if (hasOneScreen) score++;
      if (hasPrereqs) score++;
      if (hasSources) score++;
      if (atom.reading_minutes > 0) score++;

      const isPersonal = /\b(my|I\s|our project|this project|in my)\b/i.test(atom.one_screen || "");

      return {
        atom,
        hasOneScreen,
        hasPrereqs,
        hasSources,
        isPersonal,
        score,
        prereqSugs: prereqSuggestions[atom.id] || [],
        subSug: subdomainSuggestions[atom.id] || null,
      };
    });

  // Sort drafts by score descending then ID
  draftAtoms.sort((a, b) => b.score - a.score || a.atom.id.localeCompare(b.atom.id));

  // Domain counts
  const domainCounts = domainTree
    .map((dom) => {
      const count = allAtomsList.filter((a) => a.domain === dom.domain).length;
      return { domain: dom.domain, count };
    })
    .sort((a, b) => a.count - b.count);

  const orphanWarnings = lintWarnings.filter((w) => w.rule === "ORPHAN_ATOM");

  return (
    <div className="max-w-[1366px] mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Cockpit Top Header */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#C9711F] font-bold">
            <span>WARREN // AUTHOR COCKPIT & REVIEW QUEUE</span>
            <span className="bg-[#2A1D10] text-[#C9711F] px-2 py-0.5 rounded-[3px] text-[10px] border border-[#C9711F]">
              DEV ENVIRONMENT ONLY
            </span>
          </div>
          <span className="text-[#6B747E] tabular-nums">
            MANIFEST BUILD: {new Date(manifest.generatedAt).toLocaleString()}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
          Corpus Diagnostics, Draft Review Queue & Subdomain Assigner
        </h1>
      </div>

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
        {/* Drafts Summary */}
        <div className="border border-[#C9711F] bg-[#2A1D10]/30 p-4 rounded-[3px] space-y-1">
          <div className="text-[10px] uppercase text-[#C9711F] font-bold">DRAFT QUEUE</div>
          <div className="text-2xl font-bold text-[#E6E8EB] tabular-nums">
            {statusCounts.draft} DRAFTS
          </div>
          <div className="text-[11px] text-[#9AA3AD] pt-1 border-t border-[#23272D]">
            <strong className="text-[#A6503C]">{draftsMissingPrereqs}</strong> missing prerequisites
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-1">
          <div className="text-[10px] uppercase text-[#6B747E]">CORPUS STATUS BREAKDOWN</div>
          <div className="text-2xl font-bold text-[#E6E8EB] tabular-nums">
            {totalAtomsCount} ATOMS
          </div>
          <div className="text-[11px] text-[#9AA3AD] pt-1 border-t border-[#23272D] space-x-2">
            <span className="text-[#3E7D5A]">{statusCounts.published} Published</span>
            <span className="text-[#8A6D2F]">{statusCounts.fixture} Fixtures</span>
            <span className="text-[#C9711F]">{statusCounts.draft} Drafts</span>
          </div>
        </div>

        {/* Compiler Warnings */}
        <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-1">
          <div className="text-[10px] uppercase text-[#6B747E]">COMPILER LINT REPORTS</div>
          <div className="text-2xl font-bold text-[#C9711F] tabular-nums">
            {lintWarnings.length}
          </div>
          <div className="text-[11px] text-[#9AA3AD] pt-1 border-t border-[#23272D]">
            {orphanWarnings.length} Orphan Root Nodes
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

      {/* DRAFT ATOMS REVIEW QUEUE */}
      <section className="space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2">
          <div className="flex items-center gap-2">
            <h2 className="uppercase tracking-wider text-[#C9711F] font-bold">
              DRAFT REVIEW QUEUE ({draftAtoms.length})
            </h2>
            <span className="text-[#6B747E] text-[10px]">SORTED BY COMPLETENESS SCORE</span>
          </div>
          <span className="text-[#9AA3AD] text-[11px]">
            {draftsMissingPrereqs} DRAFTS NEED PREREQUISITES
          </span>
        </div>

        {draftAtoms.length === 0 ? (
          <div className="border border-[#23272D] bg-[#121417] p-8 text-center text-[#6B747E]">
            No draft atoms currently in review queue. Use <code className="text-[#C9711F]">npm run import</code> to convert masterclass files into drafts.
          </div>
        ) : (
          <div className="space-y-3">
            {draftAtoms.map(({ atom, hasOneScreen, hasPrereqs, hasSources, isPersonal, score, prereqSugs, subSug }) => (
              <div
                key={atom.id}
                className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-3 hover:border-[#333940] transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23272D] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#C9711F] font-bold text-sm">{atom.id}</span>
                    <TypeBadge type={atom.type} />
                    <span className="bg-[#C9711F]/10 border border-[#C9711F]/30 text-[#C9711F] px-2 py-0.5 rounded-[3px] font-bold text-[10px]">
                      SCORE: {score}/6
                    </span>
                    {isPersonal && (
                      <span className="bg-[#A6503C]/20 border border-[#A6503C] text-[#A6503C] px-2 py-0.5 rounded-[3px] font-bold text-[10px]">
                        PERSONAL ⚠️
                      </span>
                    )}
                    {atom.import_source && (
                      <span className="text-[#6B747E] text-[10px] truncate max-w-[280px]" title={atom.import_source}>
                        FROM: {atom.import_source}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-[#6B747E] tabular-nums">
                    <span>{atom.reading_minutes} MIN READ</span>
                    <Link
                      href={`/atom/${atom.id}`}
                      className="text-[#C9711F] hover:underline font-bold"
                    >
                      OPEN ATOM →
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4 font-sans text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-[#E6E8EB]">{atom.title}</h3>
                    <p className="text-[#9AA3AD] text-[11px] line-clamp-2 mt-1">
                      {atom.one_screen}
                    </p>
                  </div>

                  {/* Completeness Checklist Indicators */}
                  <div className="font-mono text-[10px] flex flex-wrap gap-2 shrink-0">
                    <span className={hasOneScreen ? "text-[#3E7D5A]" : "text-[#A6503C]"}>
                      {hasOneScreen ? "✓ one_screen" : "✗ no one_screen"}
                    </span>
                    <span className={hasPrereqs ? "text-[#3E7D5A]" : "text-[#A6503C]"}>
                      {hasPrereqs ? "✓ prereqs" : "✗ NO PREREQS"}
                    </span>
                    <span className={hasSources ? "text-[#3E7D5A]" : "text-[#6B747E]"}>
                      {hasSources ? "✓ sources" : "– no sources"}
                    </span>
                  </div>
                </div>

                {/* Subdomain & Prerequisite Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Proposed Subdomain */}
                  {subSug && (
                    <div className="border border-[#7D5A31] bg-[#7D5A31]/10 p-2.5 rounded-[3px] font-mono text-[11px]">
                      <span className="text-[#C9711F] font-bold uppercase text-[10px]">
                        PROPOSED SUBDOMAIN:
                      </span>{" "}
                      <code className="text-[#E6E8EB] font-bold">{subSug.proposedSubdomain}</code>
                      <span className="text-[#6B747E] ml-2 text-[10px]">({subSug.matchedKeywords})</span>
                    </div>
                  )}

                  {/* Prerequisite Candidates */}
                  {!hasPrereqs && prereqSugs.length > 0 && (
                    <div className="border border-[#315F7D] bg-[#315F7D]/10 p-2.5 rounded-[3px] font-mono text-[11px]">
                      <span className="text-[#315F7D] font-bold uppercase text-[10px]">
                        PREREQ CANDIDATES ({prereqSugs.length}):
                      </span>{" "}
                      {prereqSugs.map((sug, i) => (
                        <span key={i} className="inline-block bg-[#191C20] text-[#C9711F] font-bold px-1.5 py-0.5 rounded-[3px] mr-1">
                          {sug.prereqId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Diagnostics */}
      <section className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2">
          <h2 className="uppercase tracking-wider text-[#C9711F] font-bold">
            COMPILER LINT REPORT ({lintWarnings.length})
          </h2>
          <span className="text-[#6B747E]">PASSED BUILD</span>
        </div>

        <div className="divide-y divide-[#23272D] border border-[#23272D] bg-[#121417] rounded-[3px] max-h-[400px] overflow-y-auto">
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
    </div>
  );
}
