import fs from "fs";
import path from "path";

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].substring(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
      params[key] = val;
      if (val !== true) i++;
    } else if (!params.id) {
      params.id = args[i];
    } else if (!params.domain) {
      params.domain = args[i];
    } else if (!params.subdomain) {
      params.subdomain = args[i];
    }
  }
  return params;
}

function createNewAtom() {
  const params = parseArgs();
  const id = params.id;
  const domain = params.domain || "credit-risk";
  const subdomain = params.subdomain || "general";
  const title = params.title || `New Atom ${id}`;

  if (!id) {
    console.error("\n❌ [ERROR] Missing required argument '--id'. Usage: npm run new-atom -- --id CR-12 --domain credit-risk --subdomain risk-parameters\n");
    process.exit(1);
  }

  const idRegex = /^[A-Z]{2,4}-\d{2,3}(-[A-Z0-9]+)?$/;
  if (!idRegex.test(id)) {
    console.error(`\n❌ [ERROR] Invalid Atom ID format '${id}'. Must match regex format e.g. CR-12 or CR-12-EX\n`);
    process.exit(1);
  }

  const targetPath = path.join(process.cwd(), "content", "atoms", `${id}.mdx`);
  if (fs.existsSync(targetPath)) {
    console.error(`\n❌ [ERROR] Atom file already exists at ${targetPath}\n`);
    process.exit(1);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const templateContent = `---
id: ${id}
title: ${title}
type: concept
domain: ${domain}
subdomain: ${subdomain}
one_screen: >
  Compressed mental model for ${id}. 1-3 sentences describing core technical intuition.
prerequisites: []
see_also: []
contrast_with: []
jurisdictions: [universal]
perishable: false
as_of: ${todayStr}
next_effective_date: null
status: draft
reading_minutes: 3
sources: []
---

## Overview

Core explanatory prose paragraph for ${title}.

{/* COMPONENT USAGE NOTES: */}

{/* 1. Monospace ASCII Structure Diagram */}
<Flow>
+-----------------------------------------------------------------+
|                       AUTHORING PIPELINE                        |
+-----------------------------------------------------------------+
</Flow>

{/* 2. Green Permanent Rule (2px left rule) */}
<Rule label="PERMANENT RULE">
Core regulatory requirement or mathematical constant.
</Rule>

{/* 3. Red Trap Warning (2px left rule) */}
<Trap label="TRAP">
Common misunderstanding or calculation pitfall.
</Trap>

{/* 4. Amber Two-Column Comparison (2px left rule) */}
<NeverConfuse a="Concept A" b="Concept B">
First concept explanation.

---

Second concept explanation.
</NeverConfuse>

{/* 5. Monospace Numerical Worked Calculation */}
<Worked title="WORKED CALCULATION">
Input Value:  100.00
Ratio:         1.25x
Final Output: 125.00
</Worked>

{/* 6. Instant Toggle Self-Assessment Practice */}
<Recall q="Question for retrieval practice?" a="Answer revealed on instant toggle click." />

{/* 7. Jurisdiction Variant Block (2px left rule: IN, UK, EU, US) */}
<Delta j="IN">
Specific Reserve Bank of India (RBI) regulatory treatment.
</Delta>

{/* 8. KaTeX Display Math */}
<Formula math="E = m \\cdot c^2" />

{/* 9. Inline Citation Reference */}
{/* Use <Source id="1" /> linking to items in sources frontmatter array */}
`;

  fs.writeFileSync(targetPath, templateContent, "utf-8");
  console.log(`\n✅ Atom file successfully created at ${targetPath}`);
  console.log(`   ID: ${id}`);
  console.log(`   Domain: ${domain} > ${subdomain}`);
  console.log(`   Status: draft\n`);
}

createNewAtom();
