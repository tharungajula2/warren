import fs from "fs";
import path from "path";
import Link from "next/link";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { getCorpusManifest } from "@/lib/corpus";
import { MdxRenderer } from "@/components/atom/MdxRenderer";
import { OneScreen } from "@/components/atom/OneScreen";
import { TypeBadge } from "@/components/TypeBadge";
import { CurrentnessMarker } from "@/components/CurrentnessMarker";
import { JurisdictionCode } from "@/components/atom/Delta";

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
  if (!atom) return { title: "Atom Not Found — WARREN" };
  return {
    title: `${atom.id}: ${atom.title} — WARREN`,
    description: atom.one_screen,
  };
}

export default async function AtomPage({ params }: PageProps) {
  const { id } = await params;
  const manifest = getCorpusManifest();
  const atom = manifest.atoms[id];

  if (!atom) {
    notFound();
  }

  const filepath = path.join(process.cwd(), "content", "atoms", atom.filepath);
  if (!fs.existsSync(filepath)) {
    notFound();
  }

  const fileContent = fs.readFileSync(filepath, "utf-8");
  const { content: mdxSource } = matter(fileContent);

  // Depended on by (from reverse index)
  const dependedOnBy = manifest.reverseIndex[id] || [];

  // Parse Table of Contents H2 headings
  const headings = Array.from(mdxSource.matchAll(/^##\s+(.+)$/gm)).map(
    (match) => match[1].trim()
  );

  const nonUniversalJurs = atom.jurisdictions.filter((j) => j !== "universal");
  const hasMultipleVariants = nonUniversalJurs.length >= 1;

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_240px] gap-8 items-start">
        
        {/* LEFT COLUMN (280px, sticky) */}
        <aside className="lg:sticky lg:top-20 space-y-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-2">
          {/* Breadcrumb */}
          <div className="border border-[#23272D] bg-[#121417] p-3 rounded-[3px]">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#6B747E] mb-1">
              LOCATION
            </div>
            <div className="font-mono text-xs text-[#9AA3AD] line-clamp-2 leading-snug">
              <span className="text-[#C9711F]">{atom.domain}</span> &gt;{" "}
              <span className="text-[#E6E8EB]">{atom.subdomain}</span>
            </div>
          </div>

          {/* Full Path Link */}
          <div className="border border-[#23272D] bg-[#121417] p-3 rounded-[3px]">
            <Link
              href={`/path/${atom.id}`}
              className="font-mono text-xs font-bold text-[#C9711F] hover:text-[#E6E8EB] flex items-center justify-between transition-colors"
            >
              <span>FULL PATH TO HERE</span>
              <span className="text-[10px]">→</span>
            </Link>
          </div>

          {/* Prerequisite Trail */}
          <div className="border border-[#23272D] bg-[#121417] p-3 rounded-[3px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#9AA3AD] font-semibold">
                PREREQUISITES
              </span>
              <span className="font-mono text-[10px] text-[#6B747E] tabular-nums">
                DEPTH: {atom.depth}
              </span>
            </div>
            {atom.prerequisites.length === 0 ? (
              <p className="font-mono text-xs text-[#6B747E] italic">
                None (Root Atom)
              </p>
            ) : (
              <ul className="space-y-2 font-mono text-xs">
                {atom.prerequisites.map((prereqId) => {
                  const prereqAtom = manifest.atoms[prereqId];
                  return (
                    <li key={prereqId} className="flex items-start gap-1.5">
                      <span className="text-[#C9711F] font-bold shrink-0">↳</span>
                      <Link
                        href={`/atom/${prereqId}`}
                        className="text-[#9AA3AD] hover:text-[#C9711F] transition-colors line-clamp-2 leading-tight"
                        title={prereqAtom ? prereqAtom.title : prereqId}
                      >
                        <span className="text-[#E6E8EB] font-semibold">{prereqId}:</span>{" "}
                        {prereqAtom ? prereqAtom.title : ""}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Depended On By */}
          <div className="border border-[#23272D] bg-[#121417] p-3 rounded-[3px]">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#9AA3AD] font-semibold mb-2">
              DEPENDED ON BY
            </div>
            {dependedOnBy.length === 0 ? (
              <p className="font-mono text-xs text-[#6B747E] italic">
                No downstream dependents
              </p>
            ) : (
              <ul className="space-y-2 font-mono text-xs">
                {dependedOnBy.map((depId) => {
                  const depAtom = manifest.atoms[depId];
                  return (
                    <li key={depId} className="flex items-start gap-1.5">
                      <span className="text-[#3E7D5A] font-bold shrink-0">↱</span>
                      <Link
                        href={`/atom/${depId}`}
                        className="text-[#9AA3AD] hover:text-[#C9711F] transition-colors line-clamp-2 leading-tight"
                        title={depAtom ? depAtom.title : depId}
                      >
                        <span className="text-[#E6E8EB] font-semibold">{depId}:</span>{" "}
                        {depAtom ? depAtom.title : ""}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* CENTRE COLUMN (max 68ch) */}
        <main className="max-w-[68ch] mx-auto w-full min-w-0">
          {/* Atom Header Block */}
          <div className="border border-[#23272D] bg-[#121417] p-6 rounded-[3px] mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3 font-mono text-xs">
              <span className="bg-[#191C20] border border-[#333940] text-[#C9711F] px-2 py-0.5 rounded-[3px] font-bold">
                {atom.id}
              </span>
              <TypeBadge type={atom.type} />
              <CurrentnessMarker status={atom.currentness} asOf={atom.as_of} />
              <span className="text-[#6B747E] tabular-nums ml-auto">
                {atom.reading_minutes} MIN READ
              </span>
              {atom.status === "draft" && (
                <span className="bg-[#A6503C]/20 border border-[#A6503C] text-[#A6503C] px-2 py-0.5 rounded-[3px] font-bold uppercase">
                  DRAFT ATOM
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-[#E6E8EB] tracking-tight mb-4">
              {atom.title}
            </h1>

            {/* Perishable Stamp */}
            {atom.perishable && (
              <div className="flex flex-wrap items-center gap-3 border-t border-[#23272D] pt-3 mt-4 font-mono text-xs">
                <span className="bg-[#A6503C]/10 text-[#A6503C] border border-[#A6503C]/30 px-2 py-0.5 rounded-[3px] font-semibold">
                  TIME-SENSITIVE REGULATION
                </span>
                {atom.as_of && (
                  <span className="text-[#9AA3AD] tabular-nums">
                    AS OF: <strong className="text-[#E6E8EB]">{atom.as_of}</strong>
                  </span>
                )}
                {atom.next_effective_date && (
                  <span className="text-[#9AA3AD] tabular-nums">
                    REVISION: <strong className="text-[#C9711F]">{atom.next_effective_date}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stale Atom Warning Banner */}
          {atom.currentness === "stale" && (
            <div className="border border-[#A6503C] bg-[#A6503C]/10 p-4 rounded-[3px] mb-6 font-mono text-xs text-[#A6503C] flex items-center gap-3">
              <span className="text-base font-bold">⚠️</span>
              <div>
                <strong className="font-bold uppercase block mb-0.5">UNVERIFIED STALE CONTENT NOTICE</strong>
                This atom was last verified on {atom.as_of} and may no longer reflect current regulatory rules.
              </div>
            </div>
          )}

          {/* Compressed Mental Model (OneScreen rendered automatically ONCE) */}
          <OneScreen text={atom.one_screen} isHeader={true} />

          {/* MDX Body */}
          <article className="mt-6 border-t border-[#23272D] pt-6">
            <MdxRenderer source={mdxSource} />
          </article>

          {/* Sources Section */}
          {atom.sources && atom.sources.length > 0 && (
            <section className="mt-10 border-t border-[#23272D] pt-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#9AA3AD] font-bold mb-3">
                PROVENANCE & SOURCES ({atom.sources.length})
              </h3>
              <ol className="space-y-2 font-mono text-xs">
                {atom.sources.map((src, idx) => (
                  <li
                    key={idx}
                    id={`source-${idx + 1}`}
                    className="flex items-start gap-2 bg-[#121417] p-2.5 border border-[#23272D] rounded-[3px]"
                  >
                    <span className="text-[#C9711F] font-bold">[{idx + 1}]</span>
                    <div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#E6E8EB] hover:text-[#C9711F] hover:underline font-medium"
                      >
                        {src.label}
                      </a>
                      {src.accessed && (
                        <span className="text-[#6B747E] ml-2 tabular-nums">
                          (ACCESSED: {src.accessed})
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </main>

        {/* RIGHT COLUMN (240px, sticky) */}
        <aside className="lg:sticky lg:top-20 space-y-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pl-2">
          {/* Compare Across Jurisdictions Button */}
          {hasMultipleVariants && (
            <div className="border border-[#7D5A31] bg-[#121417] p-3 rounded-[3px]">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#7D5A31] font-bold mb-1.5">
                JURISDICTION MATRIX
              </div>
              <Link
                href={`/compare/${atom.id}`}
                className="font-mono text-xs font-bold text-[#C9711F] hover:text-[#E6E8EB] block flex items-center justify-between transition-colors"
              >
                <span>COMPARE JURISDICTIONS</span>
                <span className="text-[10px]">→</span>
              </Link>
            </div>
          )}

          {/* Table of Contents / Heading Outline */}
          {headings.length > 0 && (
            <div className="border border-[#23272D] bg-[#121417] p-3 rounded-[3px]">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#9AA3AD] font-semibold mb-2">
                ON THIS PAGE
              </div>
              <ul className="space-y-1.5 font-mono text-xs">
                {headings.map((h, i) => (
                  <li key={i} className="text-[#9AA3AD] hover:text-[#E6E8EB] transition-colors truncate">
                    <span className="text-[#6B747E] mr-1">#</span> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* See Also Links */}
          {atom.see_also.length > 0 && (
            <div className="border border-[#23272D] bg-[#121417] p-3 rounded-[3px]">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#9AA3AD] font-semibold mb-2">
                SEE ALSO
              </div>
              <ul className="space-y-1.5 font-mono text-xs">
                {atom.see_also.map((refId) => {
                  const refAtom = manifest.atoms[refId];
                  return (
                    <li key={refId}>
                      <Link
                        href={`/atom/${refId}`}
                        className="text-[#9AA3AD] hover:text-[#C9711F] transition-colors flex items-center gap-1 truncate"
                      >
                        <span className="text-[#C9711F] font-bold">→</span>
                        <span className="text-[#E6E8EB] font-semibold">{refId}:</span>{" "}
                        {refAtom ? refAtom.title : ""}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Contrast With Links */}
          {atom.contrast_with.length > 0 && (
            <div className="border border-[#23272D] bg-[#121417] p-3 rounded-[3px]">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#8A6D2F] font-semibold mb-2">
                CONTRAST WITH
              </div>
              <ul className="space-y-1.5 font-mono text-xs">
                {atom.contrast_with.map((refId) => {
                  const refAtom = manifest.atoms[refId];
                  return (
                    <li key={refId}>
                      <Link
                        href={`/atom/${refId}`}
                        className="text-[#9AA3AD] hover:text-[#8A6D2F] transition-colors flex items-center gap-1 truncate"
                      >
                        <span className="text-[#8A6D2F] font-bold">≠</span>
                        <span className="text-[#E6E8EB] font-semibold">{refId}:</span>{" "}
                        {refAtom ? refAtom.title : ""}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
