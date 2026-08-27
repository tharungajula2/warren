"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { CorpusManifest } from "@/lib/schema";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { useJurisdiction, ActiveJurisdiction } from "./atom/JurisdictionContext";

interface ShellProps {
  manifest: CorpusManifest;
  children: React.ReactNode;
}

const JURISDICTION_OPTIONS: { value: ActiveJurisdiction; code: string; label: string }[] = [
  { value: "universal", code: "UNIV", label: "Universal" },
  { value: "IN", code: "IN", label: "India (RBI)" },
  { value: "UK", code: "UK", label: "UK (PRA)" },
  { value: "EU", code: "EU", label: "EU (EBA)" },
  { value: "US", code: "US", label: "US (FED)" },
  { value: "all", code: "ALL", label: "Show All" },
];

export function Shell({ manifest, children }: ShellProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);

  const { jurisdiction, setJurisdiction } = useJurisdiction();

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#E6E8EB] flex flex-col selection:bg-[#2A1D10] selection:text-[#C9711F]">
      {/* Top Bar (48px height, sticky top-0, hairline bottom border) */}
      <header className="h-[48px] border-b border-[#23272D] bg-[#121417] px-4 sticky top-0 z-30 flex items-center justify-between font-mono text-xs">
        {/* Left: Wordmark & Mobile Nav Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="lg:hidden p-1 bg-[#191C20] border border-[#23272D] text-[#9AA3AD] hover:text-[#E6E8EB] rounded-[3px]"
            title="Toggle Navigation Menu"
          >
            ☰
          </button>
          <Link
            href="/"
            className="font-bold text-[#C9711F] tracking-widest hover:text-[#E6E8EB] transition-colors uppercase text-sm"
          >
            WARREN
          </Link>
          <span className="hidden sm:inline text-[10px] text-[#6B747E] border-l border-[#23272D] pl-2">
            TECHNICAL OPERATING MANUAL
          </span>
        </div>

        {/* Centre: Search Trigger (⌘K) */}
        <div className="flex-1 max-w-[480px] mx-4">
          <button
            ref={searchTriggerRef}
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-[#0B0C0E] border border-[#23272D] hover:border-[#333940] rounded-[3px] text-[#9AA3AD] hover:text-[#E6E8EB] transition-colors select-none"
          >
            <span className="truncate text-left text-[11px]">
              Search atoms by ID, title, or domain...
            </span>
            <span className="font-mono text-[10px] bg-[#191C20] text-[#6B747E] px-1.5 py-0.5 rounded-[3px] border border-[#23272D] shrink-0 ml-2">
              ⌘K / Ctrl+K
            </span>
          </button>
        </div>

        {/* Right: Global Jurisdiction Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden md:inline text-[10px] text-[#6B747E] uppercase mr-1">
            JURISDICTION:
          </span>
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as ActiveJurisdiction)}
            className="bg-[#191C20] border border-[#23272D] text-[#C9711F] font-bold text-xs px-2 py-1 rounded-[3px] outline-none cursor-pointer hover:border-[#333940]"
          >
            {JURISDICTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#121417] text-[#E6E8EB]">
                {opt.code} — {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex w-full">
        {/* Left Sidebar */}
        <Sidebar
          manifest={manifest}
          isMobileOpen={isMobileNavOpen}
          onMobileClose={() => setIsMobileNavOpen(false)}
        />

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 bg-[#0B0C0E]">
          {children}
        </main>
      </div>

      {/* Command Palette Search Modal */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        triggerRef={searchTriggerRef}
      />
    </div>
  );
}
