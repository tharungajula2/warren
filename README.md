# WARREN — Banking Risk & Regulatory Knowledge System

WARREN is a jurisdiction-aware, static technical operating manual for banking, credit risk, market risk, treasury, and regulatory professionals.

It structures complex financial regulations, mathematical models, and operational frameworks into discrete, teachable **Knowledge Atoms** connected in a Directed Acyclic Graph (DAG).

---

## 🏛 Core Architecture & Philosophy

1. **Dense Technical Typography**: Designed like an operating manual, using IBM Plex Mono and Source Sans 3 with tabular numerals and hairline borders (`#23272D`).
2. **Zero Runtime Database**: Static build compiled directly from MDX fixtures (`/content/atoms/`) into `/public/corpus-manifest.json`.
3. **Cross-Jurisdiction Matrix**: Core baseline treatments paired with jurisdiction-specific regulatory deltas (`IN`, `UK`, `EU`, `US`).
4. **Deterministic Matcher & Compiler**: Pure client-side job description capability matching engine (`/lib/jd-matcher.ts`). Zero AI dependency.

---

## 📋 Atom Frontmatter Schema

Every knowledge unit is defined as an MDX file in `/content/atoms/{ID}.mdx` adhering to the Zod schema (`/lib/schema.ts`):

```yaml
---
id: CR-07
title: Probability of Default
type: concept                     # concept | mechanism | procedure | delta | example | reference
domain: credit-risk
subdomain: risk-parameters
one_screen: >
  PD is the likelihood a borrower fails to meet obligations over a defined horizon.
prerequisites: [CR-03, FND-18]
see_also: [CR-08, CR-09]
contrast_with: [CR-08]
jurisdictions: [universal, IN, UK, EU, US]
perishable: false
as_of: 2026-08-28
next_effective_date: null
status: fixture                   # draft | fixture | published
verified: false                   # boolean: true | false (REQUIRED)
reading_minutes: 4
sources:
  - label: Basel Committee on Banking Supervision CRE 36
    url: https://www.bis.org/basel_framework/chapter/CRE/36.htm
    accessed: 2026-08-28
---
```

---

## 🛡️ Trust Quarantine & Strict Verification Rule

- **`verified: false`**: Required on all unverified fixtures and draft content. Displays an unmissable amber banner (`UNVERIFIED FIXTURE`) on atom pages, registers, comparison matrices, and compiler paths.
- **`verified: true`**: **May ONLY be set by a human domain expert** who has personally read and verified the primary regulatory source. No script, compiler, or AI agent may set `verified: true`.
- **Production Build Gate**: `scripts/build-corpus.mjs` enforces that when `NODE_ENV=production`, any atom with `status: 'published'` and `verified: false` **BLOCKS AND FAILS THE BUILD IMMEDIATELY**.

---

## 🛠️ Authoring Tooling

To scaffold a new knowledge atom:

```bash
npm run new-atom -- --id CR-12 --domain credit-risk --subdomain risk-parameters
```

Or using positional arguments:

```bash
node scripts/new-atom.mjs CR-12 credit-risk risk-parameters
```

---

## 🧪 Testing & Verification

Run the Vitest unit test suite:

```bash
npm test
```

Build the static corpus manifest and Next.js static site:

```bash
npm run build
```

Start dev server:

```bash
npm run dev
```

---

## 🚀 Production Deployment

WARREN compiles to a 100% static Next.js production build (`/out` or standard Next.js Vercel deployment).
