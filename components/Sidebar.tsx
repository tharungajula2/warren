"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CorpusManifest, DomainTreeNode } from "@/lib/schema";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [manifest, setManifest] = useState<CorpusManifest | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [expandedSubdomains, setExpandedSubdomains] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/corpus-manifest.json")
      .then((res) => res.json())
      .then((data: CorpusManifest) => {
        setManifest(data);
        const initialDom: Record<string, boolean> = {};
        data.domainTree.slice(0, 3).forEach((d) => {
          initialDom[d.domain] = true;
        });
        setExpandedDomains(initialDom);
      })
      .catch((err) => console.error("Failed to load corpus manifest:", err));
  }, []);

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [domain]: !prev[domain],
    }));
  };

  const toggleSubdomain = (key: string) => {
    setExpandedSubdomains((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isOpen) return null;

  return (
    <aside className="w-[280px] bg-[#121417] border-r border-[#23272D] flex flex-col shrink-0 min-h-[calc(100vh-48px)] font-mono text-xs select-none">
      {/* Sidebar Top Header & Tagline */}
      <div className="p-4 border-b border-[#23272D] space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[#C9711F] font-bold text-xs">WARREN ENGINE</span>
          <span className="text-[10px] bg-[#191C20] text-[#9AA3AD] border border-[#23272D] px-1.5 py-0.5 rounded-[3px]">
            CORPUS
          </span>
        </div>
        <p className="text-[11px] text-[#9AA3AD] font-sans leading-tight">
          Banking risk, regulation, and the work built on it.
        </p>
      </div>

      {/* Primary Navigation Links */}
      <div className="p-3 border-b border-[#23272D] space-y-1">
        <Link
          href="/"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-[3px] transition-colors ${
            pathname === "/" ? "bg-[#191C20] text-[#C9711F] font-bold" : "text-[#9AA3AD] hover:text-[#E6E8EB]"
          }`}
        >
          <span>HOME OVERVIEW</span>
          <span className="text-[10px]">→</span>
        </Link>
        <Link
          href="/compile"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-[3px] transition-colors ${
            pathname === "/compile" ? "bg-[#2A1D10] text-[#C9711F] font-bold" : "text-[#C9711F] hover:underline"
          }`}
        >
          <span>⚡ JD COMPILER</span>
          <span className="text-[10px]">NEW</span>
        </Link>
        <Link
          href="/roles"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-[3px] transition-colors ${
            pathname.startsWith("/role") ? "bg-[#191C20] text-[#C9711F] font-bold" : "text-[#9AA3AD] hover:text-[#E6E8EB]"
          }`}
        >
          <span>ROLE FAMILIES</span>
          <span className="text-[10px]">12</span>
        </Link>
        <Link
          href="/atoms"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-[3px] transition-colors ${
            pathname === "/atoms" ? "bg-[#191C20] text-[#C9711F] font-bold" : "text-[#9AA3AD] hover:text-[#E6E8EB]"
          }`}
        >
          <span>INDEX & ALL ATOMS</span>
          <span className="text-[10px]">→</span>
        </Link>
        <Link
          href="/deltas"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-[3px] transition-colors ${
            pathname === "/deltas" ? "bg-[#191C20] text-[#C9711F] font-bold" : "text-[#9AA3AD] hover:text-[#E6E8EB]"
          }`}
        >
          <span>DELTA REGISTER</span>
          <span className="text-[10px]">→</span>
        </Link>
        <Link
          href="/currentness"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-[3px] transition-colors ${
            pathname === "/currentness" ? "bg-[#191C20] text-[#A6503C] font-bold" : "text-[#9AA3AD] hover:text-[#E6E8EB]"
          }`}
        >
          <span>CURRENTNESS AUDIT</span>
          <span className="text-[10px]">→</span>
        </Link>
      </div>

      {/* Domain Navigation Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="text-[10px] uppercase text-[#6B747E] font-bold tracking-wider px-1">
          DOMAIN KNOWLEDGE TREE
        </div>

        {!manifest ? (
          <div className="text-[11px] text-[#6B747E] px-1">Loading tree...</div>
        ) : (
          manifest.domainTree.map((domainNode: DomainTreeNode) => {
            const isExpanded = !!expandedDomains[domainNode.domain];

            return (
              <div key={domainNode.domain} className="space-y-1">
                {/* Domain Header Toggle */}
                <button
                  onClick={() => toggleDomain(domainNode.domain)}
                  className="w-full flex items-center justify-between px-2 py-1 bg-[#191C20] hover:bg-[#23272D] border border-[#23272D] rounded-[3px] text-[#E6E8EB] transition-colors text-[11px]"
                >
                  <span className="font-bold uppercase tracking-wider text-[#C9711F] truncate pr-1">
                    {domainNode.domain}
                  </span>
                  <span className="text-[#6B747E] font-mono text-[10px]">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </button>

                {/* Subdomains & Atom Items */}
                {isExpanded && (
                  <div className="pl-2 border-l border-[#23272D] ml-1.5 space-y-2 pt-1">
                    {domainNode.subdomains.map((subNode) => {
                      const isUnsorted = subNode.subdomain === "unsorted";
                      const subKey = `${domainNode.domain}:${subNode.subdomain}`;
                      const isSubExpanded = isUnsorted ? !!expandedSubdomains[subKey] : true;

                      return (
                        <div key={subNode.subdomain} className="space-y-1">
                          {isUnsorted ? (
                            <button
                              onClick={() => toggleSubdomain(subKey)}
                              className="w-full flex items-center justify-between text-[10px] text-[#8A6D2F] font-bold uppercase tracking-wider px-1 py-0.5 bg-[#191C20] border border-[#8A6D2F]/30 rounded-[3px]"
                            >
                              <span>UNSORTED DRAFTS [{subNode.atoms.length}]</span>
                              <span>{isSubExpanded ? "▼" : "▶"}</span>
                            </button>
                          ) : (
                            <div className="text-[10px] text-[#6B747E] uppercase tracking-wider font-semibold px-1">
                              {subNode.subdomain}
                            </div>
                          )}

                          {isSubExpanded && (
                            <ul className="space-y-0.5">
                              {subNode.atoms.map((atomItem) => {
                                const isCurrent = pathname === `/atom/${atomItem.id}`;
                                const isFixture = atomItem.status === "fixture";
                                const isDraft = atomItem.status === "draft";

                                return (
                                  <li key={atomItem.id}>
                                    <Link
                                      href={`/atom/${atomItem.id}`}
                                      className={`block px-2 py-1 rounded-[3px] text-[11px] leading-snug transition-colors line-clamp-2 ${
                                        isCurrent
                                          ? "bg-[#2A1D10] text-[#C9711F] font-bold border border-[#C9711F]/40"
                                          : "text-[#9AA3AD] hover:text-[#E6E8EB] hover:bg-[#191C20]"
                                      }`}
                                      title={atomItem.title}
                                    >
                                      <span className="text-[#C9711F] font-bold mr-1">
                                        {atomItem.id}:
                                      </span>
                                      <span>{atomItem.title}</span>
                                      {isFixture && (
                                        <span className="ml-1 text-[9px] text-[#8A6D2F] font-bold">
                                          [FIXTURE]
                                        </span>
                                      )}
                                      {isDraft && (
                                        <span className="ml-1 text-[9px] text-[#C9711F] font-bold">
                                          [DRAFT]
                                        </span>
                                      )}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-[#23272D] text-[10px] text-[#6B747E] flex items-center justify-between">
        <span>PRESS ? FOR SHORTCUTS</span>
        {process.env.NODE_ENV !== "production" && (
          <Link href="/studio" className="text-[#C9711F] hover:underline font-bold">
            COCKPIT →
          </Link>
        )}
      </div>
    </aside>
  );
}
