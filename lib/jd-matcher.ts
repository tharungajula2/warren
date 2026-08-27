import {
  CorpusManifest,
  Jurisdiction,
  RoleFamily,
  AtomManifestItem,
} from "./schema";

export interface RoleMatch {
  role: RoleFamily;
  score: number;
  matchedSignals: string[];
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

/**
 * Normalizes input text for keyword matching.
 */

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Matches a job description text against the 12 role families.
 */
export function matchRoles(jdText: string, roles: RoleFamily[]): RoleMatch[] {
  if (!jdText || !jdText.trim()) {
    return [];
  }

  const normalizedJd = normalizeText(jdText);
  const results: RoleMatch[] = [];

  for (const role of roles) {
    let score = 0;
    const matchedSignals: string[] = [];

    for (const signal of role.signals) {
      const normalizedSignal = normalizeText(signal);
      if (!normalizedSignal) continue;

      // Whole phrase regex matching
      const regex = new RegExp(`\\b${normalizedSignal.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
      if (regex.test(normalizedJd)) {
        // Multi-word signals count double (weight 2), single-word count weight 1
        const words = normalizedSignal.split(" ").length;
        const weight = words > 1 ? 2 : 1;

        score += weight;
        matchedSignals.push(signal);
      }
    }

    if (score > 0) {
      results.push({
        role,
        score,
        matchedSignals,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Detects regulatory jurisdiction from JD text.
 * Rule: Regulator/standard matches take heavy precedence (10 pts) over employer city location (1 pt).
 * A Bengaluru posting for a UK bank (mentioning PRA) detects UK.
 */
export function detectJurisdiction(jdText: string): Jurisdiction | null {
  if (!jdText || !jdText.trim()) {
    return null;
  }

  const text = normalizeText(jdText);

  const scores: Record<Jurisdiction, number> = {
    universal: 0,
    IN: 0,
    UK: 0,
    EU: 0,
    US: 0,
  };

  // Regulators / Standards (10 points each)
  const regulators: Record<Jurisdiction, string[]> = {
    universal: [],
    IN: ["rbi", "ind as", "nbfc", "priority sector", "rbi returns"],
    UK: ["pra", "fca", "basel 3 1", "ss1 23"],
    EU: ["eba", "crr", "ecb", "srep", "finrep"],
    US: ["fed", "occ", "cecl", "sr 11-7", "ffiec"],
  };

  // Cities / Locations (1 point each)
  const cities: Record<Jurisdiction, string[]> = {
    universal: [],
    IN: ["mumbai", "bengaluru", "bangalore", "delhi", "pune", "hyderabad"],
    UK: ["london", "uk", "united kingdom", "edinburgh"],
    EU: ["frankfurt", "paris", "brussels", "amsterdam"],
    US: ["new york", "us", "united states", "chicago"],
  };

  for (const jur of ["IN", "UK", "EU", "US"] as Jurisdiction[]) {
    // Check regulators (10 points)
    for (const reg of regulators[jur]) {
      const regex = new RegExp(`\\b${reg.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
      if (regex.test(text)) {
        scores[jur] += 10;
      }
    }

    // Check cities (1 point)
    for (const city of cities[jur]) {
      const regex = new RegExp(`\\b${city.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
      if (regex.test(text)) {
        scores[jur] += 1;
      }
    }
  }

  let maxScore = 0;
  let topJurisdiction: Jurisdiction | null = null;
  let isTie = false;

  for (const jur of ["IN", "UK", "EU", "US"] as Jurisdiction[]) {
    const score = scores[jur];
    if (score > maxScore) {
      maxScore = score;
      topJurisdiction = jur;
      isTie = false;
    } else if (score === maxScore && score > 0) {
      isTie = true;
    }
  }

  if (isTie || maxScore === 0) {
    return null;
  }

  return topJurisdiction;
}

/**
 * Builds the requirement set from top matched role families and jurisdiction.
 * Expands prerequisite chains, topologically sorts reading path, and isolates gaps.
 */
export function buildRequirementSet(
  matches: RoleMatch[],
  jurisdiction: Jurisdiction | null,
  manifest: CorpusManifest
): RequirementSet {
  const topMatches = matches.slice(0, 3);
  const targetAtomWeights: Record<string, { weight: 3 | 2 | 1; isDirect: boolean }> = {};

  // Merge direct requirements from top 3 families
  for (const match of topMatches) {
    for (const item of match.role.atoms) {
      const existing = targetAtomWeights[item.id];
      if (!existing || item.weight > existing.weight) {
        targetAtomWeights[item.id] = { weight: item.weight, isDirect: true };
      }
    }
  }

  // Expand prerequisites recursively
  const allNeededAtomIds = new Set<string>(Object.keys(targetAtomWeights));

  function expandAncestors(atomId: string, parentWeight: 3 | 2 | 1) {
    const atom = manifest.atoms[atomId];
    if (!atom) return;

    for (const prereqId of atom.prerequisites) {
      if (!targetAtomWeights[prereqId]) {
        // Prerequisites inherit parent weight as supporting (or max 2)
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

  // Partition into covered and gap atoms
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

  // Topological sort of covered atoms: lower depth first -> weight (3->2->1) -> ID
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

  // Surface jurisdiction notes for items in path that have variants for active jurisdiction
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
