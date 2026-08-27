"use client";

import React, { useState, useEffect, useRef } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { CorpusManifest, AtomManifestItem } from "@/lib/schema";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function CommandPalette({ isOpen, onClose, triggerRef }: CommandPaletteProps) {
  const [manifest, setManifest] = useState<CorpusManifest | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/corpus-manifest.json")
      .then((res) => res.json())
      .then((data: CorpusManifest) => setManifest(data))
      .catch((err) => console.error("Failed to load corpus manifest:", err));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setSearchQuery("");
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen && triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [isOpen, triggerRef]);

  if (!isOpen || !manifest) return null;

  // Filter out draft atoms
  const publishedAtoms = Object.values(manifest.atoms).filter(
    (atom) => atom.status !== "draft"
  );

  const query = searchQuery.trim().toLowerCase();

  // Search logic with weighted scoring
  const filteredAtoms = publishedAtoms.filter((atom) => {
    if (!query) return true;
    return (
      atom.id.toLowerCase().includes(query) ||
      atom.title.toLowerCase().includes(query) ||
      atom.one_screen.toLowerCase().includes(query) ||
      atom.domain.toLowerCase().includes(query) ||
      atom.subdomain.toLowerCase().includes(query)
    );
  });

  // Sort results by weight match: id > title > one_screen > domain > subdomain
  if (query) {
    filteredAtoms.sort((a, b) => {
      const aId = a.id.toLowerCase().includes(query) ? 5 : 0;
      const bId = b.id.toLowerCase().includes(query) ? 5 : 0;
      const aTitle = a.title.toLowerCase().includes(query) ? 4 : 0;
      const bTitle = b.title.toLowerCase().includes(query) ? 4 : 0;
      const aOne = a.one_screen.toLowerCase().includes(query) ? 3 : 0;
      const bOne = b.one_screen.toLowerCase().includes(query) ? 3 : 0;
      const aDom = a.domain.toLowerCase().includes(query) ? 2 : 0;
      const bDom = b.domain.toLowerCase().includes(query) ? 2 : 0;

      const scoreA = aId + aTitle + aOne + aDom;
      const scoreB = bId + bTitle + bOne + bDom;
      return scoreB - scoreA;
    });
  }

  // Group by domain
  const groupedByDomain: Record<string, AtomManifestItem[]> = {};
  for (const atom of filteredAtoms) {
    if (!groupedByDomain[atom.domain]) {
      groupedByDomain[atom.domain] = [];
    }
    groupedByDomain[atom.domain].push(atom);
  }

  const handleSelectAtom = (id: string) => {
    onClose();
    router.push(`/atom/${id}`);
  };

  const handleSelectDomain = (domainSlug: string) => {
    onClose();
    router.push(`/atoms#domain-${domainSlug}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-none">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[640px] bg-[#121417] border border-[#333940] rounded-[5px] shadow-2xl overflow-hidden z-10 font-mono text-xs">
        <Command label="Search Warren Knowledge System" className="w-full">
          {/* Search Input Bar */}
          <div className="flex items-center border-b border-[#23272D] px-4 py-3 bg-[#191C20]">
            <span className="text-[#C9711F] font-bold mr-3 select-none">🔍</span>
            <Command.Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search atoms by ID, title, domain, or concept..."
              className="w-full bg-transparent text-[#E6E8EB] placeholder-[#6B747E] outline-none font-mono text-xs"
              autoFocus
            />
            <button
              onClick={onClose}
              className="text-[10px] bg-[#23272D] text-[#9AA3AD] hover:text-[#E6E8EB] px-1.5 py-0.5 rounded-[3px] ml-2"
            >
              ESC
            </button>
          </div>

          <Command.List className="max-h-[380px] overflow-y-auto p-2 divide-y divide-[#23272D]/50">
            {filteredAtoms.length === 0 && (
              <Command.Empty className="p-4 text-center text-[#6B747E]">
                No published atoms matched "{searchQuery}"
              </Command.Empty>
            )}

            {/* Empty state: Show top-level domains as entry points */}
            {!query && (
              <div className="mb-3 pb-2 border-b border-[#23272D]">
                <div className="px-2 py-1 text-[10px] uppercase text-[#6B747E] font-bold tracking-wider mb-1">
                  BROWSE DOMAINS
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {manifest.domainTree.map((dom) => (
                    <button
                      key={dom.domain}
                      onClick={() => handleSelectDomain(dom.domain)}
                      className="px-2.5 py-1.5 bg-[#191C20] hover:bg-[#23272D] text-left border border-[#23272D] rounded-[3px] flex items-center justify-between transition-colors"
                    >
                      <span className="text-[#C9711F] font-bold uppercase text-[11px]">
                        {dom.domain}
                      </span>
                      <span className="text-[10px] text-[#6B747E]">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grouped Atom Results */}
            {Object.entries(groupedByDomain).map(([domain, domainAtoms]) => (
              <Command.Group
                key={domain}
                heading={
                  <span className="text-[10px] uppercase tracking-wider text-[#C9711F] font-bold px-2 py-1.5 block select-none">
                    DOMAIN // {domain}
                  </span>
                }
              >
                {domainAtoms.map((atom) => (
                  <Command.Item
                    key={atom.id}
                    value={`${atom.id} ${atom.title} ${atom.one_screen} ${atom.domain} ${atom.subdomain}`}
                    onSelect={() => handleSelectAtom(atom.id)}
                    className="flex items-center justify-between px-3 py-2 rounded-[3px] cursor-pointer hover:bg-[#191C20] aria-selected:bg-[#2A1D10] aria-selected:text-[#C9711F] transition-colors"
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <span className="text-[#6B747E] font-mono text-[11px] font-bold w-16 shrink-0">
                        {atom.id}
                      </span>
                      <span className="text-[#E6E8EB] font-sans font-medium text-xs truncate">
                        {atom.title}
                      </span>
                      {atom.type !== "concept" && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 bg-[#191C20] border border-[#23272D] text-[#9AA3AD] rounded-[3px] shrink-0">
                          {atom.type}
                        </span>
                      )}
                    </div>
                    <span className="text-[#6B747E] font-mono text-[10px] shrink-0">
                      {atom.domain} / {atom.subdomain}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
