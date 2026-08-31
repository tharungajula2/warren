import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Prefix to Domain Lookup
const PREFIX_DOMAIN_MAP = {
  FND: "foundation",
  CR: "credit-risk",
  IMP: "impairment",
  CAP: "regulatory-capital",
  TLM: "treasury-alm",
  MRM: "model-risk",
  DAT: "risk-data",
  IND: "india-lending",
  BA: "business-analysis",
  TEC: "technical",
  QNT: "quantitative",
};

// Load Manual Annotations if file exists
let manualAnnotations = {};
const ANNOTATIONS_PATH = path.join(process.cwd(), "scripts", "manual-annotations.json");
if (fs.existsSync(ANNOTATIONS_PATH)) {
  try {
    manualAnnotations = JSON.parse(fs.readFileSync(ANNOTATIONS_PATH, "utf-8"));
  } catch (e) {
    console.warn("⚠️ [WARN] Could not parse manual-annotations.json:", e.message);
  }
}

// Parse command line flags
const args = process.argv.slice(2);
let fileName = "01_FND_foundations.md";
let domainOverride = null;
let isWrite = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--file" && args[i + 1]) {
    fileName = args[i + 1];
    i++;
  } else if (arg === "--domain" && args[i + 1]) {
    domainOverride = args[i + 1];
    i++;
  } else if (arg === "--write") {
    isWrite = true;
  } else if (!arg.startsWith("--") && arg.endsWith(".md")) {
    fileName = arg;
  }
}

const IMPORT_FILE_PATH = path.join(process.cwd(), "_import", fileName);
const OUTPUT_DIR = path.join(process.cwd(), "content", "atoms");

if (!fs.existsSync(IMPORT_FILE_PATH)) {
  console.error(`❌ [ERROR] Import file not found at: ${IMPORT_FILE_PATH}`);
  process.exit(1);
}

const rawContent = fs.readFileSync(IMPORT_FILE_PATH, "utf-8");

// ChatGPT Citation Token Stripping Regex
const CITATION_REGEX = /[\s\u00A0]*[^\w\s.,;:!?()'"/\-–—]*cite[^\w\s.,;:!?()'"/\-–—]*(?:turn\d+(?:search|view)\d+|[^\w\s.,;:!?()'"/\-–—])+/gi;

let citationTokenCount = 0;
const cleanedContent = rawContent.replace(CITATION_REGEX, () => {
  citationTokenCount++;
  return "";
});

// Strip any remaining private use area unicode characters (\uE000-\uF8FF, \uDB80-\uDBFF)
const CLEAN_UNICODE_REGEX = /[\uE000-\uF8FF\uDB80-\uDBFF\uD800-\uDFFF]/g;
const sanitizedContent = cleanedContent.replace(CLEAN_UNICODE_REGEX, () => {
  citationTokenCount++;
  return "";
})
  .replace(/^(?<!#\s*)Permanent rule\b/gm, "### Permanent rule")
  .replace(/^(?<!#\s*)Permanent trap\b/gm, "### Permanent trap")
  .replace(/^(?<!#\s*)Never confuse\b/gm, "### Never confuse")
  .replace(/^(?<!#\s*)Jurisdiction variants\b/gm, "### Jurisdiction variants")
  .replace(/^(?<!#\s*)Recall\b/gm, "### Recall")
  .replace(/^(?<!#\s*)Sources\b/gm, "### Sources");

// Split file by `# {N}. {Title}`
const ATOM_HEADER_REGEX = /^#\s+\d+\.\s+(.+)$/gm;
const matches = Array.from(sanitizedContent.matchAll(ATOM_HEADER_REGEX));

if (matches.length === 0) {
  console.error(`❌ [ERROR] No H1 headings matching '# N. Title' found in ${fileName}`);
  process.exit(1);
}

const rawSegments = [];
for (let i = 0; i < matches.length; i++) {
  const currentMatch = matches[i];
  const title = currentMatch[1].trim();
  const startIdx = currentMatch.index + currentMatch[0].length;
  const endIdx = i + 1 < matches.length ? matches[i + 1].index : sanitizedContent.length;

  const body = sanitizedContent.substring(startIdx, endIdx).trim();
  rawSegments.push({ title, body });
}

// Check existing corpus IDs to validate prerequisites
let existingCorpusIds = new Set();
let existingCorpusManifest = null;
const MANIFEST_PATH = path.join(process.cwd(), "public", "corpus-manifest.json");
if (fs.existsSync(MANIFEST_PATH)) {
  try {
    existingCorpusManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
    existingCorpusIds = new Set(Object.keys(existingCorpusManifest.atoms || {}));
  } catch (e) {
    // Ignore manifest read error
  }
}

const parsedAtoms = [];
const sectionStats = {
  Rule: 0,
  Trap: 0,
  NeverConfuse: 0,
  Jurisdiction: 0,
  Recall: 0,
  Sources: 0,
  Flow: 0,
};

const validationWarnings = [];

for (const seg of rawSegments) {
  const lines = seg.body.split(/\r?\n/);

  let id = null;
  let type = "concept";
  let prereqs = [];
  let jurisdictions = ["universal"];
  let metaEndLineIdx = 0;

  // Extract Metadata lines directly beneath header
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const line = lines[i].trim();
    if (line.startsWith("**ID:**")) {
      id = line.replace("**ID:**", "").trim();
      metaEndLineIdx = Math.max(metaEndLineIdx, i);
    } else if (line.startsWith("**Type:**")) {
      const rawType = line.replace("**Type:**", "").trim().toLowerCase();
      const validTypes = new Set(["concept", "mechanism", "procedure", "delta", "example", "reference"]);
      if (validTypes.has(rawType)) {
        type = rawType;
      } else if (rawType.includes("procedure") || rawType.includes("technique")) {
        type = "procedure";
      } else if (rawType.includes("mechanism") || rawType.includes("deliverable")) {
        type = "mechanism";
      } else {
        type = "concept";
      }
      metaEndLineIdx = Math.max(metaEndLineIdx, i);
    } else if (line.startsWith("**Prerequisites:**")) {
      const pStr = line.replace("**Prerequisites:**", "").trim();
      if (pStr.toLowerCase() !== "none" && pStr !== "") {
        prereqs = pStr
          .split(",")
          .map((s) => s.replace(/\s*\([^)]*\)/g, "").trim())
          .filter(Boolean);
      }
      metaEndLineIdx = Math.max(metaEndLineIdx, i);
    } else if (line.startsWith("**Jurisdictions:**")) {
      const jStr = line.replace("**Jurisdictions:**", "").trim();
      if (jStr.toLowerCase().startsWith("no delta") || jStr.toLowerCase() === "universal") {
        jurisdictions = ["universal"];
      } else if (jStr.toLowerCase() !== "none" && jStr !== "") {
        const rawList = jStr.split(",").map((s) => s.trim()).filter(Boolean);
        const validCodes = new Set(["universal", "IN", "UK", "EU", "US"]);
        const mapped = rawList
          .map((j) => (j.toLowerCase() === "basel" ? "universal" : j))
          .filter((j) => validCodes.has(j));
        jurisdictions = mapped.length > 0 ? mapped : ["universal"];
      }
      metaEndLineIdx = Math.max(metaEndLineIdx, i);
    }
  }

  if (!id) {
    validationWarnings.push(`Atom titled "${seg.title}" missing ID metadata line.`);
    continue;
  }

  // Derive domain from ID prefix
  const prefix = id.split("-")[0];
  const domain = domainOverride || PREFIX_DOMAIN_MAP[prefix] || "foundation";

  // Extract one_screen (either > blockquote OR plain prose paragraph)
  let oneScreen = "";
  let bodyLines = lines.slice(metaEndLineIdx + 1);

  const blockquoteLines = [];
  let bqEndIdx = -1;

  for (let i = 0; i < bodyLines.length; i++) {
    const trimmed = bodyLines[i].trim();
    if (trimmed.startsWith(">")) {
      blockquoteLines.push(trimmed.replace(/^>\s*/, ""));
      bqEndIdx = i;
    } else if (blockquoteLines.length > 0 && trimmed === "") {
      break;
    } else if (blockquoteLines.length > 0 && !trimmed.startsWith("###")) {
      blockquoteLines.push(trimmed);
      bqEndIdx = i;
    } else if (trimmed.startsWith("###")) {
      break;
    }
  }

  if (blockquoteLines.length > 0) {
    oneScreen = blockquoteLines.join(" ").trim();
    bodyLines = bodyLines.slice(bqEndIdx + 1);
  } else {
    // Plain prose paragraph extraction
    let proseLines = [];
    let proseEndIdx = -1;
    for (let i = 0; i < bodyLines.length; i++) {
      const trimmed = bodyLines[i].trim();
      if (trimmed.startsWith("###")) {
        break;
      }
      if (trimmed !== "") {
        proseLines.push(trimmed);
        proseEndIdx = i;
      } else if (proseLines.length > 0) {
        break;
      }
    }
    if (proseLines.length > 0) {
      oneScreen = proseLines.join(" ").trim();
      bodyLines = bodyLines.slice(proseEndIdx + 1);
    }
  }

  if (!oneScreen) {
    validationWarnings.push(`Atom "${id}" missing required one_screen text.`);
  }

  const remainingBodyRaw = bodyLines.join("\n").trim();

  // Split into H3 sections: ### Section Title
  const h3Sections = remainingBodyRaw.split(/^###\s+/m);

  let mainProse = h3Sections[0].trim();
  const bodyComponents = [];

  // Helper functions
  const escapeJsx = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\{/g, "&#123;")
      .replace(/\}/g, "&#125;");

  const cleanProse = (text) => {
    if (!text) return "";
    return text
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .join("\n")
      .replace(/\*{4,}|\*\*\s+\*\*/g, "**")
      .trim();
  };

  // 1. Process initial mainProse (before the first ### heading)
  if (mainProse) {
    const flowRegex = /```text\s*\r?\n([\s\S]*?)\r?\n```/g;
    let lastIdx = 0;
    let match;

    while ((match = flowRegex.exec(mainProse)) !== null) {
      const proseBefore = mainProse.substring(lastIdx, match.index);
      const cleanedProse = cleanProse(proseBefore);
      if (cleanedProse) {
        bodyComponents.push(escapeJsx(cleanedProse));
      }

      sectionStats.Flow++;
      const code = match[1];
      const codeLines = code.split(/\r?\n/).map((l) => l.trimEnd());
      const escapedCode = codeLines.map((l) => escapeJsx(l)).join("\n");
      bodyComponents.push("```text\n" + escapedCode + "\n```");

      lastIdx = flowRegex.lastIndex;
    }

    const proseAfter = mainProse.substring(lastIdx);
    const cleanedProseAfter = cleanProse(proseAfter);
    if (cleanedProseAfter) {
      bodyComponents.push(escapeJsx(cleanedProseAfter));
    }
  }

  // 2. Process H3 Sections in document order
  let isPerishable = false;
  let nextEffectiveDate = null;
  const sourcesList = [];

  for (let i = 1; i < h3Sections.length; i++) {
    const sec = h3Sections[i];
    const firstNewline = sec.indexOf("\n");
    const rawSecTitle = (firstNewline === -1 ? sec : sec.substring(0, firstNewline)).trim();
    const secTitle = rawSecTitle.toLowerCase();
    const secBody = (firstNewline === -1 ? "" : sec.substring(firstNewline + 1)).trim();

    if (secTitle.startsWith("flow") || secTitle.includes("formula") || secTitle.includes("where it sits")) {
      if (secTitle.startsWith("flow")) sectionStats.Flow++;
      let blockContent = secBody;
      const codeMatch = secBody.match(/```(?:text)?\s*\r?\n([\s\S]*?)\r?\n```/);
      if (codeMatch) {
        blockContent = codeMatch[1];
      }
      const codeLines = blockContent.split(/\r?\n/).map((l) => l.trimEnd());
      const escapedCode = codeLines.map((l) => escapeJsx(l)).join("\n");
      bodyComponents.push(`### ${rawSecTitle}\n\n\`\`\`text\n${escapedCode}\n\`\`\``);
    } else if (secTitle.includes("jurisdiction variants")) {
      sectionStats.Jurisdiction++;

      function extractNextEffectiveDate(text) {
        if (!text) return null;
        const monthMap = {
          jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
          apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
          aug: "08", august: "08", sep: "09", september: "09", oct: "10", october: "10",
          nov: "11", november: "11", dec: "12", december: "12"
        };
        const dates = [];
        const regex1 = /\b(\d{1,2})\s+([A-Za-z]+)\s+(202[7-9]|203[0-9])\b/g;
        let match;
        while ((match = regex1.exec(text)) !== null) {
          const day = match[1].padStart(2, "0");
          const mStr = match[2].toLowerCase();
          const year = match[3];
          if (monthMap[mStr]) {
            dates.push(`${year}-${monthMap[mStr]}-${day}`);
          }
        }
        const regex2 = /\b(202[7-9]|203[0-9])-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;
        while ((match = regex2.exec(text)) !== null) {
          dates.push(match[0]);
        }
        if (dates.length === 0) return null;
        dates.sort();
        return dates[0];
      }

      if (!secBody.startsWith("**No delta.**")) {
        isPerishable = true;
      }
      const futureDate = extractNextEffectiveDate(secBody);
      if (futureDate) {
        nextEffectiveDate = futureDate;
        isPerishable = true;
      }

      // Format inline country markers onto separate lines for scannability
      let formattedJurisdiction = secBody.replace(/(?<!^)\s*(\*\*(?:IN|UK|EU|US)\*\*)\s*/g, "\n\n$1 ");
      const cleaned = cleanProse(formattedJurisdiction);
      bodyComponents.push(`### ${rawSecTitle}\n\n${escapeJsx(cleaned)}`);
    } else if (secTitle.includes("never confuse")) {
      sectionStats.NeverConfuse++;
      // Prevent Setext H2 heading parsing by ensuring blank lines before/after '---'
      let formattedNeverConfuse = secBody
        .split(/\r?\n/)
        .map((l) => l.trim())
        .join("\n")
        .replace(/\n*---+\n*/g, "\n\n---\n\n");
      const cleaned = cleanProse(formattedNeverConfuse);
      bodyComponents.push(`### ${rawSecTitle}\n\n${escapeJsx(cleaned)}`);
    } else if (secTitle.includes("recall")) {
      sectionStats.Recall++;
      const qLines = secBody.split(/\r?\n/);
      let recallPairs = [];
      let curQ = "";
      let curA = "";
      for (const line of qLines) {
        const trimmed = line.trim();
        if (/^(?:\*\*)?Q:\s*/i.test(trimmed)) {
          if (curQ && curA) {
            recallPairs.push({ q: curQ, a: curA });
            curQ = "";
            curA = "";
          }
          curQ = trimmed.replace(/^(?:\*\*)?Q:\s*\*\*\s*|^(?:\*\*)?Q:\s*/i, "");
        } else if (/^(?:\*\*)?A:\s*/i.test(trimmed)) {
          curA = trimmed.replace(/^(?:\*\*)?A:\s*\*\*\s*|^(?:\*\*)?A:\s*/i, "");
        }
      }
      if (curQ && curA) {
        recallPairs.push({ q: curQ, a: curA });
      }

      if (recallPairs.length > 0) {
        const recallJsx = recallPairs
          .map(
            (pair) =>
              `<Recall\n  q="${cleanProse(pair.q).replace(/"/g, '&quot;')}"\n  a="${cleanProse(pair.a).replace(/"/g, '&quot;')}"\n/>`
          )
          .join("\n\n");
        bodyComponents.push(recallJsx);
      }
    } else if (secTitle.includes("sources")) {
      sectionStats.Sources++;
      const sLines = secBody.split(/\r?\n/);
      for (const sLine of sLines) {
        const trimmed = sLine.trim().replace(/^-\s*/, "");
        if (!trimmed) continue;
        const urlMatch = trimmed.match(/(https?:\/\/[^\s,]+)/);
        const url = urlMatch ? urlMatch[1] : "https://www.bis.org/bcbs/basel3.htm";
        const label = trimmed.replace(url, "").replace(/,\s*accessed.*$/i, "").trim().replace(/,\s*$/, "");
        const accessedMatch = trimmed.match(/accessed\s+([A-Za-z0-9,\s]+)/i);
        const accessed = accessedMatch ? accessedMatch[1].trim() : "August 28, 2026";
        sourcesList.push({ label: label || trimmed, url, accessed });
      }
    } else {
      // All other H3 sections (Permanent rule, Permanent trap, Never confuse, Formula, Core mechanism, Ownership, etc.)
      const cleaned = cleanProse(secBody);
      bodyComponents.push(`### ${rawSecTitle}\n\n${escapeJsx(cleaned)}`);
    }
  }

  let finalMdxBody = bodyComponents.join("\n\n");

  // Re-apply manual annotation if defined for this atom ID (e.g. IND-14)
  if (manualAnnotations[id]) {
    const ann = manualAnnotations[id];
    if (ann.one_screen) oneScreen = ann.one_screen;
    if (ann.prepend_body) {
      finalMdxBody = `${ann.prepend_body}\n\n${finalMdxBody}`;
    }
  }

  // Derive subdomain
  const existingSubdomain = existingCorpusManifest?.atoms?.[id]?.subdomain;
  const subdomain =
    manualAnnotations[id]?.subdomain ||
    existingSubdomain ||
    seg.subdomain ||
    id.toLowerCase().replace(/-\d+$/, "");

  // Estimate reading time
  const existingAsOf = existingCorpusManifest?.atoms?.[id]?.as_of;
  const existingReadingMinutes = existingCorpusManifest?.atoms?.[id]?.reading_minutes;
  const wordCount = (oneScreen + " " + remainingBodyRaw).split(/\s+/).length;
  const readingMinutes = existingReadingMinutes || Math.max(1, Math.ceil(wordCount / 200));

  const frontmatterData = {
    id,
    title: seg.title,
    type,
    domain,
    subdomain,
    one_screen: oneScreen,
    prerequisites: prereqs,
    jurisdictions,
    perishable: isPerishable,
    as_of: isPerishable ? (existingAsOf || "2026-08-30") : null,
    next_effective_date: nextEffectiveDate,
    status: "draft",
    verified: false,
    reading_minutes: readingMinutes,
    sources: sourcesList,
    import_source: fileName,
  };

  const mdxContent = matter.stringify(finalMdxBody + "\n", frontmatterData);
  parsedAtoms.push({ id, fileName: `${id}.mdx`, content: mdxContent });
}

console.log(`\n===========================================================`);
console.log(`WARREN IMPORTER — PACK REPORT: ${fileName}`);
console.log(`===========================================================`);
console.log(`📌 TOTAL ATOMS PARSED: ${parsedAtoms.length}`);
console.log(`✂️ CITATION TOKENS STRIPPED: ${citationTokenCount}`);

if (validationWarnings.length > 0) {
  console.log(`\n⚠️ VALIDATION AUDIT WARNINGS (${validationWarnings.length}):`);
  validationWarnings.slice(0, 10).forEach((w) => console.log(`   - ${w}`));
  if (validationWarnings.length > 10) {
    console.log(`   ... and ${validationWarnings.length - 10} more.`);
  }
}

if (isWrite) {
  console.log(`\n💾 WRITING ${parsedAtoms.length} ATOMS TO ${OUTPUT_DIR}...`);
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const atom of parsedAtoms) {
    const targetPath = path.join(OUTPUT_DIR, atom.fileName);
    fs.writeFileSync(targetPath, atom.content, "utf-8");
  }
  console.log(`✅ ${parsedAtoms.length} ATOMS SUCCESSFULLY WRITTEN TO CORPUS!`);
} else {
  console.log(`\n🔍 [DRY RUN] No files written to disk. Pass '--write' to output MDX files.`);
}
