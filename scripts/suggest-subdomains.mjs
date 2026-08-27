import fs from "fs";
import path from "path";
import matter from "gray-matter";

const atomsDir = path.join(process.cwd(), "content", "atoms");
const suggestionsPath = path.join(process.cwd(), "public", "subdomain-suggestions.json");

const SUBDOMAIN_KEYWORD_RULES = [
  { subdomain: "risk-parameters", keywords: ["pd", "lgd", "ead", "expected loss", "probability of default", "loss given default", "exposure at default"] },
  { subdomain: "capital-requirements", keywords: ["basel", "rwa", "capital", "pillar 1", "pillar 2", "icaap", "sa-ccr", "large exposures"] },
  { subdomain: "financial-accounting", keywords: ["ifrs 9", "cecl", "ecl", "staging", "provisioning", "financial statement"] },
  { subdomain: "risk-data-governance", keywords: ["bcbs 239", "lineage", "data quality", "metadata", "etl", "sql", "reporting", "reconciliation"] },
  { subdomain: "counterparty-exposure", keywords: ["counterparty", "pfe", "isda", "csa", "netting", "cva", "wrong-way risk", "collateral", "repo"] },
  { subdomain: "machine-learning", keywords: ["machine learning", "regression", "random forest", "gradient boosting", "neural network", "hyperparameter", "feature engineering", "shap"] },
  { subdomain: "portfolio-forecasting", keywords: ["forecasting", "sarima", "churn", "nifty", "portfolio optimisation", "time-series", "cross-sectional"] },
  { subdomain: "underwriting-governance", keywords: ["underwriting", "retail credit", "scorecard", "decision rights", "validation", "monitoring"] },
];

function buildSubdomainSuggestions() {
  console.log("=== WARREN SUBDOMAIN CLUSTERING & SUGGESTIONS ENGINE ===");

  if (!fs.existsSync(atomsDir)) {
    console.error("No content/atoms directory found.");
    return;
  }

  const files = fs.readdirSync(atomsDir).filter((f) => f.endsWith(".mdx"));
  const suggestions = {};

  for (const file of files) {
    const filePath = path.join(atomsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);

    if (data.subdomain === "unsorted") {
      const fullText = `${data.title} ${body}`.toLowerCase();
      let bestMatch = "general-concepts";
      let highestCount = 0;

      for (const rule of SUBDOMAIN_KEYWORD_RULES) {
        let count = 0;
        for (const kw of rule.keywords) {
          if (fullText.includes(kw)) {
            count += (fullText.match(new RegExp(kw, "gi")) || []).length;
          }
        }
        if (count > highestCount) {
          highestCount = count;
          bestMatch = rule.subdomain;
        }
      }

      suggestions[data.id] = {
        proposedSubdomain: bestMatch,
        confidenceScore: highestCount,
        matchedKeywords: highestCount > 0 ? "keyword-density" : "fallback",
      };
    }
  }

  fs.writeFileSync(suggestionsPath, JSON.stringify(suggestions, null, 2), "utf-8");
  console.log(`✅ Subdomain suggestions written to ${suggestionsPath}`);
  console.log(`   Unsorted atoms processed: ${Object.keys(suggestions).length}\n`);
}

buildSubdomainSuggestions();
