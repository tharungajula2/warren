"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { CorpusManifest } from "@/lib/schema";

interface SidebarProps {
  manifest: CorpusManifest;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const COLLAPSED_DOMAINS_COOKIE = "warren_collapsed_domains";
const SIDEBAR_RAIL_COOKIE = "warren_sidebar_collapsed";

export function Sidebar({ manifest, isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});
  const [isRailMode, setIsRailMode] = useState<boolean>(false);

  useEffect(() => {
    // Load collapsed domains cookie
    const savedDomains = Cookies.get(COLLAPSED_DOMAINS_COOKIE);
    if (savedDomains) {
      try {
        setCollapsedDomains(JSON.parse(savedDomains));
      } catch (e) {}
    }
    // Load rail mode cookie
    const savedRail = Cookies.get(SIDEBAR_RAIL_COOKIE);
    if (savedRail === "true") {
      setIsRailMode(true);
    }
  }, []);

  const toggleDomain = (domain: string) => {
    const updated = { ...collapsedDomains, [domain]: !collapsedDomains[domain] };
    setCollapsedDomains(updated);
    Cookies.set(COLLAPSED_DOMAINS_COOKIE, JSON.stringify(updated), { expires: 365, path: "/" });
  };

  const toggleRailMode = () => {
    const nextState = !isRailMode;
    setIsRailMode(nextState);
    Cookies.set(SIDEBAR_RAIL_COOKIE, String(nextState), { expires: 365, path: "/" });
  };

  // Determine current active atom ID from pathname /atom/[id] or /path/[id]
  let currentAtomId = "";
  if (pathname.startsWith("/atom/")) {
    currentAtomId = pathname.replace("/atom/", "").split("/")[0];
  } else if (pathname.startsWith("/path/")) {
    currentAtomId = pathname.replace("/path/", "").split("/")[0];
  }

  // Filter out draft atoms from domain tree
  const { domainTree, atoms } = manifest;

  const contentNode = (
    <div className="h-full flex flex-col justify-between font-mono text-xs select-none">
      {/* Scrollable Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {domainTree.map((domainNode) => {
          const isCollapsed = collapsedDomains[domainNode.domain];

          // Filter out subdomains/atoms that are draft
          const publishedSubdomains = domainNode.subdomains.map((sub) => ({
            ...sub,
            atoms: sub.atoms.filter((a) => atoms[a.id]?.status !== "draft"),
          })).filter((sub) => sub.atoms.length > 0);

          if (publishedSubdomains.length === 0) return null;

          if (isRailMode) {
            return (
              <div key={domainNode.domain} className="flex flex-col items-center py-2 border-b border-[#23272D]">
                <button
                  onClick={() => toggleDomain(domainNode.domain)}
                  className="font-bold text-[#C9711F] hover:text-[#E6E8EB] text-[10px] uppercase tracking-wider"
                  title={domainNode.domain}
                >
                  {domainNode.domain.substring(0, 3)}
                </button>
              </div>
            );
          }

          return (
            <div key={domainNode.domain} className="space-y-2">
              {/* Domain Header Toggle */}
              <button
                onClick={() => toggleDomain(domainNode.domain)}
                className="w-full flex items-center justify-between text-left font-bold text-[#C9711F] hover:text-[#E6E8EB] transition-colors py-1 border-b border-[#23272D]"
              >
                <span className="uppercase text-[11px] tracking-wider truncate">
                  {domainNode.domain}
                </span>
                <span className="text-[10px] text-[#6B747E] ml-1">
                  {isCollapsed ? "[+]" : "[-]"}
                </span>
              </button>

              {/* Subdomains & Atoms */}
              {!isCollapsed && (
                <div className="pl-2 space-y-3">
                  {publishedSubdomains.map((subNode) => (
                    <div key={subNode.subdomain} className="space-y-1">
                      <div className="text-[10px] text-[#6B747E] uppercase tracking-wider font-semibold">
                        {subNode.subdomain}
                      </div>

                      <ul className="space-y-0.5 border-l border-[#23272D] pl-1.5">
                        {subNode.atoms.map((item) => {
                          const atom = atoms[item.id];
                          if (!atom) return null;

                          const isActive = currentAtomId === atom.id;

                          return (
                            <li key={atom.id}>
                              <Link
                                href={`/atom/${atom.id}`}
                                onClick={onMobileClose}
                                className={`group flex items-start gap-1.5 py-1 px-1.5 rounded-[3px] transition-colors ${
                                  isActive
                                    ? "bg-[#2A1D10] text-[#C9711F] font-semibold border-l-2 border-[#C9711F]"
                                    : "text-[#9AA3AD] hover:bg-[#191C20] hover:text-[#E6E8EB]"
                                }`}
                              >
                                <span className="text-[#6B747E] group-hover:text-[#9AA3AD] shrink-0 text-[11px]">
                                  {atom.id}
                                </span>
                                <span className="font-sans text-[12px] line-clamp-2 leading-tight">
                                  {atom.title}
                                </span>
                                {atom.perishable && (
                                  <span
                                    className="text-[#A6503C] text-[10px] font-bold shrink-0 ml-auto"
                                    title="Time-sensitive perishable regulation"
                                  >
                                    ●
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer & Collapse Rail Control */}
      <div className="p-3 border-t border-[#23272D] bg-[#121417] flex items-center justify-between">
        {!isRailMode && (
          <span className="text-[10px] text-[#6B747E] uppercase">
            NAVIGATOR
          </span>
        )}
        <button
          onClick={toggleRailMode}
          className="font-mono text-[10px] px-2 py-1 bg-[#191C20] border border-[#23272D] text-[#9AA3AD] hover:text-[#E6E8EB] hover:border-[#333940] rounded-[3px] ml-auto transition-colors"
          title={isRailMode ? "Expand sidebar to 260px" : "Collapse sidebar to 48px rail"}
        >
          {isRailMode ? "⇥ 260px" : "⇤ RAIL"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col sticky top-12 h-[calc(100vh-3rem)] border-r border-[#23272D] bg-[#0B0C0E] transition-all duration-150 ${
          isRailMode ? "w-[48px]" : "w-[280px]"
        }`}
      >
        {contentNode}
      </aside>

      {/* Mobile Overlay Panel (< 1024px) - No backdrop blur */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex flex-col bg-[#0B0C0E] border-r border-[#23272D] pt-12">
          <div className="px-4 py-2 border-b border-[#23272D] bg-[#121417] flex items-center justify-between font-mono text-xs">
            <span className="text-[#C9711F] font-bold">WARREN NAVIGATION</span>
            <button
              onClick={onMobileClose}
              className="text-[#9AA3AD] hover:text-[#E6E8EB] px-2 py-0.5 bg-[#23272D] rounded-[3px]"
            >
              CLOSE [✕]
            </button>
          </div>
          <div className="flex-1 overflow-y-auto w-full max-w-[320px]">
            {contentNode}
          </div>
        </div>
      )}
    </>
  );
}
