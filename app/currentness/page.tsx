import React from "react";
import Link from "next/link";
import { getCorpusManifest } from "@/lib/corpus";
import { CurrentnessMarker } from "@/components/CurrentnessMarker";
import { TypeBadge } from "@/components/TypeBadge";

export const metadata = {
  title: "Currentness & Trust Audit — WARREN",
  description: "Audit trail of perishable regulations sorted by verification age ascending.",
};

export default function CurrentnessPage() {
  const manifest = getCorpusManifest();
  const publishedAtoms = Object.values(manifest.atoms).filter(
    (a) => a.status !== "draft"
  );

  // Perishable atoms sorted by as_of ascending (oldest unverified first)
  const perishableAtoms = publishedAtoms
    .filter((a) => a.perishable)
    .sort((a, b) => {
      const dateA = new Date(a.as_of || "1970-01-01").getTime();
      const dateB = new Date(b.as_of || "1970-01-01").getTime();
      return dateA - dateB;
    });

  // Stale atoms count
  const staleCount = perishableAtoms.filter((a) => a.currentness === "stale").length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Header */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#9AA3AD]">
          <Link href="/atoms" className="hover:text-[#C9711F]">
            INDEX
          </Link>
          <span>&gt;</span>
          <span className="text-[#E6E8EB]">CURRENTNESS AUDIT</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div>
            <div className="font-mono text-xs text-[#A6503C] uppercase tracking-wider font-bold mb-1">
              TRUST MECHANIC & REGULATORY FRESHNESS
            </div>
            <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
              Perishable Regulation Audit Trail
            </h1>
          </div>
          <div className="font-mono text-xs text-[#9AA3AD] tabular-nums bg-[#121417] border border-[#23272D] px-3 py-1.5 rounded-[3px] space-x-3">
            <span>PERISHABLE: <strong className="text-[#E6E8EB]">{perishableAtoms.length}</strong></span>
            <span>|</span>
            <span>STALE: <strong className="text-[#A6503C]">{staleCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Positioning note */}
      <p className="text-xs text-[#9AA3AD] font-sans">
        Perishable regulations are listed in ascending order of verification date (<strong className="text-[#E6E8EB]">oldest first</strong>). Content older than 365 days is flagged as <strong className="text-[#A6503C]">STALE</strong> and carries a prominent author notice.
      </p>

      {/* Audit Table */}
      <div className="border border-[#23272D] bg-[#121417] rounded-[3px] overflow-x-auto max-w-full">
        <table className="w-full text-left font-mono text-xs border-collapse tabular-nums">
          <thead>
            <tr className="border-b border-[#23272D] bg-[#191C20] text-[#6B747E] text-[11px]">
              <th className="py-3 px-4 font-semibold w-24">ATOM ID</th>
              <th className="py-3 px-4 font-semibold">TITLE</th>
              <th className="py-3 px-4 font-semibold w-36">DOMAIN</th>
              <th className="py-3 px-4 font-semibold w-28">TYPE</th>
              <th className="py-3 px-4 font-semibold w-36">CURRENTNESS</th>
              <th className="py-3 px-4 font-semibold w-32">AS OF DATE</th>
              <th className="py-3 px-4 font-semibold w-36">NEXT REVISION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#23272D]">
            {perishableAtoms.map((atom) => (
              <tr
                key={atom.id}
                className="hover:bg-[#191C20] transition-colors"
              >
                <td className="py-3 px-4 font-bold text-[#C9711F]">
                  <Link href={`/atom/${atom.id}`} className="hover:underline">
                    {atom.id}
                  </Link>
                </td>
                <td className="py-3 px-4 font-sans font-medium text-[#E6E8EB]">
                  <Link href={`/atom/${atom.id}`} className="hover:text-[#C9711F] transition-colors">
                    {atom.title}
                  </Link>
                </td>
                <td className="py-3 px-4 text-[#9AA3AD] text-[11px] truncate">
                  {atom.domain}
                </td>
                <td className="py-3 px-4">
                  <TypeBadge type={atom.type} />
                </td>
                <td className="py-3 px-4">
                  <CurrentnessMarker status={atom.currentness} />
                </td>
                <td className="py-3 px-4 text-[#E6E8EB] font-bold">
                  {atom.as_of || "—"}
                </td>
                <td className="py-3 px-4 text-[#C9711F] font-semibold">
                  {atom.next_effective_date || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
