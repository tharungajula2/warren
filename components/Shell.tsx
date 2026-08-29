"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ChevronDown } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { ReadingProgressBar } from "./ReadingProgressBar";

export type JurisdictionCode = "universal" | "IN" | "UK" | "EU" | "US";

const JURISDICTION_OPTIONS: { code: JurisdictionCode; label: string }[] = [
  { code: "universal", label: "Universal Core" },
  { code: "IN", label: "India (RBI)" },
  { code: "UK", label: "United Kingdom (PRA)" },
  { code: "EU", label: "European Union (EBA)" },
  { code: "US", label: "United States (Fed/OCC)" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans overflow-x-clip max-w-full">
      {/* 2px Scroll Reading Progress Bar (atom pages) */}
      <ReadingProgressBar />

      {/* Global Keyboard Shortcut Handlers & Overlay */}
      <KeyboardShortcuts />

      {/* TOP BAR (48px fixed height) */}
      <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 sticky top-0 z-40 select-none max-w-full">
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label="Toggle Navigation Sidebar"
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded-sm transition-colors cursor-pointer"
          >
            <Menu size={16} strokeWidth={1.5} className="text-current" />
          </button>

          {/* Product Wordmark (Single version string on screen) */}
          <Link
            href="/"
            className="font-mono text-sm font-bold tracking-wider text-text hover:text-accent transition-colors"
          >
            WARREN <span className="text-accent text-xs">v0.1.0</span>
          </Link>
        </div>

        {/* Task 6: Instrument Controls sharing single baseline, height, and border treatment */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {/* CMDK Search Trigger Button */}
          <button
            ref={searchButtonRef}
            onClick={() => setIsSearchOpen(true)}
            className="h-8 flex items-center gap-2 bg-transparent hover:bg-surface-2 border border-border text-text-muted px-3 rounded-sm transition-colors cursor-pointer"
          >
            <Search size={16} strokeWidth={1.5} className="text-text-faint" />
            <span className="hidden sm:inline">Search corpus</span>
            <kbd className="hidden md:inline-block bg-transparent border border-border-strong text-text-faint text-xs px-1.5 py-0.5 rounded-sm">
              ⌘K
            </kbd>
          </button>

          {/* Jurisdiction Selector Control */}
          <div className="h-8 relative flex items-center bg-transparent border border-border px-2.5 rounded-sm hover:bg-surface-2 transition-colors">
            <select
              value={selectedJur}
              onChange={(e) => setSelectedJur(e.target.value as JurisdictionCode)}
              className="bg-transparent text-text font-mono text-xs pr-5 outline-none cursor-pointer appearance-none"
            >
              {JURISDICTION_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code} className="bg-surface text-text">
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} strokeWidth={1.5} className="text-text-faint absolute right-2 pointer-events-none" />
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (Sidebar + Main Content Area) */}
      <div className="flex-1 flex w-full relative min-w-0">
        {/* Collapsible Sidebar */}
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
