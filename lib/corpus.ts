import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  AtomFrontmatterSchema,
  AtomManifestItem,
  CorpusManifest,
  DomainTreeNode,
} from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content", "atoms");
const MANIFEST_PATH = path.join(process.cwd(), "public", "corpus-manifest.json");

/**
 * Builds the corpus manifest by reading all .mdx files in /content/atoms/,
 * validating schemas, checking reference integrity, detecting prerequisite cycles,
 * computing prerequisite depth, and building domain trees + reverse indices.
 */
export function generateCorpusManifest(): CorpusManifest {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith(".mdx"));
  const rawAtoms: Record<string, { frontmatter: any; filepath: string; filename: string }> = {};

  // Step 1 & 2: Read files and validate frontmatter against schema
  for (const filename of files) {
    const filepath = path.join(CONTENT_DIR, filename);
    const fileContent = fs.readFileSync(filepath, "utf-8");
    const { data } = matter(fileContent);

    const parseResult = AtomFrontmatterSchema.safeParse(data);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; ");
      throw new Error(
        `[BUILD ERROR] Invalid Atom Frontmatter in file "${filename}": ${formattedErrors}`
      );
    }

    const frontmatter = parseResult.data;

    if (rawAtoms[frontmatter.id]) {
      throw new Error(
        `[BUILD ERROR] Duplicate Atom ID "${frontmatter.id}" found in "${filename}" and "${rawAtoms[frontmatter.id].filename}"`
      );
    }

    rawAtoms[frontmatter.id] = {
      frontmatter,
      filepath: filename,
      filename,
    };
  }

  const allIds = new Set(Object.keys(rawAtoms));

  // Step 3: Resolve every prerequisite, see_also, and contrast_with ID
  for (const [id, { frontmatter, filename }] of Object.entries(rawAtoms)) {
    const references = [
      ...frontmatter.prerequisites.map((ref: string) => ({ ref, field: "prerequisites" })),
      ...frontmatter.see_also.map((ref: string) => ({ ref, field: "see_also" })),
      ...frontmatter.contrast_with.map((ref: string) => ({ ref, field: "contrast_with" })),
    ];

    for (const { ref, field } of references) {
      if (!allIds.has(ref)) {
        throw new Error(
          `[BUILD ERROR] Non-existent Atom reference "${ref}" in field "${field}" of Atom "${id}" (${filename})`
        );
      }
    }
  }

  // Step 4: Detect cycles in prerequisite graph (DFS)
  const visited: Record<string, "unvisited" | "visiting" | "visited"> = {};
  const recursionStack: string[] = [];

  function checkPrereqCycle(nodeId: string) {
    visited[nodeId] = "visiting";
    recursionStack.push(nodeId);

    const prereqs = rawAtoms[nodeId].frontmatter.prerequisites;
    for (const prereqId of prereqs) {
      if (visited[prereqId] === "visiting") {
        const cyclePath = [...recursionStack.slice(recursionStack.indexOf(prereqId)), prereqId].join(" -> ");
        throw new Error(
          `[BUILD ERROR] Cycle detected in prerequisite graph: ${cyclePath}`
        );
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

  // Step 5: Compute depth (longest prerequisite chain to a root)
  const depthMemo: Record<string, number> = {};

  function computeDepth(nodeId: string): number {
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

  const atomsManifest: Record<string, AtomManifestItem> = {};
  for (const [id, { frontmatter, filename }] of Object.entries(rawAtoms)) {
    const depth = computeDepth(id);
    atomsManifest[id] = {
      ...frontmatter,
      slug: id.toLowerCase(),
      depth,
      filepath: filename,
    };
  }

  // Step 6: Reverse index (which atoms list this atom as a prerequisite)
  const reverseIndex: Record<string, string[]> = {};
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

  // Step 7: Domain tree
  const domainMap: Record<
    string,
    Record<string, { id: string; title: string; type: any }[]>
  > = {};

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

  const domainTree: DomainTreeNode[] = Object.entries(domainMap).map(
    ([domain, subdomains]) => ({
      domain,
      subdomains: Object.entries(subdomains).map(([subdomain, atoms]) => ({
        subdomain,
        atoms,
      })),
    })
  );

  const manifest: CorpusManifest = {
    atoms: atomsManifest,
    reverseIndex,
    domainTree,
    generatedAt: new Date().toISOString(),
  };

  // Write to public/corpus-manifest.json
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

  return manifest;
}

/**
 * Reads the emitted manifest at runtime. Single source of truth.
 */
export function getCorpusManifest(): CorpusManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    // If manifest doesn't exist yet, build it
    return generateCorpusManifest();
  }
  const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
  return JSON.parse(raw) as CorpusManifest;
}
