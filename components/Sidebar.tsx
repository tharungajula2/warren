"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
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
    <aside className="w-70 bg-surface border-r border-border flex flex-col shrink-0 min-h-[calc(100vh-48px)] font-mono text-xs select-none">
      {/* Sidebar Top Header & Tagline */}
      <div className="p-4 border-b border-border space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-accent font-bold text-xs">WARREN ENGINE</span>
          <span className="text-xs bg-surface-2 text-text-muted border border-border px-1.5 py-0.5 rounded-sm">
            CORPUS
          </span>
        </div>
        <p className="text-xs text-text-muted font-sans leading-tight">
          Banking risk, regulation, and the work built on it.
        </p>
      </div>

      {/* Primary Navigation Links */}
      <div className="p-3 border-b border-border space-y-1">
        <Link
          href="/"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
            pathname === "/" ? "bg-surface-2 text-accent font-bold" : "text-text-muted hover:text-text"
          }`}
        >
          <span>HOME OVERVIEW</span>
          <span className="text-xs">→</span>
        </Link>
        <Link
          href="/roles"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
            pathname.startsWith("/role") ? "bg-surface-2 text-accent font-bold" : "text-text-muted hover:text-text"
          }`}
        >
          <span>ROLE FAMILIES</span>
          <span className="text-xs tabular-nums">{manifest?.roles?.length ?? 11}</span>
        </Link>
        <Link
          href="/atoms"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
            pathname === "/atoms" ? "bg-surface-2 text-accent font-bold" : "text-text-muted hover:text-text"
          }`}
        >
          <span>INDEX & ALL ATOMS</span>
          <span className="text-xs">→</span>
        </Link>
        <Link
          href="/deltas"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
            pathname === "/deltas" ? "bg-surface-2 text-accent font-bold" : "text-text-muted hover:text-text"
          }`}
        >
          <span>DELTA REGISTER</span>
          <span className="text-xs">→</span>
        </Link>
        <Link
          href="/currentness"
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
            pathname === "/currentness" ? "bg-surface-2 text-trap font-bold" : "text-text-muted hover:text-text"
          }`}
        >
          <span>CURRENTNESS AUDIT</span>
          <span className="text-xs">→</span>
        </Link>
      </div>

      {/* Domain Navigation Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="text-xs uppercase text-text-faint font-bold tracking-wider px-1">
          DOMAIN KNOWLEDGE TREE
        </div>

        {!manifest ? (
          <div className="text-xs text-text-faint px-1">Loading tree...</div>
        ) : manifest.domainTree.length === 0 ? (
          <div className="space-y-1">
            {["credit-risk", "foundation", "legal-framework", "quantitative", "regulatory", "risk-data"].map((domKey) => (
              <div key={domKey} className="px-2 py-1 bg-surface-2 border border-border rounded-sm text-text-muted text-xs">
                <span className="font-bold uppercase tracking-wider text-accent">{domKey}</span>
                <span className="block text-xs text-text-faint tabular-nums">0 ATOMS INDEXED</span>
              </div>
            ))}
          </div>
        ) : (
          manifest.domainTree.map((domainNode: DomainTreeNode) => {
            const isExpanded = !!expandedDomains[domainNode.domain];

            return (
              <div key={domainNode.domain} className="space-y-1">
                {/* Domain Header Toggle */}
                <button
                  onClick={() => toggleDomain(domainNode.domain)}
                  className="w-full flex items-center justify-between px-2 py-1 bg-surface-2 hover:bg-border border border-border rounded-sm text-text transition-colors text-xs cursor-pointer"
                >
                  <span className="font-bold uppercase tracking-wider text-accent truncate pr-1">
                    {domainNode.domain}
                  </span>
                  <span className="text-text-faint">
                    {isExpanded ? (
                      <ChevronDown size={14} strokeWidth={1.5} className="text-current" />
                    ) : (
                      <ChevronRight size={14} strokeWidth={1.5} className="text-current" />
                    )}
                  </span>
                </button>

                {/* Subdomains & Atom Items */}
                {isExpanded && (
                  <div className="pl-2 border-l border-border ml-1.5 space-y-2 pt-1">
                    {domainNode.subdomains.map((subNode) => {
                      const isUnsorted = subNode.subdomain === "unsorted";
                      const subKey = `${domainNode.domain}:${subNode.subdomain}`;
                      const isSubExpanded = isUnsorted ? !!expandedSubdomains[subKey] : true;

                      return (
                        <div key={subNode.subdomain} className="space-y-1">
                          {isUnsorted ? (
                            <button
                              onClick={() => toggleSubdomain(subKey)}
                              className="w-full flex items-center justify-between text-xs text-confuse font-bold uppercase tracking-wider px-1 py-0.5 bg-surface-2 border border-confuse/30 rounded-sm cursor-pointer"
                            >
                              <span className="tabular-nums">UNSORTED DRAFTS [{subNode.atoms.length}]</span>
                              <span>
                                {isSubExpanded ? (
                                  <ChevronDown size={14} strokeWidth={1.5} className="text-current" />
                                ) : (
                                  <ChevronRight size={14} strokeWidth={1.5} className="text-current" />
                                )}
                              </span>
                            </button>
                          ) : (
                            <div className="text-xs text-text-faint uppercase tracking-wider font-semibold px-1">
                              {subNode.subdomain}
                            </div>
                          )}

                          {isSubExpanded && (
                            <ul className="space-y-0.5">
                              {subNode.atoms.map((atomItem) => {
                                const isCurrent = pathname === `/atom/${atomItem.id}`;
                                const isFixture = atomItem.status === "fixture";

                                return (
                                  <li key={atomItem.id}>
                                    <Link
                                      href={`/atom/${atomItem.id}`}
                                      className={`block px-2 py-1.5 rounded-sm text-[13px] leading-snug transition-colors line-clamp-2 ${
                                        isCurrent
                                          ? "bg-accent-soft text-accent font-bold border border-accent/40"
                                          : "text-text-muted hover:text-text hover:bg-surface-2"
                                      }`}
                                      title={atomItem.title}
                                    >
                                      <span className="text-accent font-bold mr-1">
                                        {atomItem.id}:
                                      </span>
                                      <span>{atomItem.title}</span>
                                      {isFixture && (
                                        <span className="ml-1 text-xs text-confuse font-bold">
                                          [FIXTURE]
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
      <div className="p-3 border-t border-border text-xs text-text-faint flex items-center justify-between">
        <span>PRESS ? FOR SHORTCUTS</span>
        {process.env.NODE_ENV !== "production" && (
          <Link href="/studio" className="text-accent hover:underline font-bold">
            COCKPIT →
          </Link>
        )}
      </div>
    </aside>
  );
}
