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
      { id: "REG-01", weight: 3 },
      { id: "CR-03", weight: 3 },
      { id: "CR-07", weight: 3 },
    ],
  },
  {
    id: "risk-data-bcbs239",
    label: "Risk Data & BCBS 239",
    description: "Risk data aggregation principles.",
    jurisdiction_hint: null,
    signals: ["BCBS 239", "data lineage", "data quality", "data governance", "golden source", "metadata"],
    atoms: [
      { id: "REG-01", weight: 2 },
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
      { id: "REG-02", weight: 3 },
    ],
  },
];

const mockManifest: CorpusManifest = {
  atoms: {
    "FND-18": {
      id: "FND-18",
      title: "Fundamental Financial Mathematics",
      type: "concept",
      domain: "foundation",
      subdomain: "quantitative-basics",
      one_screen: "Financial mathematics foundation.",
      prerequisites: [],
      see_also: [],
      contrast_with: [],
      jurisdictions: ["universal"],
      perishable: false,
      status: "fixture",
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
      title: "Credit Exposure and Expected Loss",
      type: "mechanism",
      domain: "credit-risk",
      subdomain: "risk-parameters",
      one_screen: "Expected loss formula.",
      prerequisites: ["FND-18"],
      see_also: [],
      contrast_with: [],
      jurisdictions: ["universal"],
      perishable: false,
      status: "fixture",
      verified: false,
      reading_minutes: 4,
      sources: [],
      slug: "cr-03",
      depth: 1,
      currentness: "durable",
      filepath: "CR-03.mdx",
    },
    "CR-07": {
      id: "CR-07",
      title: "Probability of Default",
      type: "concept",
      domain: "credit-risk",
      subdomain: "risk-parameters",
      one_screen: "PD estimation.",
      prerequisites: ["CR-03"],
      see_also: [],
      contrast_with: [],
      jurisdictions: ["universal", "UK"],
      perishable: false,
      status: "fixture",
      verified: false,
      reading_minutes: 4,
      sources: [],
      slug: "cr-07",
      depth: 2,
      currentness: "durable",
      filepath: "CR-07.mdx",
    },
    "REG-01": {
      id: "REG-01",
      title: "Basel Capital Framework",
      type: "procedure",
      domain: "regulatory",
      subdomain: "capital-requirements",
      one_screen: "Basel capital ratios.",
      prerequisites: ["FND-18"],
      see_also: [],
      contrast_with: [],
      jurisdictions: ["universal"],
      perishable: true,
      as_of: "2026-08-28",
      status: "fixture",
      verified: false,
      reading_minutes: 5,
      sources: [],
      slug: "reg-01",
      depth: 1,
      currentness: "fresh",
      filepath: "REG-01.mdx",
    },
  },
  reverseIndex: {},
  domainTree: [],
  roles: mockRoles,
  missingAtoms: ["REG-03"],
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
