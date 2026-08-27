"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CorpusManifest, Jurisdiction, RoleFamily } from "@/lib/schema";
import {
  matchRoles,
  detectJurisdiction,
  buildRequirementSet,
  RoleMatch,
  RequirementSet,
} from "@/lib/jd-matcher";
import { TypeBadge } from "@/components/TypeBadge";

interface ExampleJD {
  id: string;
  title: string;
  role_family: string;
  text: string;
}

const JURISDICTION_CHIPS: Record<Jurisdiction, { label: string; border: string; text: string; bg: string }> = {
  universal: { label: "UNIVERSAL", border: "border-[#6B747E]", text: "text-[#6B747E]", bg: "bg-[#191C20]" },
  IN: { label: "INDIA (RBI)", border: "border-[#7D5A31]", text: "text-[#7D5A31]", bg: "bg-[#7D5A31]/10" },
  UK: { label: "UK (PRA)", border: "border-[#315F7D]", text: "text-[#315F7D]", bg: "bg-[#315F7D]/10" },
  EU: { label: "EU (EBA)", border: "border-[#51518A]", text: "text-[#51518A]", bg: "bg-[#51518A]/10" },
  US: { label: "US (FED)", border: "border-[#6D4545]", text: "text-[#6D4545]", bg: "bg-[#6D4545]/10" },
};

export default function CompilePage() {
  const [manifest, setManifest] = useState<CorpusManifest | null>(null);
  const [examples, setExamples] = useState<ExampleJD[]>([]);
  const [jdInput, setJdInput] = useState<string>("");
  const [isCompiled, setIsCompiled] = useState<boolean>(false);
  const [overrideJurisdiction, setOverrideJurisdiction] = useState<Jurisdiction | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  useEffect(() => {
    fetch("/corpus-manifest.json")
      .then((res) => res.json())
      .then((data: CorpusManifest) => setManifest(data))
      .catch((err) => console.error("Failed to load manifest:", err));

    fetch("/example-jds.json")
      .then((res) => res.json())
      .then((data: ExampleJD[]) => setExamples(data))
      .catch((err) => console.error("Failed to load example JDs:", err));
  }, []);

  if (!manifest) {
    return (
      <div className="p-8 font-mono text-xs text-[#9AA3AD]">
        Loading WARREN Compiler Engine...
      </div>
    );
  }

  const handleCompile = () => {
    if (!jdInput.trim()) return;
    setIsCompiled(true);
    setOverrideJurisdiction(null);
  };

  const handleFillExample = (ex: ExampleJD) => {
    setJdInput(ex.text);
    setIsCompiled(false);
  };

  const handleReset = () => {
    setIsCompiled(false);
    setJdInput("");
    setOverrideJurisdiction(null);
  };

  // Perform matching
  const roleMatches = matchRoles(jdInput, manifest.roles);
  const detectedJur = detectJurisdiction(jdInput);
  const activeJur = overrideJurisdiction !== null ? overrideJurisdiction : detectedJur;

  const requirementSet: RequirementSet | null = isCompiled && roleMatches.length > 0
    ? buildRequirementSet(roleMatches, activeJur, manifest)
    : null;

  const handleCopyChecklist = () => {
    if (!requirementSet || !roleMatches[0]) return;
    const topRole = roleMatches[0].role.label;

    let markdown = `# WARREN Capability Reading Checklist — ${topRole}\n\n`;
    markdown += `**Detected Jurisdiction**: ${activeJur || "Universal"}\n`;
    markdown += `**Reading Time**: ${requirementSet.totalReadingMinutes} minutes (${requirementSet.coveredAtoms.length} atoms)\n\n`;
    markdown += `## Recommended Reading Path\n`;

    requirementSet.coveredAtoms.forEach((item, idx) => {
      const badge = item.weight === 3 ? "[CORE]" : item.weight === 2 ? "[SUPPORTING]" : "[OPTIONAL]";
      markdown += `${idx + 1}. ${badge} **${item.atom.id}: ${item.atom.title}** (${item.atom.reading_minutes}m)\n   *Mental Model*: ${item.atom.one_screen.trim()}\n`;
    });

    if (requirementSet.gapAtoms.length > 0) {
      markdown += `\n## Content Gaps (Not Yet Covered)\n`;
      requirementSet.gapAtoms.forEach((gap) => {
        markdown += `- Warren does not yet have an atom for ${gap.id}\n`;
      });
    }

    navigator.clipboard.writeText(markdown);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="max-w-[1024px] mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Top Header Bar */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#9AA3AD]">
            <Link href="/atoms" className="hover:text-[#C9711F]">
              INDEX
            </Link>
            <span>&gt;</span>
            <span className="text-[#E6E8EB]">JD COMPILER</span>
          </div>
          <span className="text-[#3E7D5A] font-bold text-[11px] bg-[#3E7D5A]/10 border border-[#3E7D5A]/30 px-2 py-0.5 rounded-[3px]">
            CLIENT-SIDE ONLY • ZERO AI
          </span>
        </div>

        <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
          Job Description Capability Compiler
        </h1>
        <p className="text-xs text-[#9AA3AD] font-sans">
          Paste any banking or finance job description to compile a personal capability map, topologically ordered reading path, jurisdiction variants, and content gap report.
        </p>
      </div>

      {/* INPUT STATE */}
      {!isCompiled && (
        <div className="space-y-6">
          {/* Monospace Textarea */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <label className="text-[#C9711F] font-bold uppercase tracking-wider">
                PASTE JOB DESCRIPTION
              </label>
              <span className="text-[#6B747E]">MINIMUM 400PX HEIGHT</span>
            </div>
            <textarea
              value={jdInput}
              onChange={(e) => setJdInput(e.target.value)}
              placeholder="Paste job description text here (e.g. key responsibilities, required skills, regulator mandates, credit parameters, programming tools)..."
              className="w-full h-[420px] p-4 bg-[#121417] border border-[#23272D] focus:border-[#C9711F] rounded-[3px] text-[#E6E8EB] placeholder-[#6B747E] outline-none font-mono text-xs leading-relaxed resize-y"
            />
          </div>

          {/* Privacy Guarantee & Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#23272D] pt-4 font-mono text-xs">
            <span className="text-[#6B747E] text-[11px] select-none">
              🔒 Runs entirely in your browser. Nothing you paste is sent anywhere.
            </span>
            <button
              onClick={handleCompile}
              disabled={!jdInput.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#C9711F] hover:bg-[#b06118] text-[#0B0C0E] font-bold uppercase tracking-wider rounded-[3px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              COMPILE CAPABILITY MAP →
            </button>
          </div>

          {/* One-Click Example Fill Buttons */}
          {examples.length > 0 && (
            <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-3 font-mono text-xs">
              <div className="text-[10px] uppercase text-[#6B747E] font-bold tracking-wider">
                OR FILL ONE-CLICK SAMPLE JOB DESCRIPTION:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {examples.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleFillExample(ex)}
                    className="p-3 text-left bg-[#191C20] hover:bg-[#23272D] border border-[#23272D] hover:border-[#C9711F] rounded-[3px] transition-colors space-y-1"
                  >
                    <div className="text-[#C9711F] font-bold text-[11px] truncate">
                      {ex.title}
                    </div>
                    <p className="text-[10px] text-[#9AA3AD] font-sans line-clamp-2 leading-tight">
                      {ex.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULT STATE */}
      {isCompiled && requirementSet && (
        <div className="space-y-8 font-sans">
          {/* Action Header */}
          <div className="flex items-center justify-between font-mono text-xs border-b border-[#23272D] pb-4">
            <button
              onClick={handleReset}
              className="text-[#9AA3AD] hover:text-[#C9711F] flex items-center gap-1 font-bold"
            >
              ← EDIT JOB DESCRIPTION
            </button>

            <button
              onClick={handleCopyChecklist}
              className="bg-[#191C20] hover:bg-[#23272D] border border-[#C9711F] text-[#C9711F] px-3 py-1.5 rounded-[3px] font-bold transition-colors"
            >
              {copySuccess ? "✓ COPIED TO CLIPBOARD!" : "📋 COPY AS MARKDOWN CHECKLIST"}
            </button>
          </div>

          {/* 1. VERDICT BAR */}
          <div className="border border-[#23272D] bg-[#121417] p-5 rounded-[3px] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs border-b border-[#23272D] pb-3">
              <span className="text-[#C9711F] font-bold uppercase tracking-wider">
                1. COMPILER VERDICT & MATCHED ROLE
              </span>
              <span className="text-[#6B747E] tabular-nums">
                MATCHED SIGNALS: {roleMatches[0]?.matchedSignals.length || 0}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-[#9AA3AD] mb-1">
                  TOP MATCHED ROLE FAMILY:
                </div>
                <h2 className="text-xl font-bold text-[#E6E8EB] tracking-tight">
                  {roleMatches[0]?.role.label}
                </h2>
                <p className="text-xs text-[#9AA3AD] mt-1 max-w-[64ch]">
                  {roleMatches[0]?.role.description}
                </p>
              </div>

              {/* Jurisdiction Chip & Override Selector */}
              <div className="font-mono text-xs space-y-1 bg-[#191C20] p-3 border border-[#23272D] rounded-[3px]">
                <div className="text-[10px] text-[#6B747E] uppercase">
                  DETECTED JURISDICTION:
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-[3px] border font-bold text-xs ${
                    activeJur && JURISDICTION_CHIPS[activeJur]
                      ? `${JURISDICTION_CHIPS[activeJur].border} ${JURISDICTION_CHIPS[activeJur].bg} ${JURISDICTION_CHIPS[activeJur].text}`
                      : "border-[#6B747E] text-[#6B747E]"
                  }`}>
                    {activeJur || "UNSPECIFIED"}
                  </span>

                  {/* Inline Jurisdiction Selector */}
                  <select
                    value={activeJur || "universal"}
                    onChange={(e) => setOverrideJurisdiction(e.target.value as Jurisdiction)}
                    className="bg-[#121417] border border-[#23272D] text-[#E6E8EB] text-xs px-2 py-0.5 rounded-[3px] outline-none cursor-pointer"
                  >
                    <option value="universal">Select Jurisdiction...</option>
                    <option value="IN">IN — India (RBI)</option>
                    <option value="UK">UK — United Kingdom (PRA)</option>
                    <option value="EU">EU — European Union (EBA)</option>
                    <option value="US">US — United States (FED)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. WHY THIS MATCHED */}
          <div className="border border-[#23272D] bg-[#121417] p-5 rounded-[3px] space-y-3 font-mono text-xs">
            <div className="text-[#9AA3AD] font-bold uppercase tracking-wider border-b border-[#23272D] pb-2">
              2. WHY THIS MATCHED (SIGNAL MATCHES)
            </div>

            <div className="space-y-3">
              {roleMatches.slice(0, 3).map((match) => (
                <div key={match.role.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#E6E8EB] font-bold">
                      {match.role.label}
                    </span>
                    <span className="text-[#6B747E] tabular-nums">
                      SCORE: {match.score}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {match.matchedSignals.map((sig, idx) => (
                      <span
                        key={idx}
                        className="bg-[#191C20] border border-[#333940] text-[#C9711F] px-2 py-0.5 rounded-[3px] text-[11px]"
                      >
                        ✓ {sig}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. YOUR READING PATH */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#23272D] pb-2 font-mono text-xs">
              <h3 className="uppercase tracking-wider text-[#3E7D5A] font-bold">
                3. YOUR TOPOLOGICALLY ORDERED READING PATH
              </h3>
              <span className="text-[#C9711F] font-bold tabular-nums">
                {requirementSet.coveredAtoms.length} ATOMS // {requirementSet.totalReadingMinutes} MINUTES READ TIME
              </span>
            </div>

            <div className="relative border-l-2 border-[#3E7D5A] pl-6 ml-3 space-y-6">
              {requirementSet.coveredAtoms.map((item, idx) => {
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
                          {item.isPrerequisite && (
                            <span className="text-[#6B747E] text-[10px]">(PREREQUISITE)</span>
                          )}
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

                      <h4 className="text-base font-bold text-[#E6E8EB] font-sans">
                        {item.atom.title}
                      </h4>

                      <p className="text-xs text-[#9AA3AD] font-sans leading-relaxed border-t border-[#23272D] pt-2">
                        {item.atom.one_screen}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. JURISDICTION NOTES */}
          {requirementSet.jurisdictionNotes.length > 0 && (
            <div className="border border-[#7D5A31] bg-[#121417] p-5 rounded-[3px] space-y-3 font-mono text-xs">
              <div className="text-[#7D5A31] font-bold uppercase tracking-wider border-b border-[#23272D] pb-2">
                4. JURISDICTION VARIANTS ({activeJur})
              </div>
              <p className="text-xs font-sans text-[#9AA3AD]">
                The following atoms in your path contain explicit regulatory variants for {activeJur}:
              </p>
              <div className="space-y-2">
                {requirementSet.jurisdictionNotes.map((note) => (
                  <div
                    key={note.atomId}
                    className="flex items-center justify-between bg-[#191C20] p-3 border border-[#23272D] rounded-[3px]"
                  >
                    <div>
                      <strong className="text-[#C9711F] mr-2">{note.atomId}</strong>
                      <span className="text-[#E6E8EB] font-sans">
                        {manifest.atoms[note.atomId]?.title}
                      </span>
                    </div>
                    <Link
                      href={`/compare/${note.atomId}`}
                      className="text-[#7D5A31] hover:underline font-bold"
                    >
                      COMPARE {activeJur} VARIANT →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. NOT YET COVERED (GAP LIST) */}
          <div className="border border-[#A6503C] bg-[#121417] p-5 rounded-[3px] space-y-3 font-mono text-xs">
            <div className="text-[#A6503C] font-bold uppercase tracking-wider border-b border-[#23272D] pb-2 flex items-center justify-between">
              <span>5. CONTENT GAPS ({requirementSet.gapAtoms.length})</span>
              <span className="text-[10px] text-[#6B747E]">HONEST GAP REPORT</span>
            </div>

            {requirementSet.gapAtoms.length === 0 ? (
              <p className="text-xs text-[#3E7D5A] font-sans">
                ✓ Full coverage! Warren has an atom for every requirement in this role profile.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-sans text-[#9AA3AD]">
                  The role requires the following technical topics which Warren does not yet cover in the current 12 fixture atoms:
                </p>
                <ul className="space-y-1.5 border-l-2 border-[#A6503C] pl-3">
                  {requirementSet.gapAtoms.map((gap) => (
                    <li key={gap.id} className="text-[#E6E8EB] text-xs">
                      • Warren does not yet have an atom for <strong className="text-[#A6503C] font-mono">{gap.id}</strong> (Priority Weight {gap.weight}).
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
