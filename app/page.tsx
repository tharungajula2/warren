import React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
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

  // Calculate total pages dynamically
  const totalPages = totalAtomsCount * 3 + (roles ? roles.length : 12) + 9;

  const publishedCount = allAtomsList.filter((a) => a.status === "published").length;
  const fixtureCount = allAtomsList.filter((a) => a.status === "fixture").length;
  const draftCount = allAtomsList.filter((a) => a.status === "draft").length;

  // Find depth 0 root atoms
  const rootAtoms = allAtomsList.filter((a) => a.depth === 0).slice(0, 8);

  // Find preview atom for jurisdiction mechanic (CR-07 or first with variants)
  const previewAtom = atoms["CR-07"] || allAtomsList.find((a) => a.jurisdictions.length > 3) || allAtomsList[0];

  return (
    <div className="w-full bg-bg text-text font-sans antialiased">
      {/* ABOVE THE FOLD — Full Viewport Canvas Background (100vw x 100vh - 48px) */}
      <section className="relative w-full h-[calc(100vh-48px)] overflow-hidden select-none">
        {/* Graph Canvas Background */}
        <div className="absolute inset-0 z-0">
          <CorpusGraph atoms={atoms} isEmbedded={false} />
        </div>

        {/* Task 7: Scroll Affordance at Bottom Centre */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none opacity-60">
          <span className="font-mono text-xs tracking-widest text-text-faint font-bold">SCROLL</span>
        </div>

        {/* Task 7: Bottom Left Live Status Line Overlay */}
        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 z-10 font-mono text-xs space-y-0.5 text-text-muted pointer-events-none select-none max-w-xl bg-surface/90 border border-border/50 px-3 py-1.5 rounded-sm">
          <div className="text-text font-bold tracking-tight tabular-nums">
            {totalAtomsCount.toLocaleString()} ATOMS · {domainCount} DOMAINS · {subdomainCount} SUBDOMAINS · {jurisdictionCount} JURISDICTIONS · {totalPages.toLocaleString()} PAGES
          </div>
          <div className="text-text-faint text-xs uppercase font-bold tracking-wider">
            IN REVIEW · NOTHING PUBLISHED UNTIL VERIFIED AGAINST PRIMARY SOURCES
          </div>
        </div>

        {/* Bottom Right Plain Text Entry Links */}
        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-10 flex flex-col items-end gap-1.5 text-right">
          <div className="flex flex-wrap items-center gap-4 font-mono font-bold text-xs uppercase">
            <Link
              href="/atoms"
              className="text-accent hover:underline transition-colors"
            >
              BROWSE CORPUS →
            </Link>
            <span className="text-border hidden sm:inline">·</span>
            <Link
              href="/deltas"
              className="text-text hover:underline transition-colors"
            >
              DELTA REGISTER →
            </Link>
            <span className="text-border hidden sm:inline">·</span>
            <Link
              href="/roles"
              className="text-text hover:underline transition-colors"
            >
              ROLE FAMILIES →
            </Link>
          </div>
        </div>
      </section>

      {/* BELOW THE FOLD — Technical Manual Document (60ch measure for 18px body size) */}
      <main className="max-w-[60ch] mx-auto px-4 py-16 space-y-16">
        {/* 1. WHAT THIS IS */}
        <section className="space-y-4 font-sans text-body leading-relaxed text-text">
          <div className="font-mono text-xs uppercase tracking-wider text-accent font-bold">
            01 // WHAT THIS IS
          </div>
          <div className="space-y-4 text-body text-text-muted leading-relaxed">
            <p>
              WARREN is a jurisdiction-aware technical operating manual and knowledge system built specifically for banking, credit risk, treasury, and regulatory professionals.
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
        <section className="space-y-4 border-t border-border pt-8 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="uppercase tracking-wider text-accent font-bold">
              02 // THE JURISDICTION MECHANIC PREVIEW
            </div>
            {previewAtom && (
              <Link
                href={`/compare/${previewAtom.id}`}
                className="text-accent hover:underline font-bold"
              >
                COMPARE MATRICES →
              </Link>
            )}
          </div>

          {!previewAtom ? (
            <div className="border border-border bg-surface p-4 rounded-sm text-text-faint">
              No atoms in corpus yet. Import content to view live jurisdiction variant matrices.
            </div>
          ) : (
            <div className="border border-border bg-surface p-4 rounded-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-accent font-bold text-xs">{previewAtom.id}: {previewAtom.title}</span>
                <TypeBadge type={previewAtom.type} />
              </div>

              <div className="space-y-1 font-sans text-xs text-text-muted">
                <span className="font-mono text-xs uppercase text-text-faint font-bold">UNIVERSAL BASELINE:</span>
                <p className="text-text line-clamp-1">{previewAtom.one_screen}</p>
              </div>

              {/* 4 Jurisdiction Side-by-Side Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                <div className="border border-jur-in/40 bg-jur-in/10 p-2 rounded-sm space-y-1">
                  <span className="text-accent font-bold text-xs">IN (RBI)</span>
                  <p className="font-sans text-xs text-text-muted line-clamp-2">IRACP provisions based on 90-day delinquency threshold.</p>
                </div>
                <div className="border border-jur-uk/40 bg-jur-uk/10 p-2 rounded-sm space-y-1">
                  <span className="text-jur-uk font-bold text-xs">UK (PRA)</span>
                  <p className="font-sans text-xs text-text-muted line-clamp-2">SS11/13 PD calibration requires downturn cycle adjustment.</p>
                </div>
                <div className="border border-jur-eu/40 bg-jur-eu/10 p-2 rounded-sm space-y-1">
                  <span className="text-jur-eu font-bold text-xs">EU (EBA)</span>
                  <p className="font-sans text-xs text-text-muted line-clamp-2">CRR Article 178 mandate default definition harmonisation.</p>
                </div>
                <div className="border border-jur-us/40 bg-jur-us/10 p-2 rounded-sm space-y-1">
                  <span className="text-jur-us font-bold text-xs">US (FED/OCC)</span>
                  <p className="font-sans text-xs text-text-muted line-clamp-2">CECL FASB ASC 326 mandates lifetime ECL from day one.</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 3. ROLE FAMILIES */}
        <section className="space-y-4 border-t border-border pt-8 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="uppercase tracking-wider text-accent font-bold">
              03 // INDEXED ROLE FAMILIES ({roles.length})
            </div>
            <Link href="/roles" className="text-accent hover:underline font-bold">
              ALL ROLES →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roles.map((role) => (
              <Link
                key={role.id}
                href={`/role/${role.id}`}
                className="border border-border bg-surface hover:bg-surface-2 hover:border-border-strong p-3 rounded-sm transition-colors space-y-1 block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-text font-bold text-xs font-sans">{role.label}</span>
                  <span className="text-accent text-xs font-mono tabular-nums">{role.atoms.length} ATOMS</span>
                </div>
                <p className="text-text-muted font-sans text-xs line-clamp-1">{role.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. START HERE (Depth-0 Roots) */}
        <section className="space-y-4 border-t border-border pt-8 font-mono text-xs">
          <div className="uppercase tracking-wider text-accent font-bold">
            04 // START HERE — QUANTITATIVE & LEGAL FOUNDATIONS
          </div>

          <div className="divide-y divide-border border border-border bg-surface rounded-sm">
            {rootAtoms.map((atom) => (
              <Link
                key={atom.id}
                href={`/atom/${atom.id}`}
                className="p-3 flex items-center justify-between hover:bg-surface-2 transition-colors block"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-bold">{atom.id}</span>
                    <span className="text-text font-sans font-semibold text-xs">{atom.title}</span>
                  </div>
                  <p className="text-text-muted font-sans text-xs line-clamp-1">{atom.one_screen}</p>
                </div>
                <span className="text-text-faint text-xs uppercase font-bold shrink-0 ml-4">
                  DEPTH 0 →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 5. CORPUS TRANSPARENCY & STATUS */}
        <section className="space-y-4 border-t border-border pt-8 font-mono text-xs">
          <div className="uppercase tracking-wider text-text-muted font-bold">
            05 // CORPUS TRANSPARENCY & AUDIT
          </div>

          <div className="border border-border bg-surface p-4 rounded-sm space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="border border-border p-2 rounded-sm">
                <div className="text-xs text-text-faint uppercase font-bold">PUBLISHED</div>
                <div className="text-xl font-bold text-rule tabular-nums">{publishedCount}</div>
              </div>
              <div className="border border-border p-2 rounded-sm">
                <div className="text-xs text-text-faint uppercase font-bold">FIXTURES</div>
                <div className="text-xl font-bold text-confuse tabular-nums">{fixtureCount}</div>
              </div>
              <div className="border border-border p-2 rounded-sm">
                <div className="text-xs text-text-faint uppercase font-bold">DRAFTS</div>
                <div className="text-xl font-bold text-accent tabular-nums">{draftCount}</div>
              </div>
              <div className="border border-border p-2 rounded-sm">
                <div className="text-xs text-text-faint uppercase font-bold">UNVERIFIED</div>
                <div className="text-xl font-bold text-trap tabular-nums">73 CLAIMS</div>
              </div>
            </div>

            <p className="text-text-muted font-sans text-xs leading-relaxed">
              Warren publishes its own incompleteness transparently. Unverified claims and fixtures carry unmissable warning banners. Only primary-source human verification allows published atom status.
            </p>
          </div>
        </section>

        {/* 6. FOOTER */}
        <footer className="border-t border-border pt-8 space-y-3 font-mono text-xs text-text-faint">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              Built & maintained by <strong className="text-text">Tharun Gajula</strong>.
            </div>
            <div className="flex items-center gap-4 text-accent">
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
          <p className="text-xs font-sans leading-normal text-text-faint">
            DISCLAIMER: WARREN is an independent technical knowledge reference. No content contained herein constitutes formal financial, legal, statutory, accounting, or professional advice.
          </p>
        </footer>
      </main>
    </div>
  );
}
