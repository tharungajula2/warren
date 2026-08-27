import fs from "fs";
import path from "path";
import Link from "next/link";
import { getCorpusManifest } from "@/lib/corpus";

export const metadata = {
  title: "WARREN — Banking Risk & Regulatory Knowledge Map",
  description: "The connected map of banking risk, regulation and the work built on it.",
};

interface DomainInfo {
  title: string;
  description: string;
}

export default function HomePage() {
  const manifest = getCorpusManifest();
  const { atoms, domainTree, roles } = manifest;

  const domainsPath = path.join(process.cwd(), "content", "domains.json");
  let domainDetails: Record<string, DomainInfo> = {};
  if (fs.existsSync(domainsPath)) {
    domainDetails = JSON.parse(fs.readFileSync(domainsPath, "utf-8"));
  }

  const publishedAtoms = Object.values(atoms).filter((a) => a.status !== "draft");

  // 1. DOMAINS: compute atom count for each domain
  const domainRows = domainTree.map((dom) => {
    const domainAtoms = publishedAtoms.filter((a) => a.domain === dom.domain);
    const details = domainDetails[dom.domain] || {
      title: dom.domain,
      description: "Technical standards, risk parameters, and regulatory mandates.",
    };
    return {
      slug: dom.domain,
      title: details.title,
      description: details.description,
      count: domainAtoms.length,
    };
  });

  // 2. START HERE: depth === 0
  const startHereAtoms = publishedAtoms.filter((a) => a.depth === 0);

  // 3. RECENTLY UPDATED: atoms with as_of sorted descending
  const recentlyUpdatedAtoms = publishedAtoms
    .filter((a) => a.as_of)
    .sort((a, b) => {
      const dateA = new Date(a.as_of || 0).getTime();
      const dateB = new Date(b.as_of || 0).getTime();
      return dateB - dateA;
    });

  // 4. TIME-SENSITIVE: perishable === true
  const timeSensitiveAtoms = publishedAtoms.filter((a) => a.perishable);

  return (
    <div className="max-w-[68ch] mx-auto px-4 py-10 space-y-12">
      {/* Top Positioning Line & Quick Compiler Callout */}
      <div className="border-b border-[#23272D] pb-6 space-y-4">
        <p className="text-lg text-[#9AA3AD] font-sans leading-relaxed">
          The connected map of banking risk, regulation and the work built on it.
        </p>

        {/* Primary Action Buttons: Compile & Roles */}
        <div className="flex flex-wrap gap-3 font-mono text-xs pt-1">
          <Link
            href="/compile"
            className="bg-[#C9711F] hover:bg-[#b06118] text-[#0B0C0E] font-bold px-4 py-2 rounded-[3px] transition-colors uppercase"
          >
            COMPILE JOB DESCRIPTION →
          </Link>
          <Link
            href="/roles"
            className="bg-[#191C20] hover:bg-[#23272D] border border-[#23272D] text-[#E6E8EB] font-bold px-4 py-2 rounded-[3px] transition-colors uppercase"
          >
            BROWSE 12 ROLE FAMILIES ({roles.length}) →
          </Link>
        </div>
      </div>

      {/* SECTION 1: DOMAINS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2 font-mono text-xs">
          <h2 className="uppercase tracking-wider text-[#C9711F] font-bold">
            1. DOMAINS ({domainRows.length})
          </h2>
          <span className="text-[#6B747E]">PRIMARY KNOWLEDGE AREAS</span>
        </div>

        <div className="divide-y divide-[#23272D] border border-[#23272D] bg-[#121417] rounded-[3px]">
          {domainRows.map((dom) => (
            <div
              key={dom.slug}
              id={`domain-${dom.slug}`}
              className="p-4 hover:bg-[#191C20] transition-colors"
            >
              <div className="flex items-center justify-between font-mono text-xs mb-1">
                <Link
                  href={`/atoms#domain-${dom.slug}`}
                  className="font-bold text-[#E6E8EB] hover:text-[#C9711F] transition-colors uppercase"
                >
                  {dom.title}
                </Link>
                <span className="text-[#9AA3AD] tabular-nums font-semibold bg-[#191C20] border border-[#23272D] px-2 py-0.5 rounded-[3px]">
                  {dom.count} {dom.count === 1 ? "ATOM" : "ATOMS"}
                </span>
              </div>
              <p className="text-xs text-[#9AA3AD] font-sans leading-normal">
                {dom.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: START HERE (Depth 0 Roots) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2 font-mono text-xs">
          <h2 className="uppercase tracking-wider text-[#3E7D5A] font-bold">
            2. START HERE — ROOT ATOMS ({startHereAtoms.length})
          </h2>
          <span className="text-[#6B747E]">ZERO PREREQUISITE ROOTS</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {startHereAtoms.map((atom) => (
            <Link
              key={atom.id}
              href={`/atom/${atom.id}`}
              className="group block border border-[#23272D] border-l-2 border-l-[#3E7D5A] bg-[#121417] p-4 rounded-[3px] hover:bg-[#191C20] transition-colors"
            >
              <div className="flex items-center justify-between font-mono text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[#3E7D5A] font-bold">{atom.id}</span>
                  <span className="text-[#6B747E]">/</span>
                  <span className="text-[#9AA3AD] font-sans font-semibold group-hover:text-[#C9711F] transition-colors">
                    {atom.title}
                  </span>
                </div>
                <span className="text-[#6B747E] tabular-nums text-[11px]">
                  {atom.reading_minutes} MIN
                </span>
              </div>
              <p className="text-xs text-[#9AA3AD] font-sans line-clamp-2 leading-relaxed">
                {atom.one_screen}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 3: RECENTLY UPDATED */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2 font-mono text-xs">
          <h2 className="uppercase tracking-wider text-[#9AA3AD] font-bold">
            3. RECENTLY UPDATED
          </h2>
          <span className="text-[#6B747E]">AS OF TIMESTAMPS</span>
        </div>

        <div className="divide-y divide-[#23272D] border border-[#23272D] bg-[#121417] rounded-[3px]">
          {recentlyUpdatedAtoms.map((atom) => (
            <Link
              key={atom.id}
              href={`/atom/${atom.id}`}
              className="flex items-center justify-between p-3 hover:bg-[#191C20] transition-colors font-mono text-xs"
            >
              <div className="flex items-center gap-3 truncate pr-4">
                <span className="text-[#C9711F] font-bold shrink-0">{atom.id}</span>
                <span className="text-[#E6E8EB] font-sans font-medium truncate">
                  {atom.title}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[#9AA3AD] tabular-nums">
                <span className="text-[11px] border border-[#23272D] px-2 py-0.5 rounded-[3px] bg-[#191C20]">
                  AS OF: {atom.as_of}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 4: TIME-SENSITIVE (Perishable Regulations) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#23272D] pb-2 font-mono text-xs">
          <h2 className="uppercase tracking-wider text-[#A6503C] font-bold">
            4. TIME-SENSITIVE REGULATION ({timeSensitiveAtoms.length})
          </h2>
          <span className="text-[#6B747E]">HONESTY SIGNAL</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {timeSensitiveAtoms.map((atom) => (
            <Link
              key={atom.id}
              href={`/atom/${atom.id}`}
              className="group block border border-[#23272D] border-l-2 border-l-[#A6503C] bg-[#121417] p-4 rounded-[3px] hover:bg-[#191C20] transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between font-mono text-xs mb-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-[#A6503C]/20 border border-[#A6503C] text-[#A6503C] px-1.5 py-0.5 rounded-[3px] font-bold text-[10px]">
                    PERISHABLE
                  </span>
                  <span className="text-[#C9711F] font-bold">{atom.id}</span>
                  <span className="text-[#E6E8EB] font-sans font-semibold group-hover:text-[#C9711F] transition-colors">
                    {atom.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] tabular-nums text-[#9AA3AD]">
                  <span>AS OF: <strong className="text-[#E6E8EB]">{atom.as_of}</strong></span>
                  {atom.next_effective_date && (
                    <span>REVISION: <strong className="text-[#C9711F]">{atom.next_effective_date}</strong></span>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#9AA3AD] font-sans leading-relaxed">
                {atom.one_screen}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
