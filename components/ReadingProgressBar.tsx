"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ReadingProgressBar() {
  const pathname = usePathname();
  const [completion, setCompletion] = useState(0);

  const isAtomPage = pathname.startsWith("/atom/");

  useEffect(() => {
    if (!isAtomPage) return;

    const updateScrollCompletion = () => {
      const currentProgress = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        setCompletion(Number((currentProgress / scrollHeight).toFixed(3)) * 100);
      }
    };

    window.addEventListener("scroll", updateScrollCompletion);
    updateScrollCompletion();

    return () => {
      window.removeEventListener("scroll", updateScrollCompletion);
    };
  }, [isAtomPage]);

  if (!isAtomPage) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] bg-transparent z-[100] pointer-events-none">
      <div
        className="h-full bg-[#C9711F] transition-all duration-75 ease-out"
        style={{ width: `${completion}%` }}
      />
    </div>
  );
}
