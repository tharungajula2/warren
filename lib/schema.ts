import { z } from "zod";

export const AtomTypeSchema = z.enum([
  "concept",
  "mechanism",
  "procedure",
  "delta",
  "example",
  "reference",
]);
export type AtomType = z.infer<typeof AtomTypeSchema>;

export const JurisdictionSchema = z.enum(["universal", "IN", "UK", "EU", "US"]);
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

export const AtomStatusSchema = z.enum(["draft", "fixture", "published"]);
export type AtomStatus = z.infer<typeof AtomStatusSchema>;

export type CurrentnessStatus = "fresh" | "ageing" | "stale" | "future" | "durable";

const DateOrStringSchema = z
  .union([z.string(), z.date()])
  .transform((val) => {
    if (val instanceof Date) {
      return val.toISOString().split("T")[0];
    }
    return val;
  });

export const SourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  accessed: DateOrStringSchema.optional(),
});
export type SourceItem = z.infer<typeof SourceSchema>;

export const AtomFrontmatterSchema = z
  .object({
    id: z.string().regex(/^[A-Z]{2,4}-\d{2,3}(-[A-Z0-9]+)?$/, {
      message: "Atom ID must match regex format e.g. CR-07 or CR-07-EX",
    }),
    title: z.string().min(1, "Title is required"),
    type: AtomTypeSchema,
    domain: z.string().min(1, "Domain slug is required"),
    subdomain: z.string().min(1, "Subdomain slug is required"),
    one_screen: z.string().min(1, "one_screen is required"),
    prerequisites: z.array(z.string()).default([]),
    see_also: z.array(z.string()).default([]),
    contrast_with: z.array(z.string()).default([]),
    jurisdictions: z.array(JurisdictionSchema).min(1, "At least one jurisdiction is required"),
    perishable: z.boolean().default(false),
    as_of: DateOrStringSchema.nullable().optional(),
    next_effective_date: DateOrStringSchema.nullable().optional(),
    status: AtomStatusSchema.default("fixture"),
    verified: z.boolean({
      message: "Field 'verified' is required (boolean: true | false)",
    }),
    reading_minutes: z.number().positive(),
    sources: z.array(SourceSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.perishable && !data.as_of) {
        return false;
      }
      return true;
    },
    {
      message: "Field 'as_of' is required when perishable is true",
      path: ["as_of"],
    }
  );

export type AtomFrontmatter = z.infer<typeof AtomFrontmatterSchema>;

export interface AtomManifestItem extends AtomFrontmatter {
  slug: string;
  depth: number;
  filepath: string;
  currentness: CurrentnessStatus;
}

export interface DomainTreeNode {
  domain: string;
  subdomains: {
    subdomain: string;
    atoms: { id: string; title: string; type: AtomType; status: AtomStatus; verified: boolean }[];
  }[];
}

export interface LintWarning {
  rule: string;
  atomId?: string;
  message: string;
}

export interface RoleRequirementItem {
  id: string;
  weight: 3 | 2 | 1;
}

export interface RoleFamily {
  id: string;
  label: string;
  description: string;
  jurisdiction_hint: Jurisdiction | null;
  signals: string[];
  atoms: RoleRequirementItem[];
}

export interface CorpusManifest {
  atoms: Record<string, AtomManifestItem>;
  reverseIndex: Record<string, string[]>;
  domainTree: DomainTreeNode[];
  roles: RoleFamily[];
  missingAtoms: string[];
  lintWarnings: LintWarning[];
  generatedAt: string;
}
