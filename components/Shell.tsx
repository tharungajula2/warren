"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { ReadingProgressBar } from "./ReadingProgressBar";

export type JurisdictionCode = "universal" | "IN" | "UK" | "EU" | "US";

const JURISDICTION_OPTIONS: { code: JurisdictionCode; label: string; flag: string }[] = [
  { code: "universal", label: "Universal Core", flag: "🌐" },
  { code: "IN", label: "India (RBI)", flag: "🇮🇳" },
  { code: "UK", label: "United Kingdom (PRA)", flag: "🇬🇧" },
  { code: "EU", label: "European Union (EBA)", flag: "🇪🇺" },
  { code: "US", label: "United States (Fed/OCC)", flag: "🇺🇸" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [selectedJur, setSelectedJur] = useState<JurisdictionCode>("universal");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  // On home page, default sidebar to closed for full-bleed edge-to-edge layout
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Return sidebar on non-home routes by default
    if (pathname !== "/") {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleOpenSearch = () => setIsSearchOpen(true);
    window.addEventListener("open-cmdk-search", handleOpenSearch);
    return () => window.removeEventListener("open-cmdk-search", handleOpenSearch);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#E6E8EB] flex flex-col font-sans overflow-x-clip max-w-full">
      {/* 2px Scroll Reading Progress Bar (atom pages) */}
      <ReadingProgressBar />

      {/* Global Keyboard Shortcut Handlers & Overlay */}
      <KeyboardShortcuts />

      {/* TOP BAR (48px fixed height) */}
      <header className="h-[48px] bg-[#121417] border-b border-[#23272D] flex items-center justify-between px-4 sticky top-0 z-40 select-none max-w-full">
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label="Toggle Navigation Sidebar"
            className="p-1.5 text-[#9AA3AD] hover:text-[#E6E8EB] hover:bg-[#191C20] rounded-[3px] transition-colors"
          >
            <span className="font-mono text-sm">☰</span>
          </button>

          {/* Product Wordmark */}
          <Link
            href="/"
            className="font-mono text-sm font-bold tracking-wider text-[#E6E8EB] hover:text-[#C9711F] transition-colors"
          >
            WARREN <span className="text-[#C9711F] text-[10px]">v1.0</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {/* CMDK Search Trigger Button */}
          <button
            ref={searchButtonRef}
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 bg-[#191C20] hover:bg-[#23272D] border border-[#23272D] text-[#9AA3AD] px-3 py-1 rounded-[3px] transition-colors"
          >
            <span>🔍</span>
            <span className="hidden sm:inline">Search Corpus...</span>
            <kbd className="hidden md:inline-block bg-[#0B0C0E] border border-[#333940] text-[#6B747E] text-[10px] px-1.5 py-0.2 rounded-[3px]">
              / or ⌘K
            </kbd>
          </button>

          {/* Global Jurisdiction Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#191C20] border border-[#23272D] px-2 py-1 rounded-[3px]">
            <span className="text-[#6B747E] text-[10px] uppercase hidden sm:inline">
              JURISDICTION:
            </span>
            <select
              value={selectedJur}
              onChange={(e) => setSelectedJur(e.target.value as JurisdictionCode)}
              className="bg-transparent text-[#C9711F] font-bold outline-none cursor-pointer text-xs"
            >
              {JURISDICTION_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code} className="bg-[#121417] text-[#E6E8EB]">
                  {opt.flag} {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (Sidebar + Main Content Area) */}
      <div className="flex-1 flex w-full relative min-w-0">
        {/* Collapsible Sidebar (Hidden on Home / by default for full-bleed graph) */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Primary Page Content Wrapper */}
        <main className="flex-1 min-w-0 max-w-full">
          {children}
        </main>
      </div>

      {/* Command Palette Search Modal */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        triggerRef={searchButtonRef}
      />
    </div>
  );
}
