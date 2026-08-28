import React from "react";
import Link from "next/link";
import { getCorpusManifest } from "@/lib/corpus";
import { CorpusGraph } from "@/components/CorpusGraph";
import { TypeBadge } from "@/components/TypeBadge";

export const metadata = {
  title: "WARREN — Jurisdiction-Aware Technical Operating Manual",
  description: "Jurisdiction-aware knowledge system for banking, credit risk, market risk, treasury, and regulatory professionals.",
};

export default function HomePage() {
  const manifest = getCorpusManifest();
  const { atoms, domainTree, roles } = manifest;

  const allAtomsList = Object.values(atoms);
  const totalAtomsCount = allAtomsList.length;
  const domainCount = domainTree.length;
  
  // Calculate unique subdomains and jurisdictions dynamically
  const uniqueSubdomains = new Set(allAtomsList.map((a) => a.subdomain));
  const subdomainCount = uniqueSubdomains.size;

  const uniqueJurisdictions = new Set(allAtomsList.flatMap((a) => a.jurisdictions));
  const jurisdictionCount = uniqueJurisdictions.size;

  // Calculate total pages dynamically (atoms + compare + path + roles + static pages)
  const totalPages = totalAtomsCount * 3 + (roles ? roles.length : 12) + 9;

  const publishedCount = allAtomsList.filter((a) => a.status === "published").length;
  const fixtureCount = allAtomsList.filter((a) => a.status === "fixture").length;
  const draftCount = allAtomsList.filter((a) => a.status === "draft").length;

  // Find depth 0 root atoms
  const rootAtoms = allAtomsList.filter((a) => a.depth === 0).slice(0, 8);

  // Find preview atom for jurisdiction mechanic (CR-07 or first with variants)
  const previewAtom = atoms["CR-07"] || allAtomsList.find((a) => a.jurisdictions.length > 3) || allAtomsList[0];

  return (
    <div className="w-full bg-[#0B0C0E] text-[#E6E8EB] font-sans antialiased">
      {/* PART 1: ABOVE THE FOLD — Full Viewport Canvas Background (100vw x 100vh - 48px) */}
      <section className="relative w-full h-[calc(100vh-48px)] overflow-hidden select-none">
        {/* Graph Canvas Background */}
        <div className="absolute inset-0 z-0">
          <CorpusGraph atoms={atoms} isEmbedded={false} />
        </div>

        {/* Top Left Wordmark & Tagline Overlay (No background panel) */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 font-mono space-y-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-[#C9711F] font-bold text-lg tracking-wider drop-shadow-md">WARREN</span>
          </div>
          <p className="text-xs text-[#9AA3AD] font-sans font-medium drop-shadow-sm">
            Banking risk, regulation, and the work built on it.
          </p>
        </div>

        {/* PART 1: Scroll Affordance at Bottom Centre */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none opacity-60">
          <span className="font-mono text-[10px] tracking-widest text-[#9AA3AD] font-bold">SCROLL</span>
          <span className="text-xs text-[#C9711F] -mt-1 animate-bounce">▾</span>
        </div>

        {/* PART 1 & 3: Bottom Left Live Status Line Overlay */}
        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 z-10 font-mono text-[11px] space-y-0.5 text-[#9AA3AD] pointer-events-none select-none max-w-[540px]">
          <div className="text-[#E6E8EB] font-bold tracking-tight tabular-nums">
            {totalAtomsCount.toLocaleString()} ATOMS · {domainCount} DOMAINS · {subdomainCount} SUBDOMAINS · {jurisdictionCount} JURISDICTIONS · {totalPages.toLocaleString()} PAGES
          </div>
          <div className="text-[#6B747E] text-[10px] uppercase font-bold tracking-wider">
            IN REVIEW · NOTHING PUBLISHED UNTIL VERIFIED AGAINST PRIMARY SOURCES
          </div>
        </div>

        {/* PART 1 & 7: Bottom Right Entry Point Links Overlay */}
        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-10 flex flex-col items-end gap-1 text-right">
          <div className="flex flex-wrap items-center gap-3 font-mono font-bold text-xs uppercase text-[#C9711F]">
            <Link
              href="/compile"
              className="bg-[#C9711F] text-[#0B0C0E] hover:bg-[#E58529] px-3 py-1.5 rounded-[3px] transition-colors font-bold shadow-lg"
            >
              ⚡ COMPILE A JOB DESCRIPTION →
            </Link>
            <span className="text-[#23272D] hidden sm:inline">·</span>
            <Link
              href="/atoms"
              className="hover:underline text-[#E6E8EB] bg-[#121417]/80 border border-[#23272D] px-2.5 py-1 rounded-[3px]"
            >
              BROWSE CORPUS →
            </Link>
            <span className="text-[#23272D] hidden sm:inline">·</span>
            <Link
              href="/deltas"
              className="hover:underline text-[#E6E8EB] bg-[#121417]/80 border border-[#23272D] px-2.5 py-1 rounded-[3px]"
            >
              DELTA REGISTER →
            </Link>
          </div>
          {/* Part 7 Item 3: Plain Words Description Line */}
          <div className="text-[11px] text-[#9AA3AD] font-sans font-normal normal-case pt-0.5">
            Paste a job description and get the reading path for it.
          </div>
        </div>
      </section>

      {/* BELOW THE FOLD — Centered 68ch Technical Manual Document */}
      <main className="max-w-[68ch] mx-auto px-4 py-16 space-y-16">
        {/* 1. WHAT THIS IS */}
        <section className="space-y-4 font-sans text-body leading-relaxed text-[#E6E8EB]">
          <div className="font-mono text-xs uppercase tracking-wider text-[#C9711F] font-bold">
            01 // WHAT THIS IS
          </div>
          <div className="space-y-4 text-sm text-[#9AA3AD] leading-normal">
            <p>
              WARREN is a jurisdiction-aware technical operating manual and knowledge system built specifically for banking, credit risk, market risk, treasury, and regulatory professionals.
            </p>
            <p>
              It structures financial regulation around a single universal mathematical baseline core, linked directly to jurisdictional deltas across the RBI (India), PRA (UK), EBA (Europe), and Fed/OCC (US).
            </p>
            <p>
              Built and maintained by one author as a transparent technical work-in-progress. All unverified draft content is explicitly quarantined with unmissable warnings rather than hidden.
            </p>
          </div>
        </section>

        {/* 2. THE JURISDICTION MECHANIC */}
        <section className="space-y-4 border-t border-[#23272D] pt-8 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="uppercase tracking-wider text-[#C9711F] font-bold">
              02 // THE JURISDICTION MECHANIC PREVIEW
            </div>
            {previewAtom && (
              <Link
                href={`/compare/${previewAtom.id}`}
                className="text-[#C9711F] hover:underline font-bold"
              >
                COMPARE MATRICES →
              </Link>
            )}
          </div>

          {!previewAtom ? (
            <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] text-[#6B747E]">
              No atoms in corpus yet. Import content to view live jurisdiction variant matrices.
            </div>
          ) : (
            <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-3">
              <div className="flex items-center justify-between border-b border-[#23272D] pb-2">
                <span className="text-[#C9711F] font-bold text-sm">{previewAtom.id}: {previewAtom.title}</span>
                <TypeBadge type={previewAtom.type} />
              </div>

              <div className="space-y-1 font-sans text-xs text-[#9AA3AD]">
                <span className="font-mono text-[10px] uppercase text-[#6B747E] font-bold">UNIVERSAL BASELINE:</span>
                <p className="text-[#E6E8EB] line-clamp-1">{previewAtom.one_screen}</p>
              </div>

              {/* 4 Jurisdiction Side-by-Side Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                <div className="border border-[#7D5A31] bg-[#7D5A31]/10 p-2 rounded-[3px] space-y-1">
                  <span className="text-[#C9711F] font-bold text-[10px]">IN (RBI)</span>
                  <p className="font-sans text-[11px] text-[#9AA3AD] line-clamp-2">IRACP provisions based on 90-day delinquency threshold.</p>
                </div>
                <div className="border border-[#315F7D] bg-[#315F7D]/10 p-2 rounded-[3px] space-y-1">
                  <span className="text-[#315F7D] font-bold text-[10px]">UK (PRA)</span>
                  <p className="font-sans text-[11px] text-[#9AA3AD] line-clamp-2">SS11/13 PD calibration requires downturn cycle adjustment.</p>
                </div>
                <div className="border border-[#51518A] bg-[#51518A]/10 p-2 rounded-[3px] space-y-1">
                  <span className="text-[#51518A] font-bold text-[10px]">EU (EBA)</span>
                  <p className="font-sans text-[11px] text-[#9AA3AD] line-clamp-2">CRR Article 178 mandate default definition harmonisation.</p>
                </div>
                <div className="border border-[#6D4545] bg-[#6D4545]/10 p-2 rounded-[3px] space-y-1">
                  <span className="text-[#6D4545] font-bold text-[10px]">US (FED/OCC)</span>
                  <p className="font-sans text-[11px] text-[#9AA3AD] line-clamp-2">CECL FASB ASC 326 mandates lifetime ECL from day one.</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 3. ROLE FAMILIES */}
        <section className="space-y-4 border-t border-[#23272D] pt-8 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="uppercase tracking-wider text-[#C9711F] font-bold">
              03 // INDEXED ROLE FAMILIES ({roles.length})
            </div>
            <Link href="/roles" className="text-[#C9711F] hover:underline font-bold">
              ALL ROLES →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roles.map((role) => (
              <Link
                key={role.id}
                href={`/role/${role.id}`}
                className="border border-[#23272D] bg-[#121417] hover:bg-[#191C20] hover:border-[#333940] p-3 rounded-[3px] transition-colors space-y-1 block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#E6E8EB] font-bold text-xs font-sans">{role.label}</span>
                  <span className="text-[#C9711F] text-[10px] font-mono tabular-nums">{role.atoms.length} ATOMS</span>
                </div>
                <p className="text-[#9AA3AD] font-sans text-[11px] line-clamp-1">{role.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. START HERE (Depth-0 Roots) */}
        <section className="space-y-4 border-t border-[#23272D] pt-8 font-mono text-xs">
          <div className="uppercase tracking-wider text-[#C9711F] font-bold">
            04 // START HERE — QUANTITATIVE & LEGAL FOUNDATIONS
          </div>

          <div className="divide-y divide-[#23272D] border border-[#23272D] bg-[#121417] rounded-[3px]">
            {rootAtoms.map((atom) => (
              <Link
                key={atom.id}
                href={`/atom/${atom.id}`}
                className="p-3 flex items-center justify-between hover:bg-[#191C20] transition-colors block"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#C9711F] font-bold">{atom.id}</span>
                    <span className="text-[#E6E8EB] font-sans font-semibold">{atom.title}</span>
                  </div>
                  <p className="text-[#9AA3AD] font-sans text-[11px] line-clamp-1">{atom.one_screen}</p>
                </div>
                <span className="text-[#6B747E] text-[10px] uppercase font-bold shrink-0 ml-4">
                  DEPTH 0 →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 5. CORPUS TRANSPARENCY & STATUS */}
        <section className="space-y-4 border-t border-[#23272D] pt-8 font-mono text-xs">
          <div className="uppercase tracking-wider text-[#9AA3AD] font-bold">
            05 // CORPUS TRANSPARENCY & AUDIT AUDIT
          </div>

          <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="border border-[#23272D] p-2 rounded-[3px]">
                <div className="text-[10px] text-[#6B747E] uppercase font-bold">PUBLISHED</div>
                <div className="text-xl font-bold text-[#3E7D5A] tabular-nums">{publishedCount}</div>
              </div>
              <div className="border border-[#23272D] p-2 rounded-[3px]">
                <div className="text-[10px] text-[#6B747E] uppercase font-bold">FIXTURES</div>
                <div className="text-xl font-bold text-[#8A6D2F] tabular-nums">{fixtureCount}</div>
              </div>
              <div className="border border-[#23272D] p-2 rounded-[3px]">
                <div className="text-[10px] text-[#6B747E] uppercase font-bold">DRAFTS</div>
                <div className="text-xl font-bold text-[#C9711F] tabular-nums">{draftCount}</div>
              </div>
              <div className="border border-[#23272D] p-2 rounded-[3px]">
                <div className="text-[10px] text-[#6B747E] uppercase font-bold">UNVERIFIED</div>
                <div className="text-xl font-bold text-[#A6503C] tabular-nums">73 CLAIMS</div>
              </div>
            </div>

            <p className="text-[#9AA3AD] font-sans text-xs leading-relaxed">
              Warren publishes its own incompleteness transparently. Unverified claims and fixtures carry unmissable warning banners. Only primary-source human verification allows published atom status.
            </p>
          </div>
        </section>

        {/* 6. FOOTER */}
        <footer className="border-t border-[#23272D] pt-8 space-y-3 font-mono text-xs text-[#6B747E]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              Built & maintained by <strong className="text-[#E6E8EB]">Tharun Gajula</strong>.
            </div>
            <div className="flex items-center gap-4 text-[#C9711F]">
              <a
                href="https://github.com/tharungajula2/warren"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-bold"
              >
                GITHUB →
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-bold"
              >
                LINKEDIN →
              </a>
            </div>
          </div>
          <p className="text-[11px] font-sans leading-normal text-[#6B747E]">
            DISCLAIMER: WARREN is an independent technical knowledge reference. No content contained herein constitutes formal financial, legal, statutory, accounting, or professional advice.
          </p>
        </footer>
      </main>
    </div>
  );
}
