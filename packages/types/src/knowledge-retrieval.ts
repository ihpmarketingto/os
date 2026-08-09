/**
 * Selecting IHP's own knowledge to ground an AI draft.
 *
 * One rule outranks everything else here: a client-confidential entry may
 * only ever be retrieved for the client it belongs to. Getting this wrong
 * does not produce a bug report, it produces one client's pricing appearing
 * in another client's proposal. The isolation check therefore runs first,
 * before any ranking or budgeting, and there is no code path that reaches
 * the output without passing through it.
 */

export const KNOWLEDGE_KINDS = [
  "sop",
  "playbook",
  "brand_voice",
  "offer",
  "icp",
  "objection",
  "winning_pattern",
  "positioning",
  "policy",
  "faq",
] as const;

export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export type Confidentiality = "agency_general" | "client_confidential";

export interface KnowledgeEntry {
  id: string;
  /** Null means agency-wide. */
  clientId: string | null;
  kind: KnowledgeKind;
  title: string;
  body: string;
  summary: string | null;
  tags: string[];
  confidentiality: Confidentiality;
  status: "draft" | "active" | "archived";
  reviewDueOn: string | null;
  updatedAt: string;
}

/**
 * Whether an entry may be used when producing work for `clientId`.
 *
 * Agency-general entries are usable everywhere. Client-confidential entries
 * are usable only for their own client. An entry belonging to a client but
 * marked agency-general is still usable everywhere, which is the point of
 * the flag: "we learned this doing their work and it is a general lesson"
 * is different from "this is their private information".
 */
export function isUsableForClient(entry: KnowledgeEntry, clientId: string | null): boolean {
  if (entry.confidentiality === "client_confidential") {
    // No client context means no confidential material, full stop. A general
    // draft with no client attached must never pull anyone's private notes.
    if (clientId === null) return false;
    return entry.clientId === clientId;
  }
  return true;
}

/** Entries past their review date are still returned, but flagged. */
export function isStale(entry: KnowledgeEntry, now = new Date()): boolean {
  if (!entry.reviewDueOn) return false;
  const [year, month, day] = entry.reviewDueOn.split("-").map(Number);
  if (!year || !month || !day) return false;
  return new Date(year, month - 1, day).getTime() < now.getTime();
}

/**
 * Kinds that should lead the context when present. Voice and policy change
 * how everything else is expressed, so they go first and are least likely to
 * be cut by the budget.
 */
const KIND_PRIORITY: Record<KnowledgeKind, number> = {
  policy: 100,
  brand_voice: 90,
  positioning: 80,
  offer: 70,
  icp: 65,
  winning_pattern: 60,
  playbook: 55,
  objection: 50,
  sop: 45,
  faq: 30,
};

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

/** Overlap between the request and an entry's tags, title and summary. */
export function relevanceScore(entry: KnowledgeEntry, query: string): number {
  const words = new Set(normalise(query).split(/\s+/).filter((w) => w.length > 3));
  if (words.size === 0) return 0;

  let score = 0;
  for (const tag of entry.tags) {
    if (words.has(normalise(tag).trim())) score += 6;
  }
  const haystack = normalise(`${entry.title} ${entry.summary ?? ""}`);
  for (const word of words) {
    if (haystack.includes(word)) score += 2;
  }
  return score;
}

export interface RetrievalOptions {
  /** The client the work is for. Null for agency-general work. */
  clientId: string | null;
  /** What is being asked, used for relevance. */
  query?: string;
  /** Restrict to particular kinds. */
  kinds?: KnowledgeKind[];
  /** Rough character ceiling for the assembled context. */
  characterBudget?: number;
  now?: Date;
}

export interface SelectedKnowledge {
  entry: KnowledgeEntry;
  stale: boolean;
  /** Whether the full body was included or only the summary. */
  included: "body" | "summary";
}

export interface RetrievalResult {
  selected: SelectedKnowledge[];
  /** Entries that passed isolation but did not fit the budget. */
  omitted: number;
  /** How many were excluded because they belong to a different client. */
  excludedByIsolation: number;
  charactersUsed: number;
}

export const DEFAULT_CHARACTER_BUDGET = 12_000;

/**
 * Picks the knowledge to put in front of the model.
 *
 * Order of operations matters and is deliberate: isolate, then drop anything
 * not active, then rank, then fit to budget. Budgeting last means a
 * confidential entry can never be squeezed in by being short.
 */
export function selectKnowledgeForContext(
  entries: KnowledgeEntry[],
  options: RetrievalOptions,
): RetrievalResult {
  const budget = options.characterBudget ?? DEFAULT_CHARACTER_BUDGET;
  const now = options.now ?? new Date();

  let excludedByIsolation = 0;
  const permitted: KnowledgeEntry[] = [];

  for (const entry of entries) {
    if (!isUsableForClient(entry, options.clientId)) {
      excludedByIsolation += 1;
      continue;
    }
    if (entry.status !== "active") continue;
    if (options.kinds && !options.kinds.includes(entry.kind)) continue;
    permitted.push(entry);
  }

  const ranked = permitted
    .map((entry) => ({
      entry,
      score:
        KIND_PRIORITY[entry.kind] +
        relevanceScore(entry, options.query ?? "") * 4 +
        // A client's own material outranks the generic version of the same thing.
        (entry.clientId && entry.clientId === options.clientId ? 25 : 0) -
        // Stale material is still offered, but yields to current material.
        (isStale(entry, now) ? 40 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));

  const selected: SelectedKnowledge[] = [];
  let charactersUsed = 0;
  let omitted = 0;

  for (const { entry } of ranked) {
    const bodyCost = entry.title.length + entry.body.length;
    const summaryCost = entry.title.length + (entry.summary?.length ?? 0);

    if (charactersUsed + bodyCost <= budget) {
      selected.push({ entry, stale: isStale(entry, now), included: "body" });
      charactersUsed += bodyCost;
    } else if (entry.summary && charactersUsed + summaryCost <= budget) {
      // Better a one-line summary of the right policy than nothing at all.
      selected.push({ entry, stale: isStale(entry, now), included: "summary" });
      charactersUsed += summaryCost;
    } else {
      omitted += 1;
    }
  }

  return { selected, omitted, excludedByIsolation, charactersUsed };
}

/**
 * Renders the selection into a prompt block. Stale entries carry a warning
 * inline so the model is told not to state them as current, rather than the
 * caller being trusted to have checked.
 */
export function renderKnowledgeContext(selection: SelectedKnowledge[]): string {
  if (selection.length === 0) return "";

  const blocks = selection.map(({ entry, stale, included }) => {
    const content = included === "body" ? entry.body : (entry.summary ?? "");
    const staleNote = stale
      ? "\n[Past its review date. Do not state this as current without checking.]"
      : "";
    return `### ${entry.title} (${entry.kind.replace(/_/g, " ")})${staleNote}\n${content}`;
  });

  return [
    "The following is IHP Marketing's own material. Ground your answer in it,",
    "and do not contradict a policy or invent an offer that is not listed here.",
    "",
    ...blocks,
  ].join("\n");
}

/** Entries needing a review, soonest first. */
export function entriesNeedingReview(entries: KnowledgeEntry[], now = new Date()): KnowledgeEntry[] {
  return entries
    .filter((e) => e.status === "active" && isStale(e, now))
    .sort((a, b) => (a.reviewDueOn ?? "").localeCompare(b.reviewDueOn ?? ""));
}
