import fs from "fs";
import path from "path";
import matter from "gray-matter";

const atomsDir = path.join(process.cwd(), "content", "atoms");

function runCleanup() {
  console.log("=== WARREN CORPUS CLEANUP & AUDIT ===");

  if (!fs.existsSync(atomsDir)) {
    console.error("No content/atoms directory found.");
    return;
  }

  const files = fs.readdirSync(atomsDir).filter((f) => f.endsWith(".mdx"));
  const deletedFiles = [];
  const remainingAtoms = [];
  const projectSpecificMatches = [];
  const readingMinutesDistribution = {};

  for (const file of files) {
    const filePath = path.join(atomsDir, file);
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(rawContent);
    const atomId = data.id || file.replace(".mdx", "");
    const title = data.title || "";

    // 1. DELETE all APP-* atoms
    if (atomId.startsWith("APP-")) {
      fs.unlinkSync(filePath);
      deletedFiles.push({ id: atomId, reason: "APP prefix (personal project narrative)" });
      continue;
    }

    // 2. DELETE file-title atoms starting with em dash or matching masterclass titles
    const isEmDashTitle = /^[\u2014\u2013\-\—\s]*—|^\s*—|^\s*---/i.test(title);
    const isMasterclassTitle = /masterclass/i.test(title);

    if (isEmDashTitle || isMasterclassTitle) {
      fs.unlinkSync(filePath);
      deletedFiles.push({ id: atomId, title, reason: "File-level masterclass header atom" });
      continue;
    }

    // 3. Recompute reading_minutes = ceil(wordCount / 200) with floor of 1
    const cleanBodyText = body
      .replace(/```[\s\S]*?```/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\{.*?}/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const wordCount = cleanBodyText.split(/\s+/).filter(Boolean).length;
    const computedReadingMinutes = Math.max(1, Math.ceil(wordCount / 200));

    readingMinutesDistribution[computedReadingMinutes] =
      (readingMinutesDistribution[computedReadingMinutes] || 0) + 1;

    // Update file frontmatter if reading_minutes changed
    if (data.reading_minutes !== computedReadingMinutes) {
      data.reading_minutes = computedReadingMinutes;
      const updatedStr = matter.stringify(body, data);
      fs.writeFileSync(filePath, updatedStr, "utf-8");
    }

    // 4. Scan for project-specific content and first-person narrative
    const projectKeywords = [
      "LOC-IQ",
      "LendingClub",
      "NIFTY",
      "Parents Health OS",
      "my",
      "I ",
      "our project",
      "this project",
      "in my",
      "my team",
      "my role",
    ];

    const foundPhrases = [];
    const lowerBody = body.toLowerCase();

    for (const kw of projectKeywords) {
      const kwLower = kw.toLowerCase();
      if (kwLower === "i ") {
        if (/\bI\b/.test(body)) {
          foundPhrases.push("I");
        }
      } else if (kwLower === "my") {
        if (/\bmy\b/i.test(body)) {
          foundPhrases.push("my");
        }
      } else if (lowerBody.includes(kwLower)) {
        foundPhrases.push(kw);
      }
    }

    if (foundPhrases.length > 0) {
      projectSpecificMatches.push({
        id: atomId,
        title,
        phrases: Array.from(new Set(foundPhrases)).join(", "),
      });
    }

    remainingAtoms.push({
      id: atomId,
      title,
      wordCount,
      readingMinutes: computedReadingMinutes,
    });
  }

  console.log(`\n🗑️ DELETED ATOMS (${deletedFiles.length}):`);
  console.table(deletedFiles);

  console.log(`\n📊 REMAINING ATOMS COUNT: ${remainingAtoms.length}`);

  console.log(`\n⏱️ READING MINUTES DISTRIBUTION:`);
  console.table(
    Object.entries(readingMinutesDistribution).map(([min, count]) => ({
      "Reading Minutes": `${min} MIN`,
      "Atom Count": count,
    }))
  );

  console.log(`\n🔍 PROJECT-SPECIFIC & FIRST-PERSON SCAN RESULTS (${projectSpecificMatches.length}):`);
  console.table(projectSpecificMatches);
}

runCleanup();
