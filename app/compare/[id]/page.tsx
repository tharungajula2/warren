import fs from "fs";
import path from "path";
import Link from "next/link";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { getCorpusManifest } from "@/lib/corpus";
import { MdxRenderer } from "@/components/atom/MdxRenderer";
import { JurisdictionCode } from "@/components/atom/Delta";
import { TypeBadge } from "@/components/TypeBadge";

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
    title: `Jurisdiction Comparison: ${atom.id} — WARREN`,
    description: `Side-by-side cross-jurisdictional analysis for ${atom.id}: ${atom.title}`,
  };
}

const JURISDICTION_CONFIG: Record<
  JurisdictionCode,
  { label: string; name: string; border: string; text: string; bg: string }
> = {
  IN: {
    label: "INDIA (RBI)",
    name: "India",
    border: "border-[#7D5A31]",
    text: "text-[#7D5A31]",
    bg: "bg-[#7D5A31]/10",
  },
  UK: {
    label: "UNITED KINGDOM (PRA)",
    name: "United Kingdom",
    border: "border-[#315F7D]",
    text: "text-[#315F7D]",
    bg: "bg-[#315F7D]/10",
  },
  EU: {
    label: "EUROPEAN UNION (EBA)",
    name: "European Union",
    border: "border-[#51518A]",
    text: "text-[#51518A]",
    bg: "bg-[#51518A]/10",
  },
  US: {
    label: "UNITED STATES (FED)",
    name: "United States",
    border: "border-[#6D4545]",
    text: "text-[#6D4545]",
    bg: "bg-[#6D4545]/10",
  },
};

export default async function ComparePage({ params }: PageProps) {
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

  // Extract <Delta j="X"> blocks from MDX body using regex
  const deltaBlocks: Record<JurisdictionCode, string | null> = {
    IN: null,
    UK: null,
    EU: null,
    US: null,
  };

  const deltaRegex = /<Delta\s+j=["'](IN|UK|EU|US)["']\s*>([\s\S]*?)<\/Delta>/g;
  let match;
  while ((match = deltaRegex.exec(mdxSource)) !== null) {
    const jur = match[1] as JurisdictionCode;
    deltaBlocks[jur] = match[2].trim();
  }

  // Common universal core (MDX body with <Delta> blocks stripped out)
  const universalCoreMdx = mdxSource.replace(/<Delta[\s\S]*?<\/Delta>/g, "").trim();

  const jurisdictions: JurisdictionCode[] = ["IN", "UK", "EU", "US"];

  return (
    <div className="max-w-[1366px] mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Top Header & Navigation */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#9AA3AD]">
          <Link href="/atoms" className="hover:text-[#C9711F]">
            INDEX
          </Link>
          <span>&gt;</span>
          <Link href={`/atom/${atom.id}`} className="text-[#C9711F] font-bold">
            {atom.id}
          </Link>
          <span>&gt;</span>
          <span className="text-[#E6E8EB]">JURISDICTION COMPARISON</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#C9711F] font-bold text-sm">{atom.id}</span>
              <TypeBadge type={atom.type} />
            </div>
            <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
              Cross-Jurisdiction Matrix: {atom.title}
            </h1>
          </div>

          <Link
            href={`/atom/${atom.id}`}
            className="font-mono text-xs text-[#C9711F] border border-[#C9711F] px-3 py-1.5 rounded-[3px] hover:bg-[#2A1D10] transition-colors"
          >
            ← BACK TO ATOM
          </Link>
        </div>
      </div>

      {/* Universal Common Core */}
      <section className="border border-[#23272D] bg-[#121417] p-6 rounded-[3px] space-y-3">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2 font-mono text-xs">
          <span className="text-[#3E7D5A] font-bold uppercase tracking-wider">
            UNIVERSAL COMMON CORE (JURISDICTION-AGNOSTIC BASELINE)
          </span>
          <span className="text-[#6B747E]">BASE TREATMENT</span>
        </div>
        <div className="prose-warren text-sm leading-relaxed text-[#E6E8EB]">
          <MdxRenderer source={universalCoreMdx} />
        </div>
      </section>

      {/* Cross-Jurisdiction 4-Column Grid (Desktop) / Accordion (Mobile) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2 font-mono text-xs">
          <h2 className="uppercase tracking-wider text-[#C9711F] font-bold">
            JURISDICTIONAL VARIANTS MATRIX
          </h2>
          <span className="text-[#6B747E] tabular-nums">
            4 JURISDICTIONS EVALUATED
          </span>
        </div>

        {/* Desktop Grid (4 Columns) */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4 items-start">
          {jurisdictions.map((jur) => {
            const config = JURISDICTION_CONFIG[jur];
            const content = deltaBlocks[jur];
            const hasVariant = content !== null;

            return (
              <div
                key={jur}
                className={`border border-[#23272D] border-t-4 ${
                  hasVariant ? config.border : "border-t-[#333940]"
                } bg-[#121417] p-4 rounded-[3px] space-y-4 h-full flex flex-col justify-between`}
              >
                <div>
                  {/* Column Header Chip */}
                  <div className="flex items-center justify-between border-b border-[#23272D] pb-2 mb-3">
                    <span className={`font-mono text-xs font-bold ${config.text}`}>
                      {config.label}
                    </span>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[3px] ${config.bg} ${config.text} font-bold`}
                    >
                      {jur}
                    </span>
                  </div>

                  {/* Variant Content */}
                  {hasVariant ? (
                    <div className="text-xs font-sans text-[#E6E8EB] leading-relaxed space-y-2">
                      <MdxRenderer source={content} />
                    </div>
                  ) : (
                    <div className="border border-[#23272D] bg-[#191C20] p-3 rounded-[3px] font-mono text-xs text-[#9AA3AD] leading-relaxed">
                      <span className="text-[#6B747E] font-bold block mb-1">NO {jur} VARIANT</span>
                      No {config.name} specific variant recorded for this atom. The universal baseline treatment applies.
                    </div>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="border-t border-[#23272D] pt-3 font-mono text-[10px] text-[#6B747E] flex items-center justify-between tabular-nums">
                  <span>STATUS: {hasVariant ? "RECORDED" : "UNMODIFIED"}</span>
                  {atom.as_of && <span>AS OF: {atom.as_of}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Accordion (< 1024px) */}
        <div className="lg:hidden space-y-3">
          {jurisdictions.map((jur) => {
            const config = JURISDICTION_CONFIG[jur];
            const content = deltaBlocks[jur];
            const hasVariant = content !== null;

            return (
              <details
                key={jur}
                className={`group border border-[#23272D] border-l-4 ${
                  hasVariant ? config.border : "border-l-[#333940]"
                } bg-[#121417] p-4 rounded-[3px]`}
                open={hasVariant}
              >
                <summary className="font-mono text-xs font-bold flex items-center justify-between cursor-pointer outline-none select-none">
                  <span className={config.text}>{config.label}</span>
                  <span className="text-[#6B747E] text-[10px]">
                    {hasVariant ? "[VARIANT RECORDED]" : "[NO VARIANT]"}
                  </span>
                </summary>
                <div className="mt-3 pt-3 border-t border-[#23272D] text-xs font-sans text-[#E6E8EB] leading-relaxed">
                  {hasVariant ? (
                    <MdxRenderer source={content} />
                  ) : (
                    <p className="text-[#9AA3AD] italic font-mono">
                      No {config.name} specific variant recorded for this atom. The universal baseline treatment applies.
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
