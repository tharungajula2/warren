import fs from "fs";
import path from "path";
import matter from "gray-matter";

const atomsDir = path.join(process.cwd(), "content", "atoms");
const suggestionsPath = path.join(process.cwd(), "public", "prereq-suggestions.json");

function buildPrereqSuggestions() {
  console.log("=== WARREN PREREQUISITE SUGGESTIONS ENGINE ===");

  if (!fs.existsSync(atomsDir)) {
    console.error("No content/atoms directory found.");
    return;
  }

  const files = fs.readdirSync(atomsDir).filter((f) => f.endsWith(".mdx"));
  const allAtoms = {};

  for (const file of files) {
    const filePath = path.join(atomsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);
    allAtoms[data.id] = { ...data, body };
  }

  const suggestions = {};

  for (const [id, atom] of Object.entries(allAtoms)) {
    // Only analyze draft atoms or atoms with empty prerequisites
    if (atom.status === "draft" || !atom.prerequisites || atom.prerequisites.length === 0) {
      const candidates = [];

      for (const [targetId, targetAtom] of Object.entries(allAtoms)) {
        if (targetId === id) continue;

        // Check if body mentions targetId (e.g. "CR-03")
        const idRegex = new RegExp(`\\b${targetId}\\b`, "i");
        if (idRegex.test(atom.body)) {
          candidates.push({
            prereqId: targetId,
            evidence: `Explicit atom ID mention "${targetId}" in text`,
            confidence: "HIGH",
          });
          continue;
        }

        // Check if body mentions targetAtom title (e.g. "Probability of Default")
        const cleanTitle = targetAtom.title.toLowerCase().trim();
        if (cleanTitle.length > 5 && atom.body.toLowerCase().includes(cleanTitle)) {
          candidates.push({
            prereqId: targetId,
            evidence: `Matched title phrase "${targetAtom.title}"`,
            confidence: "MEDIUM",
          });
        }
      }

      if (candidates.length > 0) {
        suggestions[id] = candidates;
      }
    }
  }

  fs.writeFileSync(suggestionsPath, JSON.stringify(suggestions, null, 2), "utf-8");
  console.log(`✅ Prerequisite suggestions successfully written to ${suggestionsPath}`);
  console.log(`   Atoms with suggestions: ${Object.keys(suggestions).length}\n`);
}

buildPrereqSuggestions();
