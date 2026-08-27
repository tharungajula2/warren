import React from "react";
import Link from "next/link";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { getCorpusManifest } from "@/lib/corpus";
import { StudioBulkTable, BulkDraftRow } from "@/components/StudioBulkTable";

export const metadata = {
  title: "Author Cockpit & Bulk Queue — WARREN Studio",
  description: "Internal authoring dashboard, bulk review queue, manifest metrics, and compiler linting.",
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

  const atomsDir = path.join(process.cwd(), "content", "atoms");

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

  // Prepare Bulk Draft Rows
  const draftRows: BulkDraftRow[] = allAtomsList
    .filter((a) => a.status === "draft")
    .map((atom) => {
      // Read raw file content to accurately extract component tags & claim markers
      const filePath = path.join(atomsDir, `${atom.id}.mdx`);
      let bodyText = "";
      if (fs.existsSync(filePath)) {
        bodyText = fs.readFileSync(filePath, "utf-8");
      }

      const hasOneScreen = !!atom.one_screen && atom.one_screen.length > 10;
      const hasPrereqs = atom.prerequisites && atom.prerequisites.length > 0;
      const hasSources = atom.sources && atom.sources.length > 0;

      const componentsMatched: string[] = [];
      if (bodyText.includes("<Flow>")) componentsMatched.push("Flow");
      if (bodyText.includes("<Rule")) componentsMatched.push("Rule");
      if (bodyText.includes("<Trap")) componentsMatched.push("Trap");
      if (bodyText.includes("<NeverConfuse")) componentsMatched.push("NeverConfuse");
      if (bodyText.includes("<Formula")) componentsMatched.push("Formula");

      const claimCount = (bodyText.match(/\{\/\* UNVERIFIED CLAIM/g) || []).length;
      const isPersonal = /\b(my|I\s|our project|this project|in my|my team|my role)\b/i.test(bodyText);

      // Word count
      const cleanBody = bodyText.replace(/^---[\s\S]*?---/, "").replace(/<[^>]+>/g, "").trim();
      const wordCount = cleanBody.split(/\s+/).filter(Boolean).length;

      // Completeness score out of 6
      let score = 0;
      if (atom.title) score++;
      if (hasOneScreen) score++;
      if (hasPrereqs) score++;
      if (hasSources) score++;
      if (atom.reading_minutes > 0) score++;
      if (claimCount === 0) score++;

      const subSug = subdomainSuggestions[atom.id];
      const prereqSugs = prereqSuggestions[atom.id] || [];

      return {
        id: atom.id,
        title: atom.title,
        type: atom.type,
        wordCount,
        readingMinutes: atom.reading_minutes,
        componentsMatched,
        isPersonal,
        claimCount,
        proposedSubdomain: subSug ? subSug.proposedSubdomain : "unsorted",
        prereqCandidates: prereqSugs.map((s) => s.prereqId),
        score,
        importSource: atom.import_source || "Manual",
      };
    });

  // Sort by score descending then ID
  draftRows.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  // Domain counts
  const domainCounts = domainTree
    .map((dom) => {
      const count = allAtomsList.filter((a) => a.domain === dom.domain).length;
      return { domain: dom.domain, count };
    })
    .sort((a, b) => a.count - b.count);

  const orphanWarnings = lintWarnings.filter((w) => w.rule === "ORPHAN_ATOM");

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Cockpit Top Header */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#C9711F] font-bold">
            <span>WARREN // AUTHOR COCKPIT & BULK REVIEW QUEUE</span>
            <span className="bg-[#2A1D10] text-[#C9711F] px-2 py-0.5 rounded-[3px] text-[10px] border border-[#C9711F]">
              PRIMARY AUTHORING SCREEN
            </span>
          </div>
          <span className="text-[#6B747E] tabular-nums">
            MANIFEST BUILD: {new Date(manifest.generatedAt).toLocaleString()}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
          Corpus Diagnostics & Interactive Bulk Review Queue
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

      {/* PART 5: BULK REVIEW QUEUE TABLE */}
      <section className="space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2">
          <div className="flex items-center gap-2">
            <h2 className="uppercase tracking-wider text-[#C9711F] font-bold">
              BULK REVIEW QUEUE TABLE ({draftRows.length} DRAFTS)
            </h2>
            <span className="text-[#6B747E] text-[10px]">SORTABLE BY ANY COLUMN</span>
          </div>
          <span className="text-[#9AA3AD] text-[11px]">
            {draftsMissingPrereqs} DRAFTS NEED PREREQUISITE ASSIGNMENT
          </span>
        </div>

        <StudioBulkTable rows={draftRows} />
      </section>

      {/* Compiler Lint Diagnostics */}
      <section className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2">
          <h2 className="uppercase tracking-wider text-[#C9711F] font-bold">
            COMPILER LINT REPORT ({lintWarnings.length})
          </h2>
          <span className="text-[#6B747E]">PASSED BUILD GATE</span>
        </div>

        <div className="divide-y divide-[#23272D] border border-[#23272D] bg-[#121417] rounded-[3px] max-h-[300px] overflow-y-auto">
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
