import React from "react";
import Link from "next/link";

export const metadata = {
  title: "404 Node Not Found — WARREN",
};

export default function NotFound() {
  return (
    <div className="max-w-[640px] mx-auto px-4 py-20 text-center space-y-6 font-mono text-xs">
      <div className="space-y-2">
        <div className="text-[#C9711F] font-bold text-base uppercase tracking-wider">
          404 // NODE NOT FOUND
        </div>
        <h1 className="text-2xl font-bold text-[#E6E8EB] font-sans tracking-tight">
          Requested Knowledge Atom Does Not Exist
        </h1>
        <p className="text-[#9AA3AD] font-sans text-sm max-w-[50ch] mx-auto">
          The specified atom ID or URL route is not registered in the Warren corpus index.
        </p>
      </div>

      <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="bg-[#C9711F] hover:bg-[#b06118] text-[#0B0C0E] font-bold px-4 py-2 rounded-[3px] transition-colors uppercase"
        >
          RETURN TO HOME OVERVIEW →
        </Link>
        <Link
          href="/atoms"
          className="bg-[#191C20] border border-[#23272D] hover:border-[#333940] text-[#E6E8EB] font-bold px-4 py-2 rounded-[3px] transition-colors uppercase"
        >
          BROWSE ALL ATOMS INDEX →
        </Link>
      </div>
    </div>
  );
}
