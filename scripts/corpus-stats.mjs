import fs from "fs";
import path from "path";
import matter from "gray-matter";

const atomsDir = path.join(process.cwd(), "content", "atoms");

function runCorpusStats() {
  console.log("=== WARREN CORPUS HEALTH & STATS REPORT ===");

  if (!fs.existsSync(atomsDir)) {
    console.error("No content/atoms directory found.");
    return;
  }

  const files = fs.readdirSync(atomsDir).filter((f) => f.endsWith(".mdx"));

  const statusCounts = { published: 0, fixture: 0, draft: 0 };
  const domainCounts = {};
  const subdomainCounts = {};
  let totalClaimMarkers = 0;
  let totalKnownErrors = 0;
  const atomsWithScores = [];

  const atomMap = {};
  for (const file of files) {
    const filePath = path.join(atomsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);
    atomMap[data.id] = { ...data, body };
  }

  // Calculate orphan count
  const nonPrereqAtoms = new Set(Object.keys(atomMap));
  for (const atom of Object.values(atomMap)) {
    if (atom.prerequisites) {
      atom.prerequisites.forEach((p) => nonPrereqAtoms.delete(p));
    }
  }

  for (const [id, atom] of Object.entries(atomMap)) {
    // Status
    const status = atom.status || "draft";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Domain
    const domain = atom.domain || "unsorted";
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;

    // Subdomain
    const subdomain = atom.subdomain || "unsorted";
    subdomainCounts[subdomain] = (subdomainCounts[subdomain] || 0) + 1;

    // Unverified claims count
    const claimsInBody = (atom.body.match(/\{\/\* UNVERIFIED CLAIM/g) || []).length;
    totalClaimMarkers += claimsInBody;

    // Known errors count
    const knownErrorsInBody = (atom.body.match(/\{\/\* KNOWN ERROR/gi) || []).length;
    totalKnownErrors += knownErrorsInBody;

    // Completeness score calculation (out of 6)
    let score = 0;
    if (atom.title) score++;
    if (atom.one_screen && atom.one_screen.length > 10) score++;
    if (atom.prerequisites && atom.prerequisites.length > 0) score++;
    if (atom.sources && atom.sources.length > 0) score++;
    if (atom.reading_minutes > 0) score++;
    if (claimsInBody === 0) score++;

    atomsWithScores.push({
      id: atom.id,
      title: atom.title,
      type: atom.type,
      domain: atom.domain,
      status: atom.status,
      score,
      readingMinutes: atom.reading_minutes,
      claimMarkers: claimsInBody,
      knownErrors: knownErrorsInBody,
    });
  }

  // Sort by completeness score descending
  atomsWithScores.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  console.log(`\n📌 TOTAL ATOMS IN CORPUS: ${files.length}`);

  console.log(`\nSTATUS BREAKDOWN:`);
  console.table(
    Object.entries(statusCounts).map(([st, cnt]) => ({ Status: st.toUpperCase(), Count: cnt }))
  );

  console.log(`\nDOMAIN BREAKDOWN:`);
  console.table(
    Object.entries(domainCounts).map(([dom, cnt]) => ({ Domain: dom, Count: cnt }))
  );

  console.log(`\nSUBDOMAIN BREAKDOWN:`);
  console.table(
    Object.entries(subdomainCounts).map(([sub, cnt]) => ({ Subdomain: sub, Count: cnt }))
  );

  console.log(`\n📊 SUMMARY METRICS:`);
  console.log(`   Orphan Root Nodes: ${nonPrereqAtoms.size}`);
  console.log(`   Total UNVERIFIED CLAIM Markers: ${totalClaimMarkers}`);
  console.log(`   errors_flagged: ${totalKnownErrors}`);

  console.log(`\n🏆 TOP 10 ATOMS WITH HIGHEST COMPLETENESS SCORES:`);
  console.table(
    atomsWithScores.slice(0, 10).map((a) => ({
      ID: a.id,
      Title: a.title,
      Status: a.Status || a.status,
      "Score (/6)": a.score,
      "Claim Markers": a.claimMarkers,
    }))
  );
}

runCorpusStats();
