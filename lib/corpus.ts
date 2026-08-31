import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  AtomFrontmatterSchema,
  AtomManifestItem,
  CorpusManifest,
  DomainTreeNode,
  LintWarning,
  CurrentnessStatus,
  RoleFamily,
  Jurisdiction,
} from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content", "atoms");
const ROLES_PATH = path.join(process.cwd(), "content", "roles.json");
const MANIFEST_PATH = path.join(process.cwd(), "public", "corpus-manifest.json");

function computeCurrentness(frontmatter: any, buildDate = new Date("2026-08-28")): CurrentnessStatus {
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
  const rawAtoms: Record<string, { frontmatter: any; content: string; filepath: string; filename: string }> = {};

  // Step 1 & 2: Read files and validate frontmatter against schema
  for (const filename of files) {
    const filepath = path.join(CONTENT_DIR, filename);
    const fileContent = fs.readFileSync(filepath, "utf-8");
    const { data, content } = matter(fileContent);

    if (/<OneScreen[\s/>]/i.test(content)) {
      throw new Error(
        `[BUILD ERROR] <OneScreen> tag found in body of "${filename}". <OneScreen> must NOT be used inside MDX bodies.`
      );
    }

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
      content,
      filepath: filename,
      filename,
    };
  }

  const allIds = new Set(Object.keys(rawAtoms));

  // Build Gate for production
  if (process.env.NODE_ENV === "production") {
    const offending = [];
    for (const [id, { frontmatter }] of Object.entries(rawAtoms)) {
      if (frontmatter.status === "published" && frontmatter.verified === false) {
        offending.push(`${id} (${frontmatter.title})`);
      }
    }
    if (offending.length > 0) {
      throw new Error(
        `[BUILD GATE FAILED] Production build blocked! ${offending.length} published atom(s) have verified: false:\n - ` +
          offending.join("\n - ")
      );
    }
  }

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

  // Step 5: Compute depth
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
    const currentness = computeCurrentness(frontmatter);
    atomsManifest[id] = {
      ...frontmatter,
      slug: id.toLowerCase(),
      depth,
      currentness,
      filepath: filename,
    };
  }

  // Step 6: Reverse index
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
    Record<string, { id: string; title: string; type: any; status: any; verified: boolean }[]>
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
      status: atom.status,
      verified: atom.verified,
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

  // Roles Registry & Missing Atoms Validation
  let roles: RoleFamily[] = [];
  const missingAtomsSet = new Set<string>();

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

  // Lint warnings pass
  const lintWarnings: LintWarning[] = [];
  const inboundLinksCount: Record<string, number> = {};
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

  const manifest: CorpusManifest = {
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

  return manifest;
}

export function getCorpusManifest(): CorpusManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return generateCorpusManifest();
  }
  const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
  return JSON.parse(raw) as CorpusManifest;
}

export interface PrerequisiteTrailResult {
  trail: AtomManifestItem[];
  totalAtoms: number;
  totalReadingMinutes: number;
}

export function getPrerequisiteTrail(targetIds: string[]): PrerequisiteTrailResult {
  const manifest = getCorpusManifest();
  const collectedIds = new Set<string>();

  function collectAncestors(id: string) {
    if (collectedIds.has(id)) return;
    const atom = manifest.atoms[id];
    if (!atom) return;
    collectedIds.add(id);
    for (const prereqId of atom.prerequisites) {
      collectAncestors(prereqId);
    }
  }

  for (const id of targetIds) {
    collectAncestors(id);
  }

  const trailAtoms = Array.from(collectedIds)
    .map((id) => manifest.atoms[id])
    .filter(Boolean);

  trailAtoms.sort((a, b) => {
    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }
    return a.id.localeCompare(b.id);
  });

  const totalReadingMinutes = trailAtoms.reduce(
    (sum, item) => sum + item.reading_minutes,
    0
  );

  return {
    trail: trailAtoms,
    totalAtoms: trailAtoms.length,
    totalReadingMinutes,
  };
}

export interface CoveredRequirementAtom {
  atom: AtomManifestItem;
  weight: 3 | 2 | 1;
  isPrerequisite: boolean;
}

export interface GapRequirementAtom {
  id: string;
  weight: 3 | 2 | 1;
}

export interface RequirementSet {
  coveredAtoms: CoveredRequirementAtom[];
  gapAtoms: GapRequirementAtom[];
  totalReadingMinutes: number;
  jurisdictionNotes: {
    atomId: string;
    jurisdiction: Jurisdiction;
  }[];
}

export function buildRequirementSet(
  matches: { role: RoleFamily; score?: number; matchedSignals?: string[] }[],
  jurisdiction: Jurisdiction | null,
  manifest: CorpusManifest
): RequirementSet {
  const topMatches = matches.slice(0, 3);
  const targetAtomWeights: Record<string, { weight: 3 | 2 | 1; isDirect: boolean }> = {};

  for (const match of topMatches) {
    for (const item of match.role.atoms) {
      const existing = targetAtomWeights[item.id];
      if (!existing || item.weight > existing.weight) {
        targetAtomWeights[item.id] = { weight: item.weight, isDirect: true };
      }
    }
  }

  const allNeededAtomIds = new Set<string>(Object.keys(targetAtomWeights));

  function expandAncestors(atomId: string, parentWeight: 3 | 2 | 1) {
    const atom = manifest.atoms[atomId];
    if (!atom) return;

    for (const prereqId of atom.prerequisites) {
      if (!targetAtomWeights[prereqId]) {
        const prereqWeight = (Math.min(parentWeight, 2)) as 3 | 2 | 1;
        targetAtomWeights[prereqId] = { weight: prereqWeight, isDirect: false };
      }
      allNeededAtomIds.add(prereqId);
      expandAncestors(prereqId, parentWeight);
    }
  }

  for (const atomId of Array.from(allNeededAtomIds)) {
    const entry = targetAtomWeights[atomId];
    if (entry) {
      expandAncestors(atomId, entry.weight);
    }
  }

  const coveredAtomsMap: Record<string, CoveredRequirementAtom> = {};
  const gapAtomsMap: Record<string, GapRequirementAtom> = {};

  for (const atomId of Object.keys(targetAtomWeights)) {
    const entry = targetAtomWeights[atomId];
    const atom = manifest.atoms[atomId];

    if (atom) {
      coveredAtomsMap[atomId] = {
        atom,
        weight: entry.weight,
        isPrerequisite: !entry.isDirect,
      };
    } else {
      gapAtomsMap[atomId] = {
        id: atomId,
        weight: entry.weight,
      };
    }
  }

  const coveredAtoms = Object.values(coveredAtomsMap);
  coveredAtoms.sort((a, b) => {
    if (a.atom.depth !== b.atom.depth) {
      return a.atom.depth - b.atom.depth;
    }
    if (a.weight !== b.weight) {
      return b.weight - a.weight;
    }
    return a.atom.id.localeCompare(b.atom.id);
  });

  const gapAtoms = Object.values(gapAtomsMap);
  gapAtoms.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));

  const totalReadingMinutes = coveredAtoms.reduce(
    (sum, item) => sum + item.atom.reading_minutes,
    0
  );

  const jurisdictionNotes: { atomId: string; jurisdiction: Jurisdiction }[] = [];
  if (jurisdiction && jurisdiction !== "universal") {
    for (const item of coveredAtoms) {
      if (item.atom.jurisdictions.includes(jurisdiction)) {
        jurisdictionNotes.push({
          atomId: item.atom.id,
          jurisdiction,
        });
      }
    }
  }

  return {
    coveredAtoms,
    gapAtoms,
    totalReadingMinutes,
    jurisdictionNotes,
  };
}
