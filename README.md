# WARREN

**A structured learning and authoring prototype for banking risk and regulation.** WARREN turns an MDX corpus into linked knowledge atoms, prerequisite reading paths, role based curricula, search, and a visual graph. Its intended readers are banking, credit risk, treasury, model risk, data, and regulatory professionals.

> **Maturity:** The interface and corpus pipeline are implemented, but the knowledge base is in review. The checked-in corpus contains **304 draft atoms across 11 domains and 11 role families; all 304 are marked `verified: false`**. Treat financial and regulatory content as unverified educational draft material, not professional advice.

## Explore the project

| Experience | What the source implements |
| --- | --- |
| [Corpus index](app/atoms/page.tsx) and [atom reader](app/atom/%5Bid%5D/page.tsx) | Domain and subdomain browsing, MDX reading, source labels, prerequisites, reverse links, recall prompts, and sequential navigation. |
| [Graph](components/CorpusGraph.tsx) | Interactive canvas map of prerequisite and related atom links, with domain and text filtering. |
| [Search](components/CommandPalette.tsx) | Client side ranked search over a generated 304 entry JSON index. |
| [Role curricula](app/roles/page.tsx) | 11 editorial role maps expanded with prerequisite atoms and estimated reading time. |
| [Currentness register](app/currentness/page.tsx) and [comparison page](app/compare/%5Bid%5D/page.tsx) | Date badges and a four jurisdiction comparison layout. Currentness uses a fixed reference date, and the corpus currently has no structured `<Delta>` blocks for the comparison cards. |
| [Author studio](app/studio/page.tsx) | Development only review queue, corpus counts, warnings, and heuristic completeness scoring. |

The content lives in [`content/atoms/`](content/atoms/) and [`content/roles.json`](content/roles.json). [`scripts/build-corpus.mjs`](scripts/build-corpus.mjs) validates frontmatter and writes [`public/corpus-manifest.json`](public/corpus-manifest.json) plus [`public/search-index.json`](public/search-index.json). The UI uses Next.js 16, React 19, TypeScript, MDX, Zod, D3, and Tailwind CSS. There is no application database or account system in the repository.

## Run locally

```bash
npm ci
npm run dev
```

Open the local address printed by Next.js. To refresh generated indexes after editing MDX, run `npm run build-corpus`. `npm test` runs the small Vitest corpus tests; `npm run build` runs the corpus generator first. The repository has no `output: "export"` setting, so its earlier claim of a guaranteed `/out` static export was not supported by configuration. These commands describe the repository scripts; this documentation review did not install packages or execute a build.

## Read before extending

- **[PROJECT_BLUEPRINT.md](PROJECT_BLUEPRINT.md)** explains the architecture, authoring workflow, data model, graph and curriculum algorithms, known gaps, and troubleshooting.
- The 304 draft atoms contain 629 source *labels* but no populated source URLs in the checked-in manifest. A label is a provenance lead, not source verification.
- The production build gate rejects atoms marked `published` while `verified: false`; it does not block draft atoms from appearing in the reader. The current corpus remains unpublished by its own status fields.

WARREN is strongest as a transparent product and information architecture prototype: it makes dependencies, jurisdiction context, and editorial trust state visible while leaving expert verification as an explicit future step.
