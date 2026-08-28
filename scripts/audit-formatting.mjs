import fs from "fs";
import path from "path";

const ATOMS_DIR = path.join(process.cwd(), "content", "atoms");
const files = fs.readdirSync(ATOMS_DIR).filter((f) => f.endsWith(".mdx")).sort();

const TAG_NAMES = ["Flow", "Rule", "Trap", "Delta", "Recall", "NeverConfuse", "Worked", "Formula", "Source"];

const results = {
  A: { name: "A. Component Tag Printed as Literal Escaped Text or Inline with Prose", count: 0, atoms: new Set() },
  B: { name: "B. Flow Block Single Line Collapsed ASCII", count: 0, atoms: new Set() },
  C: { name: "C. Unclosed / Mismatched Component Tags", count: 0, atoms: new Set() },
  D: { name: "D. Component Tag Adjacent to Prose (No Blank Line)", count: 0, atoms: new Set() },
  E: { name: "E. Stray Markdown Artefacts (doubled **, trailing spaces, stray ---, skipped headings)", count: 0, atoms: new Set() },
  F: { name: "F. Empty Component Blocks", count: 0, atoms: new Set() },
  G: { name: "G. Remaining ChatGPT Citation Tokens", count: 0, atoms: new Set() },
};

for (const file of files) {
  const atomId = file.replace(".mdx", "");
  const filePath = path.join(ATOMS_DIR, file);
  const rawContent = fs.readFileSync(filePath, "utf-8");

  // Separate frontmatter from body
  let body = rawContent;
  if (rawContent.startsWith("---")) {
    const parts = rawContent.split(/^---$/m);
    if (parts.length >= 3) {
      body = parts.slice(2).join("---");
    }
  }

  const lines = rawContent.split(/\r?\n/);
  const bodyLines = body.split(/\r?\n/);

  // --- DEFECT A: Literal escaped tags (&lt;Flow&gt;) or tags inline with prose ---
  lines.forEach((line) => {
    // 1) Escaped HTML entity tags (&lt;Tag...&gt;)
    if (/&lt;\/?(Flow|Rule|Trap|Delta|Recall|NeverConfuse|Worked|Formula|Source)\b/i.test(line)) {
      results.A.atoms.add(atomId);
    }
    // 2) Unescaped tag that has prose before or after on the same line
    for (const tag of TAG_NAMES) {
      const openPattern = new RegExp(`^.*?<${tag}\\b`, "i");
      if (openPattern.test(line)) {
        const trimmed = line.trim();
        // If line has text before `<Tag` (not starting with `<Tag`)
        if (!trimmed.startsWith(`<${tag}`)) {
          results.A.atoms.add(atomId);
        }
        // If line contains closing tag or self-closing tag but has text after `>`
        const closeMatch = line.match(new RegExp(`</${tag}>\\s*(.+)$`, "i"));
        if (closeMatch && closeMatch[1].trim() !== "") {
          results.A.atoms.add(atomId);
        }
      }
    }
  });

  // --- DEFECT B: Flow block single line with collapsed ASCII ---
  lines.forEach((line) => {
    if (line.includes("<Flow") || line.includes("&lt;Flow")) {
      const plusDashCount = (line.match(/\+--/g) || []).length;
      const pipeCount = (line.match(/\|/g) || []).length;
      if (plusDashCount > 1 || pipeCount > 1) {
        results.B.atoms.add(atomId);
      }
    }
  });

  // --- DEFECT C: Unclosed or mismatched tags ---
  for (const tag of ["Flow", "Rule", "Trap", "NeverConfuse", "Worked", "Formula"]) {
    const openCount = (body.match(new RegExp(`<${tag}\\b|&lt;${tag}\\b`, "g")) || []).length;
    const closeCount = (body.match(new RegExp(`</${tag}>|&lt;/${tag}&gt;`, "g")) || []).length;
    if (openCount !== closeCount) {
      results.C.atoms.add(atomId);
    }
  }

  // --- DEFECT D: Component tag adjacent to prose with no blank line ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("---")) continue;

    const isBlockOpen = /^<(Flow|Rule|Trap|Delta|Recall|NeverConfuse|Worked|Formula|Source)(\s[^>]*)?>?$/i.test(line);
    const isBlockClose = /^<\/(Flow|Rule|Trap|Delta|Recall|NeverConfuse|Worked|Formula|Source)>$/i.test(line);
    const isSelfClosing = /^<(Recall|Source|Delta)(\s[^>]*)?\/>$/i.test(line);
    const isSelfClosingEnd = /^.*\/>$/i.test(line) && i > 0 && lines[i-1].trim().startsWith("<");

    if (isBlockOpen) {
      // Check previous line (if line starts component, e.g. <Flow> or <Rule...>)
      if (i > 0) {
        const prev = lines[i - 1].trim();
        if (prev !== "" && !prev.startsWith("---") && !/^<\/?(Flow|Rule|Trap|Delta|Recall|NeverConfuse|Worked|Formula|Source)/i.test(prev) && !/^&lt;/.test(prev)) {
          results.D.atoms.add(atomId);
        }
      }
    }
    if (isBlockClose || isSelfClosing || isSelfClosingEnd) {
      // Check next line
      if (i < lines.length - 1) {
        const next = lines[i + 1].trim();
        if (next !== "" && !/^<\/?(Flow|Rule|Trap|Delta|Recall|NeverConfuse|Worked|Formula|Source)/i.test(next) && !/^&lt;/.test(next)) {
          results.D.atoms.add(atomId);
        }
      }
    }
  }

  // --- DEFECT E: Stray markdown artefacts ---
  // 1) Doubled asterisks: **** or ** **
  if (/\*{4,}|\*\*\s+\*\*/.test(body)) {
    results.E.atoms.add(atomId);
  }
  // 2) Trailing double spaces at line ends
  if (bodyLines.some((l) => /\s{2,}$/.test(l) && l.trim() !== "")) {
    results.E.atoms.add(atomId);
  }
  // 3) Stray --- outside NeverConfuse
  let insideNC = false;
  bodyLines.forEach((l) => {
    const trimmed = l.trim();
    if (trimmed.includes("<NeverConfuse") || trimmed.includes("&lt;NeverConfuse")) insideNC = true;
    if (trimmed.includes("</NeverConfuse>") || trimmed.includes("&lt;/NeverConfuse")) insideNC = false;
    if (trimmed === "---" && !insideNC) {
      results.E.atoms.add(atomId);
    }
  });
  // 4) Heading level skips
  let prevLevel = 0;
  bodyLines.forEach((l) => {
    const match = l.match(/^(#{1,6})\s+/);
    if (match) {
      const level = match[1].length;
      if (prevLevel > 0 && level > prevLevel + 1) {
        results.E.atoms.add(atomId);
      }
      prevLevel = level;
    }
  });

  // --- DEFECT F: Empty component blocks ---
  for (const tag of TAG_NAMES) {
    const emptyRegex = new RegExp(`<${tag}[^>]*>\\s*</${tag}>|&lt;${tag}[^&]*&gt;\\s*&lt;/${tag}&gt;`, "gi");
    if (emptyRegex.test(body)) {
      results.F.atoms.add(atomId);
    }
  }

  // --- DEFECT G: Remaining ChatGPT citation tokens ---
  if (/cite[a-z]*turn\d+\w*\d*/i.test(body) || /[\uE000-\uF8FF\uDB80-\uDBFF]/i.test(body)) {
    results.G.atoms.add(atomId);
  }
}

// Set counts
for (const k in results) {
  results[k].count = results[k].atoms.size;
}

console.log("===========================================================");
console.log("WARREN CORPUS FORMATTING DEFECT AUDIT REPORT (384 ATOMS)");
console.log("===========================================================");
for (const [key, val] of Object.entries(results)) {
  const atomList = Array.from(val.atoms);
  console.log(`\n${val.name}`);
  console.log(`Count: ${val.count} / 384 atoms`);
  if (atomList.length > 0) {
    console.log(`Affected Atom IDs (${atomList.length}):`);
    console.log(`[${atomList.join(", ")}]`);
  }
}
