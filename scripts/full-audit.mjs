import fs from "fs";
import path from "path";
import { buildRequirementSet } from "../lib/corpus.js";

const MANIFEST_PATH = path.join(process.cwd(), "public", "corpus-manifest.json");
const ROLES_PATH = path.join(process.cwd(), "content", "roles.json");
const ATOMS_DIR = path.join(process.cwd(), "content", "atoms");

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
const roles = JSON.parse(fs.readFileSync(ROLES_PATH, "utf-8"));
const atoms = manifest.atoms;

const atomIds = Object.keys(atoms);
const totalAtoms = atomIds.length;

// Domain count
const domainCounts = {};
const subdomainSet = new Set();
const domainVariants = {}; // { domain: { real: 0, universal: 0 } }

let totalSources = 0;
let errorsFlaggedCount = 0;

// Graph degree tracking
const inDegree = {};  // how many atoms depend on this atom
const outDegree = {}; // how many prereqs this atom has

atomIds.forEach(id => {
  inDegree[id] = 0;
  outDegree[id] = atoms[id].prerequisites ? atoms[id].prerequisites.length : 0;
});

// Calculate in-degree & domain counts
atomIds.forEach(id => {
  const atom = atoms[id];
  domainCounts[atom.domain] = (domainCounts[atom.domain] || 0) + 1;
  subdomainSet.add(atom.subdomain);

  if (!domainVariants[atom.domain]) {
    domainVariants[atom.domain] = { real: 0, universal: 0 };
  }
  const hasRealVariant = atom.jurisdictions && atom.jurisdictions.some(j => j !== "universal");
  if (hasRealVariant) {
    domainVariants[atom.domain].real++;
  } else {
    domainVariants[atom.domain].universal++;
  }

  totalSources += (atom.sources ? atom.sources.length : 0);

  if (atom.prerequisites) {
    atom.prerequisites.forEach(pId => {
      if (inDegree[pId] !== undefined) {
        inDegree[pId]++;
      }
    });
  }
});

// Check errors_flagged in MDX files
const mdxFiles = fs.readdirSync(ATOMS_DIR).filter(f => f.endsWith(".mdx"));
mdxFiles.forEach(file => {
  const content = fs.readFileSync(path.join(ATOMS_DIR, file), "utf-8");
  if (content.includes("KNOWN ERROR")) {
    errorsFlaggedCount++;
  }
});

// Orphan atoms: no prereqs (outDegree == 0) AND nothing depends on them (inDegree == 0)
const orphanAtoms = atomIds.filter(id => outDegree[id] === 0 && inDegree[id] === 0);

// Top in-degree atoms
const sortedInDegree = [...atomIds].sort((a, b) => inDegree[b] - inDegree[a]);
const topInDegree = sortedInDegree.slice(0, 10).map(id => ({ id, title: atoms[id].title, inDegree: inDegree[id] }));

// Max Prerequisite Chain Depth
function getDepth(id, visited = new Set()) {
  if (visited.has(id)) return 0;
  visited.add(id);
  const prereqs = atoms[id]?.prerequisites || [];
  if (prereqs.length === 0) return 0;
  let maxChildDepth = 0;
  for (const p of prereqs) {
    if (atoms[p]) {
      maxChildDepth = Math.max(maxChildDepth, 1 + getDepth(p, new Set(visited)));
    }
  }
  return maxChildDepth;
}

let maxChainDepth = 0;
atomIds.forEach(id => {
  maxChainDepth = Math.max(maxChainDepth, getDepth(id));
});

console.log("===========================================================");
console.log("WARREN FINAL CORPUS AUDIT & COMPREHENSIVE HEALTH REPORT");
console.log("===========================================================");
console.log(`📌 TOTAL ATOMS: ${totalAtoms}`);
console.log(`📌 DOMAINS COUNT: ${Object.keys(domainCounts).length}`);
console.log(`📌 SUBDOMAINS COUNT: ${subdomainSet.size}`);
console.log(`📌 TOTAL SOURCES ACROSS CORPUS: ${totalSources}`);
console.log(`📌 ERRORS FLAGGED: ${errorsFlaggedCount}`);
console.log(`📌 MAX PREREQUISITE CHAIN DEPTH: ${maxChainDepth}`);
console.log(`📌 ORPHAN ATOMS (No Prereqs & No Dependents): ${orphanAtoms.length} (${orphanAtoms.join(", ") || "None"})`);

console.log("\n📊 ATOMS PER DOMAIN:");
console.table(domainCounts);

console.log("\n🌐 JURISDICTION VARIANTS VS UNIVERSAL PER DOMAIN:");
console.table(domainVariants);

console.log("\n🏆 TOP 10 MOST DEPENDED-UPON ATOMS (HIGHEST IN-DEGREE):");
console.table(topInDegree);

console.log("\n===========================================================");
console.log("EXAMPLE JOB DESCRIPTIONS COMPILATION RESULTS");
console.log("===========================================================");

const exampleJDs = [
  {
    name: "JD 1: Luxoft / UK Bank BA",
    text: "Luxoft is hiring a Senior Business Analyst for a UK bank in London to work on Basel 3.1 capital adequacy, RWA computation, and BCBS 239 risk data governance. Must understand PD, LGD, EAD, and SQL."
  },
  {
    name: "JD 2: India NBFC / Credit Risk Manager",
    text: "Leading NBFC in Bengaluru hiring Credit Risk Manager. Responsibilities include RBI returns preparation, Ind AS 109 compliance, and digital lending DLG guidelines."
  },
  {
    name: "JD 3: Capital Markets / Quantitative BA",
    text: "Global Investment Bank hiring Capital Markets Business Analyst in London for trade lifecycle, OTC derivatives, SA-CCR, VaR, and FRTB market risk."
  }
];

manifest.roles = roles;

exampleJDs.forEach(jd => {
  const detectedJur = detectJurisdiction(jd.text) || "universal";
  const matched = matchRoles(jd.text, roles);
  const reqSet = buildRequirementSet(matched, detectedJur, manifest);
  const missingAtoms = reqSet.missingAtoms || manifest.missingAtoms || [];
  
  console.log(`\n📄 ${jd.name}`);
  console.log(`   - Detected Jurisdiction: ${detectedJur}`);
  console.log(`   - Top Matched Roles: ${matched.slice(0, 3).map(m => `${m.role.label} (${m.score})`).join(", ")}`);
  console.log(`   - Reading Path Length: ${reqSet.coveredAtoms.length} atoms (${reqSet.totalReadingMinutes} mins)`);
  console.log(`   - Missing Atom Gaps: ${missingAtoms.length === 0 ? "None (0 gaps tracked!)" : missingAtoms.join(", ")}`);
});
