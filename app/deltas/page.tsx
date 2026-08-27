"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CorpusManifest, AtomManifestItem } from "@/lib/schema";
import { TypeBadge } from "@/components/TypeBadge";
import { CurrentnessMarker } from "@/components/CurrentnessMarker";

const JURISDICTION_CHIP_STYLES: Record<string, { border: string; text: string; bg: string }> = {
  IN: { border: "border-[#7D5A31]", text: "text-[#7D5A31]", bg: "bg-[#7D5A31]/10" },
  UK: { border: "border-[#315F7D]", text: "text-[#315F7D]", bg: "bg-[#315F7D]/10" },
  EU: { border: "border-[#51518A]", text: "text-[#51518A]", bg: "bg-[#51518A]/10" },
  US: { border: "border-[#6D4545]", text: "text-[#6D4545]", bg: "bg-[#6D4545]/10" },
};

export default function DeltasPage() {
  const [manifest, setManifest] = useState<CorpusManifest | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>("all");
  const [perishableOnly, setPerishableOnly] = useState<boolean>(false);

  useEffect(() => {
    fetch("/corpus-manifest.json")
      .then((res) => res.json())
      .then((data: CorpusManifest) => setManifest(data))
      .catch((err) => console.error("Failed to load manifest:", err));
  }, []);

  if (!manifest) {
    return (
      <div className="p-8 font-mono text-xs text-[#9AA3AD]">
        Loading Delta Register...
      </div>
    );
  }

  const publishedAtoms = Object.values(manifest.atoms).filter(
    (a) => a.status !== "draft"
  );

  // Filter atoms based on domain, jurisdiction, perishable
  const filteredAtoms = publishedAtoms.filter((atom) => {
    if (selectedDomain !== "all" && atom.domain !== selectedDomain) {
      return false;
    }
    if (perishableOnly && !atom.perishable) {
      return false;
    }
    if (selectedJurisdiction !== "all") {
      if (selectedJurisdiction === "universal") {
        if (!atom.jurisdictions.includes("universal")) return false;
      } else {
        if (!atom.jurisdictions.includes(selectedJurisdiction as any)) return false;
      }
    }
    return true;
  });

  const uniqueDomains = Array.from(
    new Set(publishedAtoms.map((a) => a.domain))
  ).sort();

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Top Title Bar */}
      <div className="border-b border-[#23272D] pb-5 font-mono text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#9AA3AD]">
          <Link href="/atoms" className="hover:text-[#C9711F]">
            INDEX
          </Link>
          <span>&gt;</span>
          <span className="text-[#E6E8EB]">DELTA REGISTER</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div>
            <div className="font-mono text-xs text-[#C9711F] uppercase tracking-wider font-bold mb-1">
              JURISDICTION & REGULATORY REGISTER
            </div>
            <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
              Jurisdictional Delta Register
            </h1>
          </div>
          <div className="font-mono text-xs text-[#9AA3AD] tabular-nums bg-[#121417] border border-[#23272D] px-3 py-1.5 rounded-[3px]">
            MATCHING ATOMS: <strong className="text-[#E6E8EB]">{filteredAtoms.length}</strong> / {publishedAtoms.length}
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="border border-[#23272D] bg-[#121417] p-4 rounded-[3px] flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Domain Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[#6B747E] uppercase text-[10px]">DOMAIN:</span>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-[#191C20] border border-[#23272D] text-[#E6E8EB] px-2.5 py-1 rounded-[3px] outline-none cursor-pointer hover:border-[#333940]"
            >
              <option value="all">ALL DOMAINS ({uniqueDomains.length})</option>
              {uniqueDomains.map((dom) => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
          </div>

          {/* Jurisdiction Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[#6B747E] uppercase text-[10px]">JURISDICTION:</span>
            <select
              value={selectedJurisdiction}
              onChange={(e) => setSelectedJurisdiction(e.target.value)}
              className="bg-[#191C20] border border-[#23272D] text-[#C9711F] font-bold px-2.5 py-1 rounded-[3px] outline-none cursor-pointer hover:border-[#333940]"
            >
              <option value="all">ALL JURISDICTIONS</option>
              <option value="universal">UNIVERSAL ONLY</option>
              <option value="IN">INDIA (RBI)</option>
              <option value="UK">UNITED KINGDOM (PRA)</option>
              <option value="EU">EUROPEAN UNION (EBA)</option>
              <option value="US">UNITED STATES (FED)</option>
            </select>
          </div>

          {/* Perishable Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-[#9AA3AD] hover:text-[#E6E8EB]">
            <input
              type="checkbox"
              checked={perishableOnly}
              onChange={(e) => setPerishableOnly(e.target.checked)}
              className="accent-[#C9711F] rounded-[3px] cursor-pointer"
            />
            <span>PERISHABLE REGULATIONS ONLY</span>
          </label>
        </div>

        {/* Reset Filters Button */}
        {(selectedDomain !== "all" || selectedJurisdiction !== "all" || perishableOnly) && (
          <button
            onClick={() => {
              setSelectedDomain("all");
              setSelectedJurisdiction("all");
              setPerishableOnly(false);
            }}
            className="text-[10px] text-[#A6503C] hover:underline uppercase"
          >
            [RESET FILTERS]
          </button>
        )}
      </div>

      {/* Delta Register Table */}
      <div className="border border-[#23272D] bg-[#121417] rounded-[3px] overflow-x-auto max-w-full">
        <table className="w-full text-left font-mono text-xs border-collapse tabular-nums">
          <thead>
            <tr className="border-b border-[#23272D] bg-[#191C20] text-[#6B747E] text-[11px] select-none">
              <th className="py-3 px-4 font-semibold w-24">ATOM ID</th>
              <th className="py-3 px-4 font-semibold">TITLE</th>
              <th className="py-3 px-4 font-semibold w-36">DOMAIN</th>
              <th className="py-3 px-4 font-semibold w-28">TYPE</th>
              <th className="py-3 px-4 font-semibold w-40">VARIANTS</th>
              <th className="py-3 px-4 font-semibold w-32">CURRENTNESS</th>
              <th className="py-3 px-4 font-semibold w-28">AS OF</th>
              <th className="py-3 px-4 font-semibold w-32">REVISION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#23272D]">
            {filteredAtoms.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#6B747E] font-mono">
                  No registered atoms match the selected filters.
                </td>
              </tr>
            ) : (
              filteredAtoms.map((atom) => {
                const variantJurs = atom.jurisdictions.filter((j) => j !== "universal");

                return (
                  <tr
                    key={atom.id}
                    className="hover:bg-[#191C20] transition-colors"
                  >
                    {/* Atom ID */}
                    <td className="py-3 px-4 font-bold text-[#C9711F]">
                      <Link href={`/atom/${atom.id}`} className="hover:underline">
                        {atom.id}
                      </Link>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 font-sans font-medium text-[#E6E8EB]">
                      <Link href={`/atom/${atom.id}`} className="hover:text-[#C9711F] transition-colors">
                        {atom.title}
                      </Link>
                    </td>

                    {/* Domain */}
                    <td className="py-3 px-4 text-[#9AA3AD] text-[11px] truncate">
                      {atom.domain}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4">
                      <TypeBadge type={atom.type} />
                    </td>

                    {/* Jurisdictional Variant Chips */}
                    <td className="py-3 px-4">
                      {variantJurs.length === 0 ? (
                        <span className="text-[#6B747E] text-[10px]">UNIV ONLY</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {variantJurs.map((j) => {
                            const style = JURISDICTION_CHIP_STYLES[j] || JURISDICTION_CHIP_STYLES.IN;
                            return (
                              <span
                                key={j}
                                className={`text-[10px] font-bold px-1.5 py-0.5 border ${style.border} ${style.bg} ${style.text} rounded-[3px]`}
                              >
                                {j}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Currentness Marker */}
                    <td className="py-3 px-4">
                      <CurrentnessMarker status={atom.currentness} />
                    </td>

                    {/* As Of Date */}
                    <td className="py-3 px-4 text-[#9AA3AD] text-[11px]">
                      {atom.as_of || "—"}
                    </td>

                    {/* Next Effective Date */}
                    <td className="py-3 px-4 text-[#C9711F] text-[11px] font-semibold">
                      {atom.next_effective_date || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
