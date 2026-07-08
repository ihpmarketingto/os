import { describe, expect, it } from "vitest";
import { canPublishLandingPage, summariseQaRun, QA_CHECKLIST } from "./landing-page-gate";

describe("summariseQaRun", () => {
  it("fails on an empty run — no QA is not a pass", () => {
    expect(summariseQaRun([])).toBe("fail");
  });

  it("fails if any item fails, regardless of the rest", () => {
    expect(
      summariseQaRun([
        { check: "Desktop layout", result: "pass" },
        { check: "UTM capture", result: "fail" },
        { check: "Page speed", result: "warning" },
      ]),
    ).toBe("fail");
  });

  it("warns if any item warns and nothing fails", () => {
    expect(
      summariseQaRun([
        { check: "Desktop layout", result: "pass" },
        { check: "Page speed", result: "warning" },
      ]),
    ).toBe("warning");
  });

  it("passes only when every item passes", () => {
    expect(summariseQaRun(QA_CHECKLIST.map((check) => ({ check, result: "pass" as const })))).toBe("pass");
  });
});

describe("canPublishLandingPage", () => {
  const ready = { projectStatus: "approved_to_publish", latestQaOverall: "pass" as const, clientApproved: true };

  it("allows publish only when all three gates pass", () => {
    expect(canPublishLandingPage(ready)).toEqual({ allowed: true, reasons: [] });
  });

  it("blocks without client approval", () => {
    const result = canPublishLandingPage({ ...ready, clientApproved: false });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Client approval");
  });

  it("blocks when the latest QA failed", () => {
    const result = canPublishLandingPage({ ...ready, latestQaOverall: "fail" });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("QA run failed");
  });

  it("blocks when no QA has ever run", () => {
    const result = canPublishLandingPage({ ...ready, latestQaOverall: null });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("No QA run");
  });

  it("blocks from the wrong status even with QA and approval in place", () => {
    const result = canPublishLandingPage({ ...ready, projectStatus: "qa" });
    expect(result.allowed).toBe(false);
  });

  it("allows publish with a warning-level QA run (warnings are visible, not blocking)", () => {
    expect(canPublishLandingPage({ ...ready, latestQaOverall: "warning" }).allowed).toBe(true);
  });
});
