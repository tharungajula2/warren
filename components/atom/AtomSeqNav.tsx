"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AtomSeqNavProps {
  prevId: string | null;
  nextId: string | null;
}

export function AtomSeqNav({ prevId, nextId }: AtomSeqNavProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key.toLowerCase() === "j" || e.key === "ArrowRight") {
        if (nextId) {
          e.preventDefault();
          router.push(`/atom/${nextId}`);
        }
      } else if (e.key.toLowerCase() === "k" || e.key === "ArrowLeft") {
        if (prevId) {
          e.preventDefault();
          router.push(`/atom/${prevId}`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevId, nextId, router]);

  return null;
}
