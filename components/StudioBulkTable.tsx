"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AtomManifestItem } from "@/lib/schema";

export interface BulkDraftRow {
  id: string;
  title: string;
  type: string;
  wordCount: number;
  readingMinutes: number;
  componentsMatched: string[];
  isPersonal: boolean;
  claimCount: number;
  proposedSubdomain: string;
  prereqCandidates: string[];
  score: number;
  importSource: string;
  hasKnownError?: boolean;
  knownErrorText?: string;
}

interface StudioBulkTableProps {
  rows: BulkDraftRow[];
}

type SortField = "id" | "title" | "wordCount" | "claimCount" | "isPersonal" | "score" | "type";

export function StudioBulkTable({ rows }: StudioBulkTableProps) {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredRows = rows.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.proposedSubdomain.toLowerCase().includes(q)
    );
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    let comparison = 0;
    if (sortField === "id") {
      comparison = a.id.localeCompare(b.id);
    } else if (sortField === "title") {
      comparison = a.title.localeCompare(b.title);
    } else if (sortField === "wordCount") {
      comparison = a.wordCount - b.wordCount;
    } else if (sortField === "claimCount") {
      comparison = a.claimCount - b.claimCount;
    } else if (sortField === "isPersonal") {
      comparison = (a.isPersonal ? 1 : 0) - (b.isPersonal ? 1 : 0);
    } else if (sortField === "score") {
      comparison = a.score - b.score;
    } else if (sortField === "type") {
      comparison = a.type.localeCompare(b.type);
    }

    return sortAsc ? comparison : -comparison;
  });

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Search & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#191C20] p-3 border border-[#23272D] rounded-[3px]">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <span className="text-[#6B747E] font-bold text-[11px]">FILTER:</span>
          <input
            type="text"
            placeholder="Search draft title, ID, or subdomain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121417] border border-[#23272D] focus:border-[#C9711F] text-[#E6E8EB] px-2.5 py-1 rounded-[3px] outline-none text-xs"
          />
        </div>

        <div className="flex items-center gap-2 text-[#9AA3AD] text-[11px]">
          <span>SORTING BY:</span>
          <span className="text-[#C9711F] font-bold uppercase">{sortField} ({sortAsc ? "ASC ▲" : "DESC ▼"})</span>
        </div>
      </div>

      {/* Bulk Draft Table */}
      <div className="border border-[#23272D] bg-[#121417] rounded-[3px] overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#191C20] border-b border-[#23272D] text-[#6B747E] font-bold uppercase tracking-wider select-none">
              <th
                onClick={() => handleSort("id")}
                className="p-3 cursor-pointer hover:text-[#E6E8EB] transition-colors"
              >
                ATOM ID {sortField === "id" && (sortAsc ? "▲" : "▼")}
              </th>
              <th
                onClick={() => handleSort("title")}
                className="p-3 cursor-pointer hover:text-[#E6E8EB] transition-colors"
              >
                TITLE {sortField === "title" && (sortAsc ? "▲" : "▼")}
              </th>
              <th
                onClick={() => handleSort("score")}
                className="p-3 cursor-pointer hover:text-[#E6E8EB] transition-colors text-center"
              >
                SCORE {sortField === "score" && (sortAsc ? "▲" : "▼")}
              </th>
              <th
                onClick={() => handleSort("wordCount")}
                className="p-3 cursor-pointer hover:text-[#E6E8EB] transition-colors text-right"
              >
                WORDS {sortField === "wordCount" && (sortAsc ? "▲" : "▼")}
              </th>
              <th className="p-3">COMPONENTS</th>
              <th
                onClick={() => handleSort("isPersonal")}
                className="p-3 cursor-pointer hover:text-[#E6E8EB] transition-colors text-center"
              >
                FLAG {sortField === "isPersonal" && (sortAsc ? "▲" : "▼")}
              </th>
              <th
                onClick={() => handleSort("claimCount")}
                className="p-3 cursor-pointer hover:text-[#E6E8EB] transition-colors text-center"
              >
                CLAIMS {sortField === "claimCount" && (sortAsc ? "▲" : "▼")}
              </th>
              <th className="p-3">PROPOSED SUBDOMAIN</th>
              <th className="p-3">SUGGESTED PREREQS</th>
              <th className="p-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#23272D] font-mono">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-[#6B747E]">
                  No matching draft atoms found.
                </td>
              </tr>
            ) : (
              sortedRows.map((r) => (
                <tr key={r.id} className="hover:bg-[#191C20]/80 transition-colors">
                  <td className="p-3 text-[#C9711F] font-bold font-mono whitespace-nowrap">
                    {r.id}
                  </td>
                  <td className="p-3 font-sans text-xs text-[#E6E8EB] max-w-[260px]">
                    <div className="font-semibold line-clamp-1 flex items-center gap-1.5">
                      <span>{r.title}</span>
                      {r.hasKnownError && (
                        <span className="bg-[#3D1414] text-[#F87171] border border-[#F87171]/40 px-1.5 py-0.2 text-[9px] font-mono font-bold rounded-[3px] shrink-0" title={r.knownErrorText || "KNOWN ERROR FLAGGED"}>
                          ⚠️ KNOWN ERROR
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#6B747E] truncate font-mono" title={r.importSource}>
                      {r.importSource}
                    </div>
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className="bg-[#2A1D10] text-[#C9711F] border border-[#C9711F]/30 px-1.5 py-0.5 rounded-[3px] font-bold text-[10px]">
                      {r.score}/6
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums text-[#9AA3AD]">
                    {r.wordCount}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {r.componentsMatched.length === 0 ? (
                        <span className="text-[#6B747E] text-[10px]">Prose</span>
                      ) : (
                        r.componentsMatched.map((c, i) => (
                          <span
                            key={i}
                            className="bg-[#191C20] border border-[#23272D] text-[#9AA3AD] text-[9px] px-1 py-0.2 rounded-[3px]"
                          >
                            {c}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    {r.isPersonal ? (
                      <span className="bg-[#A6503C]/20 border border-[#A6503C] text-[#A6503C] text-[9px] font-bold px-1.5 py-0.5 rounded-[3px]">
                        PERSONAL ⚠️
                      </span>
                    ) : (
                      <span className="text-[#3E7D5A] text-[10px]">Clean</span>
                    )}
                  </td>
                  <td className="p-3 text-center tabular-nums">
                    {r.claimCount > 0 ? (
                      <span className="text-[#8A6D2F] font-bold bg-[#8A6D2F]/10 border border-[#8A6D2F]/30 px-1.5 py-0.5 rounded-[3px]">
                        {r.claimCount}
                      </span>
                    ) : (
                      <span className="text-[#6B747E]">0</span>
                    )}
                  </td>
                  <td className="p-3">
                    <code className="text-[#E6E8EB] bg-[#191C20] border border-[#23272D] px-1.5 py-0.5 rounded-[3px] text-[10px]">
                      {r.proposedSubdomain}
                    </code>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {r.prereqCandidates.length === 0 ? (
                        <span className="text-[#6B747E] text-[10px]">None</span>
                      ) : (
                        r.prereqCandidates.map((p, i) => (
                          <span
                            key={i}
                            className="bg-[#315F7D]/10 border border-[#315F7D] text-[#315F7D] font-bold text-[9px] px-1 py-0.2 rounded-[3px]"
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Link
                      href={`/atom/${r.id}`}
                      className="text-[#C9711F] hover:underline font-bold"
                    >
                      OPEN →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
