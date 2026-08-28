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
  TRD: "traded-products",
  CCR: "counterparty-risk",
  MRK: "market-risk",
  OPR: "operational-risk",
  MRM: "model-risk",
  DAT: "risk-data",
  AML: "financial-crime",
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
const MANIFEST_PATH = path.join(process.cwd(), "public", "corpus-manifest.json");
if (fs.existsSync(MANIFEST_PATH)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
    existingCorpusIds = new Set(Object.keys(manifest.atoms || {}));
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

  // Extract one_screen blockquote (lines starting with >)
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

  oneScreen = blockquoteLines.join(" ").trim();
  if (bqEndIdx !== -1) {
    bodyLines = bodyLines.slice(bqEndIdx + 1);
  }

  const remainingBodyRaw = bodyLines.join("\n").trim();

  // Split into H3 sections: ### Section Title
  const h3Sections = remainingBodyRaw.split(/^###\s+/m);

  let mainProse = h3Sections[0].trim();
  let ruleContent = "";
  let trapContent = "";
  let neverConfuseContent = "";
  let neverConfuseA = "";
  let neverConfuseB = "";
  let jurisdictionContent = "";
  let recallPairs = [];
  let sourcesList = [];
  let isPerishable = false;
  let nextEffectiveDate = null;

  for (let i = 1; i < h3Sections.length; i++) {
    const sec = h3Sections[i];
    const firstNewline = sec.indexOf("\n");
    const secTitle = (firstNewline === -1 ? sec : sec.substring(0, firstNewline)).trim().toLowerCase();
    const secBody = (firstNewline === -1 ? "" : sec.substring(firstNewline + 1)).trim();

    if (secTitle.includes("permanent rule")) {
      ruleContent = secBody;
      sectionStats.Rule++;
    } else if (secTitle.includes("permanent trap")) {
      trapContent = secBody;
      sectionStats.Trap++;
    } else if (secTitle.includes("never confuse")) {
      // Split on --- or double newline
      const parts = secBody.split(/---+/).map((p) => p.trim());
      if (parts.length >= 2) {
        const matchA = parts[0].match(/^\*\*([^*]+)\*\*/);
        const matchB = parts[1].match(/^\*\*([^*]+)\*\*/);
        neverConfuseA = matchA ? matchA[1] : "Concept A";
        neverConfuseB = matchB ? matchB[1] : "Concept B";
        neverConfuseContent = secBody;
      } else {
        neverConfuseContent = secBody;
      }
      sectionStats.NeverConfuse++;
    } else if (secTitle.includes("jurisdiction variants")) {
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

      jurisdictionContent = secBody;
      if (!secBody.startsWith("**No delta.**")) {
        isPerishable = true;
      }
      const futureDate = extractNextEffectiveDate(secBody);
      if (futureDate) {
        nextEffectiveDate = futureDate;
        isPerishable = true;
      }
      sectionStats.Jurisdiction++;
    } else if (secTitle.includes("recall")) {
      const qLines = secBody.split(/\r?\n/);
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
      sectionStats.Recall++;
    } else if (secTitle.includes("sources")) {
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
      sectionStats.Sources++;
    }
  }

  // Function to escape JSX special characters (<, >, &, {, }) in text content
  const escapeJsx = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\{/g, "&#123;")
      .replace(/\}/g, "&#125;");

  // Helper to clean prose text: trim line ends and clean doubled asterisks
  const cleanProse = (text) => {
    if (!text) return "";
    return text
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .join("\n")
      .replace(/\*{4,}|\*\*\s+\*\*/g, "**")
      .trim();
  };

  // Assemble MDX Body Component Structure
  const bodyComponents = [];

  // Parse mainProse for ```text ... ``` code blocks to convert them to <Flow> components cleanly
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
      const code = match[1]; // keep original code with newlines intact!
      const codeLines = code.split(/\r?\n/).map((l) => l.trimEnd());
      const escapedCode = codeLines.map((l) => escapeJsx(l)).join("\n");
      bodyComponents.push(`<Flow>\n${escapedCode}\n</Flow>`);

      lastIdx = flowRegex.lastIndex;
    }

    const proseAfter = mainProse.substring(lastIdx);
    const cleanedProseAfter = cleanProse(proseAfter);
    if (cleanedProseAfter) {
      bodyComponents.push(escapeJsx(cleanedProseAfter));
    }
  }

  if (ruleContent) {
    const cleaned = cleanProse(ruleContent);
    bodyComponents.push(`<Rule label="PERMANENT RULE">\n${escapeJsx(cleaned)}\n</Rule>`);
  }

  if (trapContent) {
    const cleaned = cleanProse(trapContent);
    bodyComponents.push(`<Trap label="PERMANENT TRAP">\n${escapeJsx(cleaned)}\n</Trap>`);
  }

  if (neverConfuseContent) {
    const cleaned = cleanProse(neverConfuseContent);
    if (neverConfuseA && neverConfuseB) {
      bodyComponents.push(
        `<NeverConfuse a="${escapeJsx(neverConfuseA.trim())}" b="${escapeJsx(neverConfuseB.trim())}">\n${escapeJsx(cleaned)}\n</NeverConfuse>`
      );
    } else {
      bodyComponents.push(`<NeverConfuse>\n${escapeJsx(cleaned)}\n</NeverConfuse>`);
    }
  }

  if (jurisdictionContent) {
    const cleaned = cleanProse(jurisdictionContent);
    if (cleaned.startsWith("**No delta.**")) {
      bodyComponents.push(`<Rule label="NO DELTA">\n${escapeJsx(cleaned)}\n</Rule>`);
    } else {
      const jLines = cleaned.split(/\r?\n/);
      let jBlocks = [];
      for (const jLine of jLines) {
        const match = jLine.match(/^\*\*(IN|UK|EU|US)\*\*\s*(.+)$/);
        if (match) {
          jBlocks.push(`<Delta j="${match[1]}">\n${escapeJsx(match[2].trim())}\n</Delta>`);
        } else if (jLine.trim()) {
          jBlocks.push(escapeJsx(jLine.trim()));
        }
      }
      bodyComponents.push(jBlocks.join("\n\n"));
    }
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

  let finalMdxBody = bodyComponents.join("\n\n");

  // Re-apply manual annotation if defined for this atom ID (e.g. IND-14)
  if (manualAnnotations[id]) {
    const ann = manualAnnotations[id];
    if (ann.prepend_body) {
      finalMdxBody = ann.prepend_body + "\n\n" + finalMdxBody;
    }
    if (ann.append_body) {
      finalMdxBody = finalMdxBody + "\n\n" + ann.append_body;
    }
  }

  // Word count & reading minutes
  const cleanText = (oneScreen + " " + finalMdxBody).replace(/<[^>]+>/g, "").trim();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  function inferSubdomain(atomId) {
    const [prefix, numStr] = atomId.split("-");
    const num = parseInt(numStr, 10);

    if (prefix === "FND") {
      if (num <= 5) return "bank-mechanics";
      if (num <= 10) return "financial-statements";
      if (num <= 14) return "time-value";
      if (num <= 19) return "risk-language";
      return "governance";
    }

    if (prefix === "CR") {
      if (num <= 11) return "exposure-and-default";
      if (num <= 18) return "risk-parameters";
      if (num <= 23) return "scorecards-and-ratings";
      return "portfolio-risk";
    }

    if (prefix === "IMP") {
      if (num <= 5) return "ecl-foundations";
      if (num <= 12) return "three-stage-architecture";
      if (num <= 15) return "lifetime-modelling";
      return "governance-and-jurisdictions";
    }

    if (prefix === "CAP") {
      if (num <= 8) return "capital-stack";
      if (num <= 11) return "rwa-and-pillars";
      if (num <= 17) return "credit-approaches";
      if (num <= 20) return "mitigation";
      return "pillar-2-and-jurisdictions";
    }

    if (prefix === "TLM") {
      if (num <= 11) return "irrbb-and-mismatches";
      if (num <= 19) return "liquidity-risk";
      if (num <= 25) return "funds-transfer-pricing";
      return "systemic-and-jurisdictions";
    }

    if (prefix === "MRM") {
      if (num <= 5) return "model-risk-foundations";
      if (num <= 11) return "governance-and-lifecycle";
      return "validation-and-metrics";
    }

    if (prefix === "DAT") {
      if (num <= 6) return "bcbs239-and-aggregation";
      if (num <= 12) return "architecture-and-lineage";
      if (num <= 18) return "data-quality-and-governance";
      return "reporting-and-delivery";
    }

    if (prefix === "IND") {
      if (num <= 5) return "regulatory-structure";
      if (num <= 10) return "iracp-npa-norms";
      if (num <= 12) return "priority-sector";
      if (num <= 15) return "digital-lending";
      if (num <= 20) return "co-lending-and-data-tech";
      return "enforcement-and-conduct";
    }

    if (prefix === "TRD") {
      if (num <= 9) return "cash-products-and-bonds";
      if (num <= 12) return "fx-and-ndfs";
      if (num <= 22) return "derivatives-and-swaps";
      if (num <= 28) return "market-infrastructure-and-lifecycle";
      return "documentation-collateral-book";
    }

    if (prefix === "CCR") {
      if (num <= 4) return "exposure-and-wrong-way-risk";
      if (num <= 9) return "netting-margin-and-collateral";
      if (num <= 13) return "central-clearing-and-ccp-risk";
      if (num <= 16) return "sa-ccr-and-imm-approaches";
      if (num <= 21) return "xva-and-cva-capital";
      return "settlement-and-jurisdictions";
    }

    if (prefix === "MRK") {
      if (num <= 3) return "market-risk-foundations";
      if (num <= 10) return "var-and-expected-shortfall";
      if (num <= 18) return "frtb-sa-and-ima-capital";
      return "valuation-control-and-jurisdictions";
    }

    if (prefix === "QNT") {
      if (num <= 7) return "statistical-foundations-and-sampling";
      if (num <= 12) return "regression-and-scorecard-modelling";
      if (num <= 17) return "machine-learning-and-explainability";
      if (num <= 22) return "time-series-and-forecasting";
      return "validation-leakage-and-governance";
    }

    if (prefix === "TEC") {
      if (num <= 7) return "sql-querying-and-window-functions";
      if (num <= 14) return "data-engineering-and-reconciliation";
      if (num <= 20) return "pandas-analytics-and-dataframes";
      return "python-vectorization-and-engineering";
    }

    if (prefix === "OPR") {
      if (num <= 3) return "operational-risk-foundations";
      if (num <= 9) return "rcsa-kri-and-control-governance";
      if (num <= 13) return "sma-and-capital-approaches";
      return "resilience-third-party-and-conduct";
    }

    if (prefix === "AML") {
      if (num <= 5) return "financial-crime-foundations";
      if (num <= 12) return "kyc-edd-and-customer-due-diligence";
      if (num <= 16) return "transaction-monitoring-and-sanctions";
      return "fraud-and-aml-governance";
    }

    if (prefix === "BA") {
      if (num <= 8) return "ba-foundations-and-elicitation";
      if (num <= 14) return "brd-functional-specs-and-user-stories";
      if (num <= 19) return "testing-uat-and-cutover";
      return "project-delivery-and-scope-governance";
    }

    return "unsorted";
  }

  // Frontmatter object
  const frontmatter = {
    id,
    title: seg.title,
    type,
    domain,
    subdomain: inferSubdomain(id),
    one_screen: oneScreen,
    prerequisites: prereqs,
    jurisdictions,
    perishable: isPerishable,
    as_of: isPerishable ? new Date().toISOString().split("T")[0] : null,
    next_effective_date: nextEffectiveDate || null,
    status: "draft",
    verified: false,
    reading_minutes: readingMinutes,
    sources: sourcesList,
    import_source: fileName,
  };

  parsedAtoms.push({
    id,
    title: seg.title,
    frontmatter,
    body: finalMdxBody,
    wordCount,
  });

  if (!oneScreen) {
    validationWarnings.push(`Atom "${id}" missing required one_screen blockquote.`);
  }
  if (!ruleContent) {
    validationWarnings.push(`Atom "${id}" missing '### Permanent rule' section.`);
  }
  if (recallPairs.length === 0) {
    validationWarnings.push(`Atom "${id}" missing '### Recall' section.`);
  }
  if (sourcesList.length === 0) {
    validationWarnings.push(`Atom "${id}" missing '### Sources' section.`);
  }

  // First-person check (avoid Roman numerals like Title I, Part I, Tier I)
  const firstPersonMatch = cleanText.match(/\b(I'm|I've|I'll|my|our|me|myself|ourself)\b|\bI\s+(?:am|have|was|had|think|feel|believe|built|made|wrote|created|modelled|found)\b|\bwe\s+(?:have|are|will|can|see|find|note|use|defined|discussed|call|say)\b/i);
  if (firstPersonMatch) {
    validationWarnings.push(`Atom "${id}" contains first-person language ("${firstPersonMatch[0]}").`);
  }

  // Surviving citation tokens check
  if (/turn\d+(?:search|view)\d+/i.test(finalMdxBody) || /[\uE000-\uF8FF\uDB80-\uDBFF]/i.test(finalMdxBody)) {
    validationWarnings.push(`❌ [FAIL] Atom "${id}" contains surviving citation token.`);
  }
}

// Perform prerequisite validation across entire corpus + pack
const allPackAtomIds = new Set([...existingCorpusIds, ...parsedAtoms.map((a) => a.id)]);
parsedAtoms.forEach((atom) => {
  atom.frontmatter.prerequisites.forEach((p) => {
    if (!allPackAtomIds.has(p)) {
      validationWarnings.push(`Atom "${atom.id}" declares prerequisite "${p}" which is not yet in corpus.`);
    }
  });
});

// DRY-RUN REPORT OUTPUT
console.log("\n===========================================================");
console.log(`WARREN IMPORTER — PACK REPORT: ${fileName}`);
console.log("===========================================================");
console.log(`📌 TOTAL ATOMS PARSED: ${parsedAtoms.length}`);
console.log(`✂️ CITATION TOKENS STRIPPED: ${citationTokenCount}`);
console.log("\n📊 SECTION MATCHES PER TYPE:");
console.log(`   - Rule (<Rule>): ${sectionStats.Rule}`);
console.log(`   - Trap (<Trap>): ${sectionStats.Trap}`);
console.log(`   - NeverConfuse (<NeverConfuse>): ${sectionStats.NeverConfuse}`);
console.log(`   - Jurisdiction (<Delta> / No Delta): ${sectionStats.Jurisdiction}`);
console.log(`   - Recall (<Recall>): ${sectionStats.Recall}`);
console.log(`   - Sources (Frontmatter Array): ${sectionStats.Sources}`);
console.log(`   - Flow (<Flow>): ${sectionStats.Flow}`);

console.log(`\n⚠️ VALIDATION AUDIT WARNINGS (${validationWarnings.length}):`);
if (validationWarnings.length === 0) {
  console.log("   ✓ Zero validation warnings detected.");
} else {
  validationWarnings.forEach((w) => console.log(`   - ${w}`));
}

// WRITE FILES IF --write FLAG IS PRESENT
if (isWrite) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\n💾 WRITING ${parsedAtoms.length} ATOMS TO ${OUTPUT_DIR}...`);
  for (const atom of parsedAtoms) {
    const filePath = path.join(OUTPUT_DIR, `${atom.id}.mdx`);
    const fileData = matter.stringify(atom.body, atom.frontmatter);
    fs.writeFileSync(filePath, fileData, "utf-8");
  }
  console.log(`✅ ${parsedAtoms.length} ATOMS SUCCESSFULLY WRITTEN TO CORPUS!`);
} else {
  console.log("\nℹ️ MODE: DRY-RUN ONLY. Run with '--write' to commit atoms to /content/atoms/.");
}
