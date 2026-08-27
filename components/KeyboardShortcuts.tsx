"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showOverlay, setShowOverlay] = useState(false);
  const [gPending, setGPending] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside inputs, textareas, or contenteditables
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      // Check '?' key
      if (e.key === "?") {
        e.preventDefault();
        setShowOverlay((prev) => !prev);
        return;
      }

      // Check '/' key -> focus search (dispatch custom event or click search button)
      if (e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-cmdk-search"));
        return;
      }

      // Check sequence 'g' then 'x'
      if (e.key.toLowerCase() === "g") {
        setGPending(true);
        clearTimeout(timer);
        timer = setTimeout(() => setGPending(false), 1200);
        return;
      }

      if (gPending) {
        const key = e.key.toLowerCase();
        if (key === "h") {
          e.preventDefault();
          setGPending(false);
          router.push("/");
        } else if (key === "d") {
          e.preventDefault();
          setGPending(false);
          router.push("/deltas");
        } else if (key === "c") {
          e.preventDefault();
          setGPending(false);
          router.push("/compile");
        } else if (key === "a") {
          e.preventDefault();
          setGPending(false);
          router.push("/atoms");
        } else if (key === "r") {
          e.preventDefault();
          setGPending(false);
          router.push("/roles");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [gPending, router]);

  if (!showOverlay) return null;

  return (
    <div
      className="fixed inset-0 bg-[#0B0C0E]/80 backdrop-blur-xs z-[200] flex items-center justify-center p-4 font-mono text-xs"
      onClick={() => setShowOverlay(false)}
    >
      <div
        className="max-w-[480px] w-full bg-[#121417] border border-[#23272D] p-6 rounded-[3px] space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#23272D] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#C9711F] font-bold">⌨ KEYBOARD SHORTCUTS</span>
          </div>
          <button
            onClick={() => setShowOverlay(false)}
            className="text-[#6B747E] hover:text-[#E6E8EB] font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-[#E6E8EB]">
          <div className="flex items-center justify-between py-1 border-b border-[#23272D]/50">
            <span className="text-[#9AA3AD]">Open Command Palette Search</span>
            <kbd className="bg-[#191C20] border border-[#333940] text-[#C9711F] px-2 py-0.5 rounded-[3px]">
              / or ⌘K
            </kbd>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#23272D]/50">
            <span className="text-[#9AA3AD]">Go to Home Page</span>
            <kbd className="bg-[#191C20] border border-[#333940] text-[#E6E8EB] px-2 py-0.5 rounded-[3px]">
              g then h
            </kbd>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#23272D]/50">
            <span className="text-[#9AA3AD]">Go to Delta Register</span>
            <kbd className="bg-[#191C20] border border-[#333940] text-[#E6E8EB] px-2 py-0.5 rounded-[3px]">
              g then d
            </kbd>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#23272D]/50">
            <span className="text-[#9AA3AD]">Go to JD Capability Compiler</span>
            <kbd className="bg-[#191C20] border border-[#333940] text-[#E6E8EB] px-2 py-0.5 rounded-[3px]">
              g then c
            </kbd>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#23272D]/50">
            <span className="text-[#9AA3AD]">Go to All Atoms Index</span>
            <kbd className="bg-[#191C20] border border-[#333940] text-[#E6E8EB] px-2 py-0.5 rounded-[3px]">
              g then a
            </kbd>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[#9AA3AD]">Toggle Shortcuts Overlay</span>
            <kbd className="bg-[#191C20] border border-[#333940] text-[#E6E8EB] px-2 py-0.5 rounded-[3px]">
              ?
            </kbd>
          </div>
        </div>

        <div className="text-center pt-2 text-[10px] text-[#6B747E] border-t border-[#23272D]">
          Press <kbd className="text-[#9AA3AD]">ESC</kbd> or click anywhere to close
        </div>
      </div>
    </div>
  );
}
