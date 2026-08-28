"use client";

import React, { useState, useEffect } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";

export interface SearchIndexItem {
  id: string;
  title: string;
  domain: string;
  subdomain: string;
  one_screen: string;
  bodyText: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function CommandPalette({ isOpen, onClose, triggerRef }: CommandPaletteProps) {
  const [searchIndex, setSearchIndex] = useState<SearchIndexItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Lazy-load search-index.json on first open
  useEffect(() => {
    if (isOpen && !isLoaded && !isLoading) {
      setIsLoading(true);
      fetch("/search-index.json")
        .then((res) => res.json())
        .then((data: SearchIndexItem[]) => {
          setSearchIndex(data);
          setIsLoaded(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load search index:", err);
          setIsLoading(false);
        });
    }
  }, [isOpen, isLoaded, isLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
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

  if (!isOpen) return null;

  const query = searchQuery.trim().toLowerCase();

  // Filter & score search index items
  const searchResults: Array<{
    item: SearchIndexItem;
    score: number;
    snippet: string | null;
  }> = [];

  if (isLoaded) {
    for (const item of searchIndex) {
      if (!query) {
        searchResults.push({ item, score: 0, snippet: null });
        continue;
      }

      const idMatch = item.id.toLowerCase().includes(query);
      const titleMatch = item.title.toLowerCase().includes(query);
      const oneMatch = item.one_screen.toLowerCase().includes(query);
      const domainMatch = item.domain.toLowerCase().includes(query);
      const subMatch = item.subdomain.toLowerCase().includes(query);

      let bodySnippet: string | null = null;
      let bodyMatch = false;

      const lowerBody = (item.bodyText || "").toLowerCase();
      const bodyIdx = lowerBody.indexOf(query);
      if (bodyIdx !== -1) {
        bodyMatch = true;
        // Extract ~80 char snippet around matched query
        const start = Math.max(0, bodyIdx - 35);
        const end = Math.min(item.bodyText.length, bodyIdx + query.length + 45);
        const rawSnippet = item.bodyText.substring(start, end);
        bodySnippet = (start > 0 ? "..." : "") + rawSnippet + (end < item.bodyText.length ? "..." : "");
      }

      if (idMatch || titleMatch || oneMatch || domainMatch || subMatch || bodyMatch) {
        let score = 0;
        if (idMatch) score += 100;
        if (titleMatch) score += 80;
        if (oneMatch) score += 40;
        if (domainMatch) score += 20;
        if (subMatch) score += 20;
        if (bodyMatch) score += 10;

        searchResults.push({ item, score, snippet: bodySnippet });
      }
    }
  }

  // Sort by weighted score descending
  if (query) {
    searchResults.sort((a, b) => b.score - a.score);
  }

  // Group search results by domain
  const groupedByDomain: Record<
    string,
    Array<{ item: SearchIndexItem; snippet: string | null }>
  > = {};

  for (const res of searchResults) {
    if (!groupedByDomain[res.item.domain]) {
      groupedByDomain[res.item.domain] = [];
    }
    groupedByDomain[res.item.domain].push({ item: res.item, snippet: res.snippet });
  }

  const handleSelectAtom = (id: string) => {
    onClose();
    router.push(`/atom/${id}`);
  };

  // Helper to render text with highlighted matching substring
  const renderHighlightedText = (text: string, term: string) => {
    if (!term) return text;
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const idx = lowerText.indexOf(lowerTerm);
    if (idx === -1) return text;

    const before = text.substring(0, idx);
    const matchStr = text.substring(idx, idx + term.length);
    const after = text.substring(idx + term.length);

    return (
      <>
        {before}
        <mark className="bg-[#C9711F]/30 text-[#C9711F] font-bold rounded-[2px] px-0.5">
          {matchStr}
        </mark>
        {after}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-20 px-4 bg-black/75 backdrop-blur-none">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[680px] bg-[#121417] border border-[#333940] rounded-[5px] shadow-2xl overflow-hidden z-10 font-mono text-xs">
        <Command label="Search Warren Knowledge System" className="w-full">
          {/* Search Input Bar */}
          <div className="flex items-center border-b border-[#23272D] px-4 py-3 bg-[#191C20]">
            <span className="text-[#C9711F] font-bold mr-3 select-none">🔍</span>
            <Command.Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search all 384 atoms by ID, title, domain, or body text..."
              className="w-full bg-transparent text-[#E6E8EB] placeholder-[#6B747E] outline-none font-mono text-xs"
              autoFocus
            />
            <button
              onClick={onClose}
              className="text-[10px] bg-[#23272D] text-[#9AA3AD] hover:text-[#E6E8EB] px-1.5 py-0.5 rounded-[3px] ml-2 shrink-0"
            >
              ESC
            </button>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2 divide-y divide-[#23272D]/50">
            {isLoading && (
              <div className="p-6 text-center text-[#9AA3AD] font-mono text-xs">
                Loading full-text search index (384 atoms)...
              </div>
            )}

            {!isLoading && isLoaded && searchResults.length === 0 && (
              <Command.Empty className="p-6 text-center text-[#6B747E] font-mono text-xs">
                No atoms matched "{searchQuery}"
              </Command.Empty>
            )}

            {/* Grouped Atom Results */}
            {!isLoading &&
              Object.entries(groupedByDomain).map(([domain, domainAtoms]) => (
                <Command.Group
                  key={domain}
                  heading={
                    <span className="text-[10px] uppercase tracking-wider text-[#C9711F] font-bold px-2 py-1.5 block select-none">
                      DOMAIN // {domain}
                    </span>
                  }
                >
                  {domainAtoms.map(({ item, snippet }) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.id} ${item.title} ${item.one_screen} ${item.domain} ${item.subdomain} ${item.bodyText}`}
                      onSelect={() => handleSelectAtom(item.id)}
                      className="px-3 py-2.5 rounded-[3px] cursor-pointer hover:bg-[#191C20] aria-selected:bg-[#2A1D10] aria-selected:text-[#C9711F] transition-colors space-y-1 block"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-[#C9711F] font-mono text-[11px] font-bold shrink-0">
                            {renderHighlightedText(item.id, query)}
                          </span>
                          <span className="text-[#E6E8EB] font-sans font-semibold text-xs truncate">
                            {renderHighlightedText(item.title, query)}
                          </span>
                        </div>
                        <span className="text-[#6B747E] font-mono text-[10px] shrink-0">
                          {item.subdomain}
                        </span>
                      </div>

                      {/* Display matched body snippet or one_screen */}
                      {snippet ? (
                        <div className="text-[#9AA3AD] font-sans text-[11px] leading-tight line-clamp-1 italic bg-[#191C20] p-1.5 rounded-[3px] border border-[#23272D]">
                          "{renderHighlightedText(snippet, query)}"
                        </div>
                      ) : (
                        <p className="text-[#6B747E] font-sans text-[11px] line-clamp-1">
                          {item.one_screen}
                        </p>
                      )}
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
