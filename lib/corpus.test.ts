import { describe, it, expect } from "vitest";
import { getCorpusManifest, getPrerequisiteTrail, buildRequirementSet } from "./corpus";

describe("Corpus Manifest & Prerequisite Resolution", () => {
  it("loads corpus manifest with 275 atoms and 11 roles", () => {
    const manifest = getCorpusManifest();
    expect(Object.keys(manifest.atoms).length).toBe(275);
    expect(manifest.roles.length).toBe(11);
  });

  it("resolves prerequisite trails correctly for root atoms", () => {
    const trailResult = getPrerequisiteTrail(["FND-01"]);
    expect(trailResult.totalAtoms).toBeGreaterThan(0);
    expect(trailResult.trail[0].id).toBe("FND-01");
  });

  it("expands prerequisites into a valid topological order without duplicates for real roles", () => {
    const manifest = getCorpusManifest();
    const role = manifest.roles.find((r) => r.id === "credit-model-validation") || manifest.roles[0];
    const reqSet = buildRequirementSet([{ role }], role.jurisdiction_hint, manifest);

    expect(reqSet.coveredAtoms.length).toBeGreaterThan(0);

    // Verify no duplicates
    const atomIds = reqSet.coveredAtoms.map((item) => item.atom.id);
    const uniqueIds = new Set(atomIds);
    expect(atomIds.length).toBe(uniqueIds.size);

    // Verify topological order: all prerequisites appear before the atoms that need them
    const posMap = new Map<string, number>();
    reqSet.coveredAtoms.forEach((item, idx) => {
      posMap.set(item.atom.id, idx);
    });

    reqSet.coveredAtoms.forEach((item, idx) => {
      item.atom.prerequisites.forEach((prereqId) => {
        if (posMap.has(prereqId)) {
          const prereqPos = posMap.get(prereqId)!;
          expect(prereqPos).toBeLessThan(idx);
        }
      });
    });
  });
});
