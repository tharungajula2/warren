import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('public/corpus-manifest.json', 'utf-8'));
const roles = JSON.parse(fs.readFileSync('content/roles.json', 'utf-8'));

const testJds = [
  {
    name: "JD 1: Luxoft UK Senior Business Analyst",
    text: "Luxoft is hiring a Senior Business Analyst for a UK bank in London to work on Basel 3.1 capital adequacy, RWA computation, and BCBS 239 risk data governance. Must understand PD, LGD, EAD, and SQL."
  },
  {
    name: "JD 2: Indian NBFC Credit Risk Manager",
    text: "Leading NBFC in Bengaluru hiring Credit Risk Manager. Responsibilities include RBI returns preparation and Ind AS 109 compliance."
  },
  {
    name: "JD 3: Global Engineering Center UK Bank Risk Analyst",
    text: "Global engineering center in Bengaluru is hiring a Risk Analyst for a UK bank. Candidates must have expertise in PRA regulatory requirements and Basel 3.1 rules."
  }
];

function detectJurisdiction(jdText) {
  const text = jdText.toLowerCase();

  if (
    text.includes("uk bank") ||
    text.includes("london") ||
    text.includes("pra") ||
    text.includes("basel 3.1") ||
    text.includes("fca") ||
    text.includes("boe") ||
    text.includes("bank of england")
  ) {
    return "UK";
  }

  if (
    text.includes("rbi") ||
    text.includes("nbfc") ||
    text.includes("ind as") ||
    text.includes("bengaluru") ||
    text.includes("mumbai")
  ) {
    return "IN";
  }

  if (text.includes("eba") || text.includes("crr") || text.includes("ecb")) {
    return "EU";
  }

  if (
    text.includes("fed") ||
    text.includes("occ") ||
    text.includes("cecl") ||
    text.includes("fdic")
  ) {
    return "US";
  }

  return null;
}

function matchRoles(jdText, roleFamilies) {
  const text = jdText.toLowerCase();
  const matches = [];

  for (const role of roleFamilies) {
    let matchedSignalsCount = 0;
    const matchedSignals = [];

    for (const signal of role.signals) {
      if (text.includes(signal.toLowerCase())) {
        matchedSignalsCount++;
        matchedSignals.push(signal);
      }
    }

    if (matchedSignalsCount > 0) {
      const score = Math.round((matchedSignalsCount / role.signals.length) * 100);
      matches.push({
        role,
        score,
        matchedSignals,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}

function buildRequirementSet(matches, targetJurisdiction, manifest) {
  const requiredAtomMap = new Map();
  const missingAtomsSet = new Set();

  for (const match of matches) {
    for (const item of match.role.atoms) {
      if (manifest.atoms[item.id]) {
        const existing = requiredAtomMap.get(item.id);
        if (!existing || item.weight > existing.weight) {
          requiredAtomMap.set(item.id, {
            atom: manifest.atoms[item.id],
            weight: item.weight,
            reason: `Required by ${match.role.label} (weight ${item.weight})`,
          });
        }
      } else {
        missingAtomsSet.add(item.id);
      }
    }
  }

  const expandedMap = new Map(requiredAtomMap);
  const queue = Array.from(requiredAtomMap.keys());

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentItem = expandedMap.get(currentId);
    if (!currentItem) continue;

    for (const prereqId of currentItem.atom.prerequisites) {
      if (manifest.atoms[prereqId]) {
        if (!expandedMap.has(prereqId)) {
          const prereqAtom = manifest.atoms[prereqId];
          expandedMap.set(prereqId, {
            atom: prereqAtom,
            weight: 1,
            reason: `Prerequisite for ${currentItem.atom.id} (${currentItem.atom.title})`,
          });
          queue.push(prereqId);
        }
      } else {
        missingAtomsSet.add(prereqId);
      }
    }
  }

  const coveredAtoms = Array.from(expandedMap.values());
  coveredAtoms.sort((a, b) => {
    if (a.atom.depth !== b.atom.depth) return a.atom.depth - b.atom.depth;
    return a.atom.id.localeCompare(b.atom.id);
  });

  return {
    coveredAtoms,
    missingAtoms: Array.from(missingAtomsSet),
  };
}

console.log("===========================================================");
console.log("WARREN JD COMPILER — THREE EXAMPLE JDs AUDIT REPORT");
console.log("===========================================================");

testJds.forEach((jd, idx) => {
  const jur = detectJurisdiction(jd.text);
  const matches = matchRoles(jd.text, roles);
  const reqSet = buildRequirementSet(matches, jur, manifest);

  console.log(`\n--- ${jd.name} ---`);
  console.log(`INPUT TEXT: "${jd.text}"`);
  console.log(`DETECTED JURISDICTION: ${jur || "UNIVERSAL"}`);
  console.log(`TOP 3 MATCHED ROLE FAMILIES:`);
  matches.slice(0, 3).forEach((m, i) => {
    console.log(`  ${i+1}. ${m.role.label} (${m.score}% match - signals: ${m.matchedSignals.join(', ')})`);
  });
  console.log(`READING PATH LENGTH: ${reqSet.coveredAtoms.length} Covered Atoms`);
  console.log(`REMAINING MISSING GAPS: ${reqSet.missingAtoms.length} (${reqSet.missingAtoms.join(', ') || 'NONE - 100% COMPLETE'})`);
});
