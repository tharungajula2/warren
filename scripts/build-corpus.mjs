import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";

const CONTENT_DIR = path.join(process.cwd(), "content", "atoms");
const ROLES_PATH = path.join(process.cwd(), "content", "roles.json");
const MANIFEST_PATH = path.join(process.cwd(), "public", "corpus-manifest.json");
const SEARCH_INDEX_PATH = path.join(process.cwd(), "public", "search-index.json");

const AtomTypeSchema = z.enum([
  "concept",
  "mechanism",
  "procedure",
  "delta",
  "example",
  "reference",
]);

const JurisdictionSchema = z.enum(["universal", "IN", "UK", "EU", "US"]);
const AtomStatusSchema = z.enum(["draft", "fixture", "published"]);

const DateOrStringSchema = z
  .union([z.string(), z.date()])
  .transform((val) => {
    if (val instanceof Date) {
      return val.toISOString().split("T")[0];
    }
    return val;
  });

const SourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  accessed: DateOrStringSchema.optional(),
});

const AtomFrontmatterSchema = z
  .object({
    id: z.string().regex(/^[A-Z]{2,4}-\d{2,3}(-[A-Z0-9]+)?$/, {
      message: "Atom ID must match regex format e.g. CR-07 or CR-07-EX",
    }),
    title: z.string().min(1, "Title is required"),
    type: AtomTypeSchema,
    domain: z.string().min(1, "Domain slug is required"),
    subdomain: z.string().min(1, "Subdomain slug is required"),
    one_screen: z.string().min(1, "one_screen is required"),
    prerequisites: z.array(z.string()).default([]),
    see_also: z.array(z.string()).default([]),
    contrast_with: z.array(z.string()).default([]),
    jurisdictions: z.array(JurisdictionSchema).min(1, "At least one jurisdiction is required"),
    perishable: z.boolean().default(false),
    as_of: DateOrStringSchema.nullable().optional(),
    next_effective_date: DateOrStringSchema.nullable().optional(),
    status: AtomStatusSchema.default("fixture"),
    verified: z.boolean({
      required_error: "Field 'verified' is required (boolean: true | false)",
    }),
    reading_minutes: z.number().positive(),
    sources: z.array(SourceSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.perishable && !data.as_of) {
        return false;
      }
      return true;
    },
    {
      message: "Field 'as_of' is required when perishable is true",
      path: ["as_of"],
    }
  );

function computeCurrentness(frontmatter, buildDate = new Date("2026-08-28")) {
  if (!frontmatter.perishable) {
    return "durable";
  }

  if (frontmatter.next_effective_date) {
    const effDate = new Date(frontmatter.next_effective_date);
    if (effDate > buildDate) {
      return "future";
    }
  }

  if (!frontmatter.as_of) {
    return "stale";
  }

  const asOfDate = new Date(frontmatter.as_of);
  const diffTime = buildDate.getTime() - asOfDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 180) {
    return "fresh";
  } else if (diffDays <= 365) {
    return "ageing";
  } else {
    return "stale";
  }
}

function stripMdxToPlainText(rawMdx) {
  if (!rawMdx) return "";
  return rawMdx
    .replace(/```[\s\S]*?```/g, " ") // Strip fenced code blocks
    .replace(/<[^>]+>/g, " ") // Strip JSX / HTML tags
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ") // Strip JSX comments
    .replace(/[\r\n]+/g, " ") // Collapse linebreaks to spaces
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .trim();
}

function buildCorpus() {
  console.log("=== WARREN CORPUS COMPILER & TRUST BUILD GATE ===");

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith(".mdx"));
  console.log(`Found ${files.length} MDX files in ${CONTENT_DIR}`);

  if (files.length === 0) {
    let roles = [];
    if (fs.existsSync(ROLES_PATH)) {
      roles = JSON.parse(fs.readFileSync(ROLES_PATH, "utf-8"));
    }
    const missingAtoms = roles.flatMap((r) => r.atoms.map((a) => a.id));

    const manifest = {
      atoms: {},
      reverseIndex: {},
      domainTree: [],
      roles,
      missingAtoms,
      lintWarnings: [],
      generatedAt: new Date().toISOString(),
    };

    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
    fs.writeFileSync(SEARCH_INDEX_PATH, JSON.stringify([], null, 2), "utf-8");
    console.log(`✅ Corpus Manifest (EMPTY) successfully written to ${MANIFEST_PATH}`);
    return;
  }

  const rawAtoms = {};

  for (const filename of files) {
    const filepath = path.join(CONTENT_DIR, filename);
    const fileContent = fs.readFileSync(filepath, "utf-8");
    const { data, content } = matter(fileContent);

    if (/<OneScreen[\s/>]/i.test(content)) {
      console.error(
        `\n❌ [BUILD ERROR] <OneScreen> tag found in body of "${filename}". <OneScreen> must NOT be used inside MDX bodies.\n`
      );
      process.exit(1);
    }

    const parseResult = AtomFrontmatterSchema.safeParse(data);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; ");
      console.error(`\n❌ [BUILD ERROR] Invalid Atom Frontmatter in file "${filename}": ${formattedErrors}\n`);
      process.exit(1);
    }

    const frontmatter = parseResult.data;

    if (rawAtoms[frontmatter.id]) {
      console.error(
        `\n❌ [BUILD ERROR] Duplicate Atom ID "${frontmatter.id}" found in "${filename}" and "${rawAtoms[frontmatter.id].filename}"\n`
      );
      process.exit(1);
    }

    rawAtoms[frontmatter.id] = {
      frontmatter,
      content,
      filepath: filename,
      filename,
    };
  }

  const allIds = new Set(Object.keys(rawAtoms));

  // PART 1D BUILD GATE: If NODE_ENV === 'production' and any atom status === 'published' with verified === false -> FAIL BUILD
  if (process.env.NODE_ENV === "production") {
    const offendingUnverifiedPublished = [];
    for (const [id, { frontmatter }] of Object.entries(rawAtoms)) {
      if (frontmatter.status === "published" && frontmatter.verified === false) {
        offendingUnverifiedPublished.push(`${id} (${frontmatter.title})`);
      }
    }

    if (offendingUnverifiedPublished.length > 0) {
      console.error("\n❌ [BUILD GATE FAILED] Production build blocked!");
      console.error(
        `   The following ${offendingUnverifiedPublished.length} atom(s) have status 'published' but verified: false:`
      );
      offendingUnverifiedPublished.forEach((item) => console.error(`   - ${item}`));
      console.error(
        "\n   Only human-reviewed primary sources may set verified: true for published atoms.\n"
      );
      process.exit(1);
    }
  }

  // Track missing/future atom references
  const missingFutureAtoms = new Set();

  // Resolve references
  for (const [id, { frontmatter }] of Object.entries(rawAtoms)) {
    const references = [
      ...frontmatter.prerequisites.map((ref) => ({ ref, field: "prerequisites" })),
      ...frontmatter.see_also.map((ref) => ({ ref, field: "see_also" })),
      ...frontmatter.contrast_with.map((ref) => ({ ref, field: "contrast_with" })),
    ];

    for (const { ref } of references) {
      if (!allIds.has(ref)) {
        missingFutureAtoms.add(ref);
      }
    }
  }

  // Detect cycles (only on existing atoms)
  const visited = {};
  const recursionStack = [];

  function checkPrereqCycle(nodeId) {
    visited[nodeId] = "visiting";
    recursionStack.push(nodeId);

    const prereqs = rawAtoms[nodeId].frontmatter.prerequisites.filter((p) => allIds.has(p));
    for (const prereqId of prereqs) {
      if (visited[prereqId] === "visiting") {
        const cyclePath = [...recursionStack.slice(recursionStack.indexOf(prereqId)), prereqId].join(" -> ");
        console.error(
          `\n❌ [BUILD ERROR] Cycle detected in prerequisite graph: ${cyclePath}\n`
        );
        process.exit(1);
      }
      if (visited[prereqId] === "unvisited") {
        checkPrereqCycle(prereqId);
      }
    }

    recursionStack.pop();
    visited[nodeId] = "visited";
  }

  for (const id of allIds) {
    visited[id] = "unvisited";
  }

  for (const id of allIds) {
    if (visited[id] === "unvisited") {
      checkPrereqCycle(id);
    }
  }

  // Compute depth
  const depthMemo = {};

  function computeDepth(nodeId) {
    if (depthMemo[nodeId] !== undefined) {
      return depthMemo[nodeId];
    }

    const prereqs = rawAtoms[nodeId].frontmatter.prerequisites.filter((p) => allIds.has(p));
    if (prereqs.length === 0) {
      depthMemo[nodeId] = 0;
      return 0;
    }

    let maxPrereqDepth = 0;
    for (const prereqId of prereqs) {
      maxPrereqDepth = Math.max(maxPrereqDepth, computeDepth(prereqId));
    }

    const depth = 1 + maxPrereqDepth;
    depthMemo[nodeId] = depth;
    return depth;
  }

  // Precompute Graph Positions
  const uniqueDomains = Array.from(new Set(Object.values(rawAtoms).map((a) => a.frontmatter.domain)));
  const domainCentroids = {};
  const radius = 320;
  uniqueDomains.forEach((domain, idx) => {
    const angle = (2 * Math.PI * idx) / uniqueDomains.length;
    domainCentroids[domain] = {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  });

  // Run d3-force simulation in Node
  import("d3-force").then(({ forceSimulation, forceLink, forceManyBody, forceX, forceY }) => {
    const simNodes = Object.keys(rawAtoms).map((id) => ({
      id,
      domain: rawAtoms[id].frontmatter.domain,
      x: domainCentroids[rawAtoms[id].frontmatter.domain]?.x || 0,
      y: domainCentroids[rawAtoms[id].frontmatter.domain]?.y || 0,
    }));

    const simEdges = [];
    Object.values(rawAtoms).forEach(({ frontmatter }) => {
      frontmatter.prerequisites.forEach((p) => {
        if (rawAtoms[p]) {
          simEdges.push({ source: p, target: frontmatter.id });
        }
      });
    });

    const sim = forceSimulation(simNodes)
      .force("link", forceLink(simEdges).id((d) => d.id).distance(60).strength(0.3))
      .force("charge", forceManyBody().strength(-70))
      .force("x", forceX((d) => domainCentroids[d.domain]?.x || 0).strength(0.3))
      .force("y", forceY((d) => domainCentroids[d.domain]?.y || 0).strength(0.3))
      .stop();

    for (let i = 0; i < 300; i++) {
      sim.tick();
    }

    const nodePositions = {};
    simNodes.forEach((n) => {
      nodePositions[n.id] = {
        x: Math.round(n.x * 10) / 10,
        y: Math.round(n.y * 10) / 10,
      };
    });

    const atomsManifest = {};
    for (const [id, { frontmatter, filename }] of Object.entries(rawAtoms)) {
      const depth = computeDepth(id);
      const currentness = computeCurrentness(frontmatter);
      const pos = nodePositions[id] || { x: 0, y: 0 };

      atomsManifest[id] = {
        ...frontmatter,
        slug: id.toLowerCase(),
        depth,
        currentness,
        filepath: filename,
        initialX: pos.x,
        initialY: pos.y,
      };
    }

    finishBuild(atomsManifest, rawAtoms, allIds);
  });
}

function finishBuild(atomsManifest, rawAtoms, allIds) {
  // Reverse index
  const reverseIndex = {};
  for (const id of allIds) {
    reverseIndex[id] = [];
  }

  for (const [id, atom] of Object.entries(atomsManifest)) {
    for (const prereqId of atom.prerequisites) {
      if (!reverseIndex[prereqId]) {
        reverseIndex[prereqId] = [];
      }
      if (!reverseIndex[prereqId].includes(id)) {
        reverseIndex[prereqId].push(id);
      }
    }
  }

  // Domain tree
  const domainMap = {};
  for (const atom of Object.values(atomsManifest)) {
    if (!domainMap[atom.domain]) {
      domainMap[atom.domain] = {};
    }
    if (!domainMap[atom.domain][atom.subdomain]) {
      domainMap[atom.domain][atom.subdomain] = [];
    }
    domainMap[atom.domain][atom.subdomain].push({
      id: atom.id,
      title: atom.title,
      type: atom.type,
      status: atom.status,
      verified: atom.verified,
    });
  }

  const domainTree = Object.entries(domainMap).map(([domain, subdomains]) => ({
    domain,
    subdomains: Object.entries(subdomains).map(([subdomain, atoms]) => ({
      subdomain,
      atoms,
    })),
  }));

  // Roles Registry & Missing Atoms Validation
  let roles = [];
  const missingAtomsSet = new Set();

  if (fs.existsSync(ROLES_PATH)) {
    roles = JSON.parse(fs.readFileSync(ROLES_PATH, "utf-8"));
    for (const role of roles) {
      for (const req of role.atoms) {
        if (!allIds.has(req.id)) {
          missingAtomsSet.add(req.id);
        }
      }
    }
  }

  const missingAtoms = Array.from(missingAtomsSet).sort();

  // LINT PASS
  const lintWarnings = [];
  const inboundLinksCount = {};
  for (const id of allIds) {
    inboundLinksCount[id] = 0;
  }

  for (const atom of Object.values(atomsManifest)) {
    const refs = [...atom.prerequisites, ...atom.see_also, ...atom.contrast_with];
    for (const ref of refs) {
      if (inboundLinksCount[ref] !== undefined) {
        inboundLinksCount[ref]++;
      }
    }
  }

  for (const [id, atom] of Object.entries(atomsManifest)) {
    const rawData = rawAtoms[id];

    if (!atom.verified) {
      lintWarnings.push({
        rule: "UNVERIFIED_CONTENT",
        atomId: id,
        message: `Atom "${id}" is unverified (${atom.status}). Displays development banner.`,
      });
    }

    if (atom.status === "published" && (!atom.sources || atom.sources.length === 0)) {
      lintWarnings.push({
        rule: "MISSING_SOURCES",
        atomId: id,
        message: `Published atom "${id}" (${atom.title}) has no sources listed.`,
      });
    }

    if (atom.perishable && atom.currentness === "stale") {
      lintWarnings.push({
        rule: "STALE_REGULATION",
        atomId: id,
        message: `Perishable atom "${id}" has as_of date (${atom.as_of}) older than 365 days.`,
      });
    }

    if (atom.prerequisites.length === 0) {
      lintWarnings.push({
        rule: "ROOT_ATOM_NOTE",
        atomId: id,
        message: `Atom "${id}" has 0 prerequisites (Depth 0 Root).`,
      });
    }

    if (!/<Recall[\s/>]/i.test(rawData.content)) {
      lintWarnings.push({
        rule: "MISSING_RECALL_BLOCK",
        atomId: id,
        message: `Atom "${id}" does not contain a <Recall> retrieval practice block.`,
      });
    }

    const sentenceCount = (atom.one_screen.match(/[.!?]+/g) || []).length;
    if (sentenceCount > 3) {
      lintWarnings.push({
        rule: "ONE_SCREEN_LENGTH",
        atomId: id,
        message: `one_screen in "${id}" contains ${sentenceCount} sentences (maximum 3 recommended).`,
      });
    }

    if (inboundLinksCount[id] === 0 && atom.prerequisites.length === 0) {
      lintWarnings.push({
        rule: "ORPHAN_ATOM",
        atomId: id,
        message: `Orphan Atom "${id}": no other atom lists it as prerequisite, see_also, or contrast_with.`,
      });
    }
  }

  const manifest = {
    atoms: atomsManifest,
    reverseIndex,
    domainTree,
    roles,
    missingAtoms,
    lintWarnings,
    generatedAt: new Date().toISOString(),
  };

  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

  // BUILD SEPARATE SEARCH INDEX FOR FULL-TEXT SEARCH (Part 4)
  const searchIndex = Object.entries(atomsManifest).map(([id, atom]) => {
    const rawContent = rawAtoms[id]?.content || "";
    let bodyText = stripMdxToPlainText(rawContent);
    return {
      id: atom.id,
      title: atom.title,
      domain: atom.domain,
      subdomain: atom.subdomain,
      one_screen: atom.one_screen,
      bodyText,
    };
  });

  let indexJson = JSON.stringify(searchIndex);
  let indexSizeMb = Buffer.byteLength(indexJson) / (1024 * 1024);

  // If size > 2MB, truncate bodyText per atom to first 400 words
  if (indexSizeMb > 2.0) {
    console.log(`⚠️ Search index size (${indexSizeMb.toFixed(2)} MB) > 2MB. Truncating bodyText to first 400 words per atom...`);
    const truncatedIndex = searchIndex.map((item) => {
      const words = item.bodyText.split(/\s+/).slice(0, 400).join(" ");
      return { ...item, bodyText: words };
    });
    indexJson = JSON.stringify(truncatedIndex);
    indexSizeMb = Buffer.byteLength(indexJson) / (1024 * 1024);
  }

  fs.writeFileSync(SEARCH_INDEX_PATH, indexJson, "utf-8");

  console.log(`✅ Corpus Manifest successfully written to ${MANIFEST_PATH}`);
  console.log(`✅ Search Index successfully written to ${SEARCH_INDEX_PATH} (${indexSizeMb.toFixed(2)} MB)`);
  console.log(`   Atoms compiled: ${Object.keys(atomsManifest).length}`);
  console.log(`   Unverified fixtures quarantined: ${Object.values(atomsManifest).filter((a) => !a.verified).length}`);
  console.log(`   Role Families indexed: ${roles.length}`);
  console.log(`   Missing Atom Gaps tracked: ${missingAtoms.length}`);
}

buildCorpus();
