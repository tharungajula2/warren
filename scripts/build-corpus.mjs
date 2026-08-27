import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";

const CONTENT_DIR = path.join(process.cwd(), "content", "atoms");
const MANIFEST_PATH = path.join(process.cwd(), "public", "corpus-manifest.json");

const AtomTypeSchema = z.enum([
  "concept",
  "mechanism",
  "procedure",
  "delta",
  "example",
  "reference",
]);

const JurisdictionSchema = z.enum(["universal", "IN", "UK", "EU", "US"]);
const AtomStatusSchema = z.enum(["draft", "published"]);

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
    status: AtomStatusSchema.default("published"),
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

function buildCorpus() {
  console.log("=== WARREN CORPUS COMPILER ===");

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith(".mdx"));
  console.log(`Found ${files.length} MDX files in ${CONTENT_DIR}`);

  const rawAtoms = {};

  for (const filename of files) {
    const filepath = path.join(CONTENT_DIR, filename);
    const fileContent = fs.readFileSync(filepath, "utf-8");
    const { data } = matter(fileContent);

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
      filepath: filename,
      filename,
    };
  }

  const allIds = new Set(Object.keys(rawAtoms));

  // Resolve references
  for (const [id, { frontmatter, filename }] of Object.entries(rawAtoms)) {
    const references = [
      ...frontmatter.prerequisites.map((ref) => ({ ref, field: "prerequisites" })),
      ...frontmatter.see_also.map((ref) => ({ ref, field: "see_also" })),
      ...frontmatter.contrast_with.map((ref) => ({ ref, field: "contrast_with" })),
    ];

    for (const { ref, field } of references) {
      if (!allIds.has(ref)) {
        console.error(
          `\n❌ [BUILD ERROR] Non-existent Atom reference "${ref}" in field "${field}" of Atom "${id}" (${filename})\n`
        );
        process.exit(1);
      }
    }
  }

  // Detect prerequisite cycles
  const visited = {};
  const recursionStack = [];

  function checkPrereqCycle(nodeId) {
    visited[nodeId] = "visiting";
    recursionStack.push(nodeId);

    const prereqs = rawAtoms[nodeId].frontmatter.prerequisites;
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

    const prereqs = rawAtoms[nodeId].frontmatter.prerequisites;
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

  const atomsManifest = {};
  for (const [id, { frontmatter, filename }] of Object.entries(rawAtoms)) {
    const depth = computeDepth(id);
    atomsManifest[id] = {
      ...frontmatter,
      slug: id.toLowerCase(),
      depth,
      filepath: filename,
    };
  }

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
    });
  }

  const domainTree = Object.entries(domainMap).map(([domain, subdomains]) => ({
    domain,
    subdomains: Object.entries(subdomains).map(([subdomain, atoms]) => ({
      subdomain,
      atoms,
    })),
  }));

  const manifest = {
    atoms: atomsManifest,
    reverseIndex,
    domainTree,
    generatedAt: new Date().toISOString(),
  };

  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`✅ Corpus Manifest successfully written to ${MANIFEST_PATH}`);
  console.log(`   Atoms compiled: ${Object.keys(atomsManifest).length}`);
  console.log(`   Domains indexed: ${domainTree.length}\n`);
}

buildCorpus();
