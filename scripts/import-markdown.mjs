import fs from "fs";
import path from "path";

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    file: "",
    prefix: "",
    domain: "",
    minWords: 250,
    maxWords: 1200,
    merge: true,
    dryRun: true,
    write: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      params.file = args[i + 1];
      i++;
    } else if (args[i] === "--prefix" && args[i + 1]) {
      params.prefix = args[i + 1];
      i++;
    } else if (args[i] === "--domain" && args[i + 1]) {
      params.domain = args[i + 1];
      i++;
    } else if (args[i] === "--min-words" && args[i + 1]) {
      params.minWords = parseInt(args[i + 1], 10) || 250;
      i++;
    } else if (args[i] === "--max-words" && args[i + 1]) {
      params.maxWords = parseInt(args[i + 1], 10) || 1200;
      i++;
    } else if (args[i] === "--no-merge") {
      params.merge = false;
    } else if (args[i] === "--write") {
      params.write = true;
      params.dryRun = false;
    } else if (args[i] === "--dry-run") {
      params.dryRun = true;
      params.write = false;
    }
  }
  return params;
}

function getExistingAtomIds() {
  const atomsDir = path.join(process.cwd(), "content", "atoms");
  if (!fs.existsSync(atomsDir)) return new Set();
  const files = fs.readdirSync(atomsDir).filter((f) => f.endsWith(".mdx"));
  const existing = new Set();
  for (const f of files) {
    const id = f.replace(".mdx", "");
    existing.add(id);
  }
  return existing;
}

function countWords(str) {
  if (!str) return 0;
  return str.split(/\s+/).filter(Boolean).length;
}

function extractOneScreen(body) {
  // Strip blockquote symbols, tables, headers, math, and code fences
  let cleanText = body
    .replace(/^>\s*/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^\$\n]+\$/g, "")
    .replace(/\|.*\|/g, "")
    .replace(/^#+.*$/gm, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanText.length > 0) {
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const summary = sentences.slice(0, 3).join(" ").trim();
    if (summary.length > 10) {
      return summary;
    }
  }

  return "Placeholder one_screen summary for candidate atom.";
}

function inferType(body, components) {
  if (components.has("Flow")) {
    return "mechanism";
  }
  const lines = body.split("\n").filter((l) => l.trim().length > 0);
  const stepLines = lines.filter((l) => /^\d+\.|\s*-\s*/.test(l));
  if (lines.length > 0 && stepLines.length / lines.length > 0.4) {
    return "procedure";
  }
  const tableLines = lines.filter((l) => l.includes("|"));
  if (tableLines.length > 2) {
    return "reference";
  }
  return "concept";
}

function insertUnverifiedClaimMarkers(rawBody) {
  const claimRegex = /\b(Basel|RBI|PRA|EBA|FCA|IFRS|Ind AS|CECL|FASB|SEBI|Fed|OCC|FRTB|BCBS|SA-CCR|CRR)\b|\d+(\.\d+)?%|\b(19|20)\d{2}\b/i;
  
  const paragraphs = rawBody.split("\n\n");
  let claimCount = 0;

  const processed = paragraphs.map((para) => {
    if (para.trim().startsWith("<") || para.trim().startsWith("{/*")) {
      return para;
    }
    if (claimRegex.test(para)) {
      claimCount++;
      return `{/* UNVERIFIED CLAIM — check primary source before publishing */}\n${para}`;
    }
    return para;
  });

  return {
    bodyWithClaims: processed.join("\n\n"),
    claimCount,
  };
}

function checkPersonalLanguage(rawBody) {
  const personalRegex = /\b(my|I\s|our project|this project|in my|my team|my role)\b/i;
  return personalRegex.test(rawBody);
}

function transformBodyPatterns(rawBody) {
  let body = rawBody;
  const componentsMatched = new Set();
  const todoMarkers = [];

  // 1. Fenced blocks with box drawing -> <Flow>
  body = body.replace(/```[a-z]*\n([\s\S]*?)\n```/gi, (match, codeContent) => {
    const hasDiagramChars = /[│─↓→\+\-\|]/.test(codeContent);
    const hasCodeKeywords = /\b(const|function|import|def|return|select|where|from|class|var|let)\b/i.test(codeContent);

    if (hasDiagramChars && !hasCodeKeywords) {
      componentsMatched.add("Flow");
      return `<Flow>\n${codeContent.trim()}\n</Flow>`;
    }
    return match;
  });

  // 2. Rules H3
  body = body.replace(
    /###\s+(Permanent rule|Core underwriting rule|Permanent memory|Permanent idea|Key test|Rule):?\s*(.+)?\n([\s\S]*?)(?=\n###|\n#|$)/gi,
    (match, labelType, labelText, content) => {
      componentsMatched.add("Rule");
      const label = labelText ? labelText.trim().toUpperCase() : labelType.trim().toUpperCase();
      return `<Rule label="${label}">\n${content.trim()}\n</Rule>\n\n`;
    }
  );

  // 3. Traps H3
  body = body.replace(
    /###\s+(Permanent trap|Trap|Traps|.*?\btraps\b):?\s*(.+)?\n([\s\S]*?)(?=\n###|\n#|$)/gi,
    (match, labelType, labelText, content) => {
      componentsMatched.add("Trap");
      const label = labelText ? labelText.trim().toUpperCase() : labelType.trim().toUpperCase();
      return `<Trap label="${label}">\n${content.trim()}\n</Trap>\n\n`;
    }
  );

  // 4. NeverConfuse H3
  body = body.replace(
    /###\s+(Never confuse|Core distinction|One-line distinction|Important distinction):?\s*(.+)?\n([\s\S]*?)(?=\n###|\n#|$)/gi,
    (match, labelType, labelText, content) => {
      const cleanContent = content.trim();
      let parts = [];

      if (cleanContent.includes("\n---\n")) {
        parts = cleanContent.split("\n---\n");
      } else if (/\bvs\.?\b|\bversus\b/i.test(cleanContent)) {
        parts = cleanContent.split(/\bvs\.?\b|\bversus\b/i);
      }

      if (parts.length >= 2) {
        componentsMatched.add("NeverConfuse");
        const aLabel = "Concept A";
        const bLabel = "Concept B";
        return `<NeverConfuse a="${aLabel}" b="${bLabel}">\n${parts[0].trim()}\n\n---\n\n${parts[1].trim()}\n</NeverConfuse>\n\n`;
      } else {
        componentsMatched.add("Trap");
        todoMarkers.push("split into NeverConfuse");
        return `{/* TODO: split into NeverConfuse */}\n<Trap label="DISTINCTION">\n${cleanContent}\n</Trap>\n\n`;
      }
    }
  );

  // 5. Mental Model H3 (Banned <OneScreen> in body!)
  body = body.replace(
    /###\s+Mental model:?\s*(.+)?\n([\s\S]*?)(?=\n###|\n#|$)/gi,
    (match, labelText, content) => {
      if (/[│─↓→\+\-\|]/.test(content)) {
        componentsMatched.add("Flow");
        return `<Flow>\n${content.trim()}\n</Flow>\n\n`;
      }
      return `### Mental Model Overview\n\n${content.trim()}\n\n`;
    }
  );

  // 6. Formulas (Math)
  body = body.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
    componentsMatched.add("Formula");
    return `<Formula math="${mathContent.trim().replace(/"/g, '\\"')}" />`;
  });

  return {
    transformedBody: body,
    componentsMatched: Array.from(componentsMatched),
    todoMarkers,
  };
}

export function parseMarkdownFile(filePath, prefix, domain, minWords = 250, maxWords = 1200, enableMerge = true) {
  const rawText = fs.readFileSync(filePath, "utf-8");
  const existingIds = getExistingAtomIds();

  // Step 1: Split on H1 headings: # 1. Title or # 1 Title or # 1: Title
  const headingRegex = /^#\s+(\d+)[\.\:]?\s*(.+)$/gm;
  const matches = Array.from(rawText.matchAll(headingRegex));

  if (matches.length === 0) {
    return [];
  }

  const rawSegments = [];
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const candidateTitle = currentMatch[2].trim();

    const startIdx = currentMatch.index + currentMatch[0].length;
    const endIdx = i < matches.length - 1 ? matches[i + 1].index : rawText.length;
    const rawBody = rawText.substring(startIdx, endIdx).trim();

    rawSegments.push({
      headingNum: currentMatch[1],
      title: candidateTitle,
      body: rawBody,
      wordCount: countWords(rawBody),
    });
  }

  // Step 2: MERGE PASS
  let mergedSegments = [];
  if (enableMerge) {
    let currentAcc = null;

    for (const seg of rawSegments) {
      if (!currentAcc) {
        currentAcc = {
          primaryTitle: seg.title,
          headingNum: seg.headingNum,
          headings: [seg.title],
          bodyParts: [seg.body],
          wordCount: seg.wordCount,
        };
      } else {
        const canMerge =
          currentAcc.wordCount < minWords &&
          currentAcc.wordCount + seg.wordCount <= maxWords;

        if (canMerge) {
          currentAcc.headings.push(seg.title);
          currentAcc.bodyParts.push(`## ${seg.title}\n\n${seg.body}`);
          currentAcc.wordCount += seg.wordCount;
        } else {
          mergedSegments.push(currentAcc);
          currentAcc = {
            primaryTitle: seg.title,
            headingNum: seg.headingNum,
            headings: [seg.title],
            bodyParts: [seg.body],
            wordCount: seg.wordCount,
          };
        }
      }
    }
    if (currentAcc) {
      mergedSegments.push(currentAcc);
    }
  } else {
    mergedSegments = rawSegments.map((seg) => ({
      primaryTitle: seg.title,
      headingNum: seg.headingNum,
      headings: [seg.title],
      bodyParts: [seg.body],
      wordCount: seg.wordCount,
    }));
  }

  // Step 3: Process segments into final candidate atoms
  const candidates = [];
  let nextSeqNumber = 1;
  const filename = path.basename(filePath);

  for (const seg of mergedSegments) {
    let candidateId = `${prefix}-${String(nextSeqNumber).padStart(2, "0")}`;
    while (existingIds.has(candidateId)) {
      nextSeqNumber++;
      candidateId = `${prefix}-${String(nextSeqNumber).padStart(2, "0")}`;
    }
    nextSeqNumber++;

    const combinedRawBody = seg.bodyParts.join("\n\n");
    const oneScreen = extractOneScreen(combinedRawBody);

    const { transformedBody, componentsMatched, todoMarkers } = transformBodyPatterns(combinedRawBody);
    const { bodyWithClaims, claimCount } = insertUnverifiedClaimMarkers(transformedBody);
    const isPersonal = checkPersonalLanguage(combinedRawBody);

    const type = inferType(combinedRawBody, new Set(componentsMatched));
    const wordCount = countWords(combinedRawBody);
    const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

    const importSource = `${filename} > # ${seg.headingNum}. ${seg.primaryTitle}`;

    candidates.push({
      id: candidateId,
      title: seg.primaryTitle,
      type,
      domain,
      subdomain: "unsorted",
      one_screen: oneScreen,
      prerequisites: [],
      see_also: [],
      contrast_with: [],
      jurisdictions: ["universal"],
      perishable: false,
      as_of: null,
      next_effective_date: null,
      status: "draft",
      verified: false,
      reading_minutes: readingMinutes,
      sources: [],
      import_source: importSource,
      import_headings: seg.headings.length > 1 ? seg.headings : [],
      wordCount,
      componentsMatched,
      todoMarkers,
      claimCount,
      isPersonal,
      body: bodyWithClaims,
    });
  }

  return candidates;
}

function runImporter() {
  const params = parseArgs();

  if (!params.file) {
    console.error("\n❌ [ERROR] Missing argument '--file'. Example: node scripts/import-markdown.mjs --file \"01_Credit_Risk_Core_End_to_End_Masterclass.md\" --prefix CRX --domain credit-risk --dry-run\n");
    process.exit(1);
  }

  const importFilePath = path.join(process.cwd(), "_import", params.file);
  if (!fs.existsSync(importFilePath)) {
    console.error(`\n❌ [ERROR] Import file not found at ${importFilePath}\n`);
    process.exit(1);
  }

  const prefix = params.prefix || "IMP";
  const domain = params.domain || "credit-risk";

  const candidates = parseMarkdownFile(
    importFilePath,
    prefix,
    domain,
    params.minWords,
    params.maxWords,
    params.merge
  );

  const totalClaims = candidates.reduce((sum, c) => sum + c.claimCount, 0);
  const totalPersonal = candidates.filter((c) => c.isPersonal).length;

  console.log(`\n=== WARREN MARKDOWN IMPORTER & ADAPTIVE SPLITTER ===`);
  console.log(`Source File: ${params.file}`);
  console.log(`Prefix: ${prefix} | Domain: ${domain} | MinWords: ${params.minWords} | MaxWords: ${params.maxWords}`);
  console.log(`Mode: ${params.write ? "WRITE (PERSISTING)" : "DRY-RUN (SIMULATION)"}`);
  console.log(`Candidate Atoms Extracted: ${candidates.length}`);
  console.log(`Unverified Claim Markers Inserted: ${totalClaims}`);
  console.log(`Personal Narrative Flagged Atoms: ${totalPersonal}\n`);

  if (params.dryRun) {
    console.table(
      candidates.map((c) => ({
        "Proposed ID": c.id,
        "Candidate Title": c.title.substring(0, 30),
        Type: c.type,
        "Word Count": c.wordCount,
        "Merged Headings": c.import_headings.length > 0 ? c.import_headings.length : 1,
        "Components Matched": c.componentsMatched.join(", ") || "Prose",
        Claims: c.claimCount,
        Personal: c.isPersonal ? "PERSONAL ⚠️" : "Clean",
      }))
    );
    console.log(`\n✅ Dry-run complete for ${params.file}. No files were written to disk.`);
    return candidates;
  }

  if (params.write) {
    let writtenCount = 0;
    const atomsDir = path.join(process.cwd(), "content", "atoms");

    for (const c of candidates) {
      const atomFilePath = path.join(atomsDir, `${c.id}.mdx`);
      if (fs.existsSync(atomFilePath)) {
        console.error(`⚠️ Skipping ${c.id}: file already exists at ${atomFilePath}`);
        continue;
      }

      const headingsJson = JSON.stringify(c.import_headings);

      const frontmatterStr = `---
id: ${c.id}
title: "${c.title.replace(/"/g, '\\"')}"
type: ${c.type}
domain: ${c.domain}
subdomain: ${c.subdomain}
one_screen: "${c.one_screen.replace(/"/g, '\\"').replace(/\n|\r/g, " ")}"
prerequisites: []
see_also: []
contrast_with: []
jurisdictions: [universal]
perishable: false
as_of: null
next_effective_date: null
status: draft
verified: false
reading_minutes: ${c.reading_minutes}
sources: []
import_source: "${c.import_source.replace(/"/g, '\\"')}"
import_headings: ${headingsJson}
---

${c.body}
`;

      fs.writeFileSync(atomFilePath, frontmatterStr, "utf-8");
      writtenCount++;
    }

    console.log(`\n🎉 Successfully written ${writtenCount} draft atom files from ${params.file} to /content/atoms/!`);
    return candidates;
  }
}

runImporter();
