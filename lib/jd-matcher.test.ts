import { describe, it, expect } from "vitest";
import { matchRoles, detectJurisdiction, buildRequirementSet } from "./jd-matcher";
import { CorpusManifest, RoleFamily } from "./schema";

const mockRoles: RoleFamily[] = [
  {
    id: "basel-capital-reporting",
    label: "Basel Capital & RWA Reporting",
    description: "Basel capital adequacy calculation.",
    jurisdiction_hint: null,
    signals: ["Basel", "RWA", "capital adequacy", "CRR", "COREP", "capital calculation", "output floor", "IRB", "standardised approach"],
    atoms: [
      { id: "CAP-04", weight: 3 },
      { id: "CAP-09", weight: 3 },
      { id: "CR-03", weight: 3 },
    ],
  },
  {
    id: "risk-data-bcbs239",
    label: "Risk Data & BCBS 239",
    description: "Risk data aggregation principles.",
    jurisdiction_hint: null,
    signals: ["BCBS 239", "data lineage", "data quality", "data governance", "golden source", "metadata"],
    atoms: [
      { id: "CAP-09", weight: 2 },
      { id: "CR-03", weight: 2 },
    ],
  },
  {
    id: "treasury-alm-liquidity",
    label: "Treasury ALM & Liquidity Risk",
    description: "Asset-liability management.",
    jurisdiction_hint: null,
    signals: ["ALM", "IRRBB", "LCR", "NSFR", "liquidity risk"],
    atoms: [
      { id: "TLM-14", weight: 3 },
    ],
  },
];

const mockManifest: CorpusManifest = {
  atoms: {
    "FND-18": {
      id: "FND-18",
      title: "Quantiles and Tail Risk",
      type: "concept",
      domain: "foundation",
      subdomain: "unsorted",
      one_screen: "Financial mathematics foundation.",
      prerequisites: [],
      see_also: [],
      contrast_with: [],
      jurisdictions: ["universal"],
      perishable: false,
      status: "draft",
      verified: false,
      reading_minutes: 3,
      sources: [],
      slug: "fnd-18",
      depth: 0,
      currentness: "durable",
      filepath: "FND-18.mdx",
    },
    "CR-03": {
      id: "CR-03",
      title: "Exposure and Aggregation Levels",
      type: "concept",
      domain: "credit-risk",
      subdomain: "unsorted",
      one_screen: "Exposure aggregation.",
      prerequisites: ["FND-18"],
      see_also: [],
      contrast_with: [],
      jurisdictions: ["universal"],
      perishable: false,
      status: "draft",
      verified: false,
      reading_minutes: 3,
      sources: [],
      slug: "cr-03",
      depth: 1,
      currentness: "durable",
      filepath: "CR-03.mdx",
    },
    "CAP-09": {
      id: "CAP-09",
      title: "Risk Weights and Risk-Weighted Assets",
      type: "concept",
      domain: "regulatory-capital",
      subdomain: "unsorted",
      one_screen: "RWA calculation.",
      prerequisites: ["CR-03"],
      see_also: [],
      contrast_with: [],
      jurisdictions: ["universal"],
      perishable: false,
      status: "draft",
      verified: false,
      reading_minutes: 3,
      sources: [],
      slug: "cap-09",
      depth: 2,
      currentness: "durable",
      filepath: "CAP-09.mdx",
    },
    "CAP-04": {
      id: "CAP-04",
      title: "The Regulatory Capital Stack",
      type: "reference",
      domain: "regulatory-capital",
      subdomain: "unsorted",
      one_screen: "Basel capital stack.",
      prerequisites: ["FND-18"],
      see_also: [],
      contrast_with: [],
      jurisdictions: ["universal"],
      perishable: true,
      as_of: "2026-08-28",
      status: "draft",
      verified: false,
      reading_minutes: 3,
      sources: [],
      slug: "cap-04",
      depth: 1,
      currentness: "fresh",
      filepath: "CAP-04.mdx",
    },
  },
  reverseIndex: {},
  domainTree: [],
  roles: mockRoles,
  missingAtoms: ["DAT-01"],
  lintWarnings: [],
  generatedAt: new Date().toISOString(),
};

describe("JD Matcher Unit Tests", () => {
  it("matches Luxoft-style JD to basel-capital-reporting and risk-data-bcbs239 in top 3, and detects UK", () => {
    const luxoftJd = "Luxoft is hiring a Senior Business Analyst for a UK bank in London to work on Basel 3.1 capital adequacy, RWA computation, and BCBS 239 risk data governance. Must understand PD, LGD, EAD, and SQL.";

    const matches = matchRoles(luxoftJd, mockRoles);
    expect(matches.length).toBeGreaterThan(0);

    const topThreeIds = matches.slice(0, 3).map((m) => m.role.id);
    expect(topThreeIds).toContain("basel-capital-reporting");
    expect(topThreeIds).toContain("risk-data-bcbs239");

    const jurisdiction = detectJurisdiction(luxoftJd);
    expect(jurisdiction).toBe("UK");
  });

  it("detects IN jurisdiction for Bengaluru posting mentioning RBI and NBFC", () => {
    const inJd = "Leading NBFC in Bengaluru hiring Credit Risk Manager. Responsibilities include RBI returns preparation and Ind AS 109 compliance.";
    const jur = detectJurisdiction(inJd);
    expect(jur).toBe("IN");
  });

  it("detects UK jurisdiction (not IN) for a Bengaluru posting mentioning UK PRA and Basel 3.1", () => {
    const mixedJd = "Global engineering center in Bengaluru is hiring a Risk Analyst for a UK bank. Candidates must have expertise in PRA regulatory requirements and Basel 3.1 rules.";
    const jur = detectJurisdiction(mixedJd);
    expect(jur).toBe("UK");
  });

  it("returns no matches and does not throw on empty input string", () => {
    expect(matchRoles("", mockRoles)).toEqual([]);
    expect(detectJurisdiction("")).toBeNull();
  });

  it("expands prerequisites into a valid topological order without duplicates", () => {
    const matches = matchRoles("Basel capital adequacy BCBS 239", mockRoles);
    const reqSet = buildRequirementSet(matches, "UK", mockManifest);

    expect(reqSet.coveredAtoms.length).toBeGreaterThan(0);

    // Verify topological order (depth ascending)
    for (let i = 0; i < reqSet.coveredAtoms.length - 1; i++) {
      expect(reqSet.coveredAtoms[i].atom.depth).toBeLessThanOrEqual(
        reqSet.coveredAtoms[i + 1].atom.depth
      );
    }

    // Verify no duplicates
    const atomIds = reqSet.coveredAtoms.map((item) => item.atom.id);
    const uniqueIds = new Set(atomIds);
    expect(atomIds.length).toBe(uniqueIds.size);
  });
});
