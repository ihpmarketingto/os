import { describe, expect, it } from "vitest";
import {
  entriesNeedingReview,
  isStale,
  isUsableForClient,
  relevanceScore,
  renderKnowledgeContext,
  selectKnowledgeForContext,
  type KnowledgeEntry,
} from "./knowledge-retrieval";

const CLIENT_A = "client-a";
const CLIENT_B = "client-b";
const NOW = new Date("2026-08-03T12:00:00Z");

function entry(overrides: Partial<KnowledgeEntry> = {}): KnowledgeEntry {
  return {
    id: Math.random().toString(36).slice(2),
    clientId: null,
    kind: "playbook",
    title: "Entry",
    body: "Body text.",
    summary: "Summary.",
    tags: [],
    confidentiality: "agency_general",
    status: "active",
    reviewDueOn: null,
    updatedAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

/*
 * These are the tests that matter. Everything else in this file is about
 * output quality; this section is about not putting one client's private
 * information into another client's work.
 */
describe("client isolation", () => {
  it("never hands a client's confidential entry to another client", () => {
    const confidential = entry({ clientId: CLIENT_A, confidentiality: "client_confidential" });
    expect(isUsableForClient(confidential, CLIENT_A)).toBe(true);
    expect(isUsableForClient(confidential, CLIENT_B)).toBe(false);
  });

  it("never hands a confidential entry to work with no client attached", () => {
    const confidential = entry({ clientId: CLIENT_A, confidentiality: "client_confidential" });
    expect(isUsableForClient(confidential, null)).toBe(false);
  });

  it("shares agency-general material everywhere, including entries learned on a client", () => {
    const general = entry({ clientId: null, confidentiality: "agency_general" });
    const learnedOnClient = entry({ clientId: CLIENT_A, confidentiality: "agency_general" });
    expect(isUsableForClient(general, CLIENT_B)).toBe(true);
    expect(isUsableForClient(general, null)).toBe(true);
    // The lesson travels; the client's private data does not.
    expect(isUsableForClient(learnedOnClient, CLIENT_B)).toBe(true);
  });

  it("filters confidential entries out of a real selection and counts them", () => {
    const result = selectKnowledgeForContext(
      [
        entry({ id: "theirs", clientId: CLIENT_B, confidentiality: "client_confidential", title: "B margins" }),
        entry({ id: "mine", clientId: CLIENT_A, confidentiality: "client_confidential", title: "A margins" }),
        entry({ id: "general", title: "How we price" }),
      ],
      { clientId: CLIENT_A, now: NOW },
    );

    const ids = result.selected.map((s) => s.entry.id);
    expect(ids).toContain("mine");
    expect(ids).toContain("general");
    expect(ids).not.toContain("theirs");
    expect(result.excludedByIsolation).toBe(1);
  });

  it("does not let a short confidential entry slip in via the summary fallback", () => {
    // A tiny entry is cheap enough to always fit the budget. Isolation runs
    // before budgeting precisely so cheapness cannot buy inclusion.
    const result = selectKnowledgeForContext(
      [entry({ id: "theirs", clientId: CLIENT_B, confidentiality: "client_confidential", body: "x", summary: "y" })],
      { clientId: CLIENT_A, characterBudget: 100_000, now: NOW },
    );
    expect(result.selected).toEqual([]);
    expect(result.excludedByIsolation).toBe(1);
  });

  it("keeps isolation when a client asks about themselves by name", () => {
    // Relevance must never override isolation: a high-scoring confidential
    // entry belonging to someone else still cannot be selected.
    const result = selectKnowledgeForContext(
      [
        entry({
          id: "theirs",
          clientId: CLIENT_B,
          confidentiality: "client_confidential",
          title: "Hydrafacial pricing strategy",
          tags: ["hydrafacial", "pricing"],
        }),
      ],
      { clientId: CLIENT_A, query: "hydrafacial pricing strategy", now: NOW },
    );
    expect(result.selected).toEqual([]);
  });
});

describe("status and kind filtering", () => {
  it("only uses active entries", () => {
    const result = selectKnowledgeForContext(
      [
        entry({ id: "draft", status: "draft" }),
        entry({ id: "archived", status: "archived" }),
        entry({ id: "active", status: "active" }),
      ],
      { clientId: CLIENT_A, now: NOW },
    );
    expect(result.selected.map((s) => s.entry.id)).toEqual(["active"]);
  });

  it("restricts to requested kinds when asked", () => {
    const result = selectKnowledgeForContext(
      [entry({ id: "voice", kind: "brand_voice" }), entry({ id: "sop", kind: "sop" })],
      { clientId: CLIENT_A, kinds: ["brand_voice"], now: NOW },
    );
    expect(result.selected.map((s) => s.entry.id)).toEqual(["voice"]);
  });
});

describe("ranking", () => {
  it("puts policy and voice ahead of an FAQ", () => {
    const result = selectKnowledgeForContext(
      [entry({ id: "faq", kind: "faq" }), entry({ id: "policy", kind: "policy" }), entry({ id: "voice", kind: "brand_voice" })],
      { clientId: CLIENT_A, now: NOW },
    );
    expect(result.selected[0]!.entry.id).toBe("policy");
    expect(result.selected[1]!.entry.id).toBe("voice");
  });

  it("prefers the client's own material over the generic version", () => {
    const result = selectKnowledgeForContext(
      [
        entry({ id: "generic", kind: "brand_voice", title: "IHP voice" }),
        entry({ id: "theirs", kind: "brand_voice", clientId: CLIENT_A, title: "Client voice" }),
      ],
      { clientId: CLIENT_A, now: NOW },
    );
    expect(result.selected[0]!.entry.id).toBe("theirs");
  });

  it("demotes stale material below current material of the same kind", () => {
    const result = selectKnowledgeForContext(
      [
        entry({ id: "stale", kind: "offer", reviewDueOn: "2026-01-01" }),
        entry({ id: "current", kind: "offer", reviewDueOn: "2027-01-01" }),
      ],
      { clientId: CLIENT_A, now: NOW },
    );
    expect(result.selected[0]!.entry.id).toBe("current");
    expect(result.selected.find((s) => s.entry.id === "stale")!.stale).toBe(true);
  });

  it("scores tag matches above incidental word matches", () => {
    const tagged = entry({ tags: ["retention"], title: "Unrelated" });
    const mentioned = entry({ tags: [], title: "Something about retention" });
    expect(relevanceScore(tagged, "retention campaign")).toBeGreaterThan(
      relevanceScore(mentioned, "retention campaign"),
    );
  });

  it("scores nothing when the query has only short words", () => {
    expect(relevanceScore(entry({ tags: ["seo"] }), "do it now")).toBe(0);
  });
});

describe("budgeting", () => {
  it("falls back to the summary when the body will not fit", () => {
    const result = selectKnowledgeForContext(
      [
        entry({ id: "big", kind: "policy", title: "P", body: "x".repeat(500), summary: "short" }),
        entry({ id: "next", kind: "brand_voice", title: "V", body: "y".repeat(500), summary: "brief" }),
      ],
      { clientId: CLIENT_A, characterBudget: 520, now: NOW },
    );
    expect(result.selected[0]!.included).toBe("body");
    expect(result.selected[1]!.included).toBe("summary");
  });

  it("omits an entry that fits neither way and reports the count", () => {
    const result = selectKnowledgeForContext(
      [entry({ id: "huge", body: "x".repeat(5000), summary: null })],
      { clientId: CLIENT_A, characterBudget: 100, now: NOW },
    );
    expect(result.selected).toEqual([]);
    expect(result.omitted).toBe(1);
  });

  it("stays inside the budget", () => {
    const entries = Array.from({ length: 40 }, (_, i) =>
      entry({ id: `e${i}`, body: "x".repeat(400), summary: "s".repeat(80) }),
    );
    const result = selectKnowledgeForContext(entries, { clientId: CLIENT_A, characterBudget: 2000, now: NOW });
    expect(result.charactersUsed).toBeLessThanOrEqual(2000);
  });

  it("handles no entries at all", () => {
    const result = selectKnowledgeForContext([], { clientId: CLIENT_A, now: NOW });
    expect(result.selected).toEqual([]);
    expect(result.charactersUsed).toBe(0);
  });
});

describe("isStale and entriesNeedingReview", () => {
  it("treats a past review date as stale and no date as fine", () => {
    expect(isStale(entry({ reviewDueOn: "2026-01-01" }), NOW)).toBe(true);
    expect(isStale(entry({ reviewDueOn: "2027-01-01" }), NOW)).toBe(false);
    expect(isStale(entry({ reviewDueOn: null }), NOW)).toBe(false);
  });

  it("lists overdue active entries soonest first and ignores archived ones", () => {
    const due = entriesNeedingReview(
      [
        entry({ id: "later", reviewDueOn: "2026-06-01" }),
        entry({ id: "earlier", reviewDueOn: "2026-02-01" }),
        entry({ id: "archived", reviewDueOn: "2026-01-01", status: "archived" }),
        entry({ id: "fine", reviewDueOn: "2027-01-01" }),
      ],
      NOW,
    );
    expect(due.map((e) => e.id)).toEqual(["earlier", "later"]);
  });
});

describe("renderKnowledgeContext", () => {
  it("returns nothing for an empty selection", () => {
    expect(renderKnowledgeContext([])).toBe("");
  });

  it("warns the model inline about stale material rather than trusting the caller", () => {
    const rendered = renderKnowledgeContext([
      { entry: entry({ title: "Old offer", reviewDueOn: "2026-01-01" }), stale: true, included: "body" },
    ]);
    expect(rendered).toContain("Past its review date");
    expect(rendered).toContain("Old offer");
  });

  it("instructs the model not to invent offers or contradict policy", () => {
    const rendered = renderKnowledgeContext([
      { entry: entry({ title: "Pricing policy", kind: "policy" }), stale: false, included: "body" },
    ]);
    expect(rendered).toMatch(/do not contradict a policy or invent an offer/i);
  });

  it("uses the summary when that is what was selected", () => {
    const rendered = renderKnowledgeContext([
      { entry: entry({ title: "T", body: "FULL BODY", summary: "just the summary" }), stale: false, included: "summary" },
    ]);
    expect(rendered).toContain("just the summary");
    expect(rendered).not.toContain("FULL BODY");
  });
});
