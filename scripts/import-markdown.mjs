import fs from "fs";
import path from "path";

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    file: "",
    prefix: "",
    domain: "",
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

function extractOneScreen(body) {
  // Check for blockquote
  const bqMatch = body.match(/^>\s*(.+)$/m);
  if (bqMatch) {
    return bqMatch[1].trim().replace(/\s+/g, " ");
  }

  // Else first non-heading paragraph
  const paragraphs = body
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#") && !p.startsWith("<") && !p.startsWith("```"));

  if (paragraphs.length > 0) {
    const firstPara = paragraphs[0].replace(/\n/g, " ");
    const sentences = firstPara.match(/[^.!?]+[.!?]+/g) || [firstPara];
    return sentences.slice(0, 3).join(" ").trim();
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

export function parseMarkdownFile(filePath, prefix, domain) {
  const rawText = fs.readFileSync(filePath, "utf-8");
  const existingIds = getExistingAtomIds();

  // Split on H1 headings: # 1. Title or # 1 Title or # 1: Title
  const headingRegex = /^#\s+(\d+)[\.\:]?\s*(.+)$/gm;
  const matches = Array.from(rawText.matchAll(headingRegex));

  if (matches.length === 0) {
    return [];
  }

  const candidates = [];
  let nextSeqNumber = 1;

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const candidateTitle = currentMatch[2].trim();

    const startIdx = currentMatch.index + currentMatch[0].length;
    const endIdx = i < matches.length - 1 ? matches[i + 1].index : rawText.length;
    const rawBody = rawText.substring(startIdx, endIdx).trim();

    // Assign sequential ID skipping existing IDs
    let candidateId = `${prefix}-${String(nextSeqNumber).padStart(2, "0")}`;
    while (existingIds.has(candidateId)) {
      nextSeqNumber++;
      candidateId = `${prefix}-${String(nextSeqNumber).padStart(2, "0")}`;
    }
    nextSeqNumber++;

    const oneScreen = extractOneScreen(rawBody);
    const { transformedBody, componentsMatched, todoMarkers } = transformBodyPatterns(rawBody);

    const type = inferType(rawBody, new Set(componentsMatched));
    const wordCount = rawBody.split(/\s+/).filter(Boolean).length;
    const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

    const filename = path.basename(filePath);
    const importSource = `${filename} > # ${i + 1}. ${candidateTitle}`;

    candidates.push({
      id: candidateId,
      title: candidateTitle,
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
      wordCount,
      componentsMatched,
      todoMarkers,
      body: transformedBody,
    });
  }

  return candidates;
}

function runImporter() {
  const params = parseArgs();

  if (!params.file) {
    console.error("\n❌ [ERROR] Missing argument '--file'. Example: npm run import -- --file \"01_Credit_Risk_Core_End_to_End_Masterclass.md\" --prefix CRX --domain credit-risk --dry-run\n");
    process.exit(1);
  }

  const importFilePath = path.join(process.cwd(), "_import", params.file);
  if (!fs.existsSync(importFilePath)) {
    console.error(`\n❌ [ERROR] Import file not found at ${importFilePath}\n`);
    process.exit(1);
  }

  const prefix = params.prefix || "IMP";
  const domain = params.domain || "credit-risk";

  const candidates = parseMarkdownFile(importFilePath, prefix, domain);

  console.log(`\n=== WARREN MARKDOWN IMPORTER & SPLITTER ===`);
  console.log(`Source File: ${params.file}`);
  console.log(`Prefix: ${prefix} | Domain: ${domain} | Mode: ${params.write ? "WRITE (PERSISTING)" : "DRY-RUN (SIMULATION)"}`);
  console.log(`Candidate Atoms Extracted: ${candidates.length}\n`);

  if (params.dryRun) {
    console.table(
      candidates.map((c) => ({
        "Proposed ID": c.id,
        "Candidate Title": c.title.substring(0, 32),
        Type: c.type,
        "Word Count": c.wordCount,
        "Components Matched": c.componentsMatched.join(", ") || "Prose",
        "TODO Markers": c.todoMarkers.join(", ") || "None",
      }))
    );
    console.log(`\n✅ Dry-run complete. No files were written to disk.`);
    return;
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

      const frontmatterStr = `---
id: ${c.id}
title: "${c.title.replace(/"/g, '\\"')}"
type: ${c.type}
domain: ${c.domain}
subdomain: ${c.subdomain}
one_screen: >
  ${c.one_screen.replace(/\n/g, " ")}
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
---

${c.body}
`;

      fs.writeFileSync(atomFilePath, frontmatterStr, "utf-8");
      writtenCount++;
    }

    console.log(`\n🎉 Successfully written ${writtenCount} draft atom files to /content/atoms/!`);
  }
}

runImporter();
