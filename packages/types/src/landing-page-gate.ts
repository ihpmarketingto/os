/**
 * Landing Page Factory governance (spec section 22). The publish gate is
 * pure logic so it is unit-testable and cannot drift between the UI and
 * the server action that enforces it.
 */

/** Pre-publish QA checklist, verbatim from the spec. */
export const QA_CHECKLIST = [
  "Desktop layout",
  "Mobile layout",
  "Tablet layout",
  "CTA links",
  "Form validation",
  "Form submission",
  "Booking links",
  "Ticket links",
  "Checkout links",
  "Thank-you workflow",
  "CRM routing",
  "Email notifications",
  "GA4 events",
  "Meta events",
  "Google Ads conversions",
  "UTM capture",
  "SEO metadata",
  "Open Graph image",
  "Page speed",
  "Accessibility",
  "Legal disclaimers",
  "Brand consistency",
  "Canadian spelling",
  "Broken links",
  "Missing images",
  "Cookie consent",
  "Error states",
] as const;

export type QaResult = "pass" | "warning" | "fail";

export interface QaItem {
  check: string;
  result: QaResult;
  note?: string;
}

/** A run fails if any item fails; warns if any item warns; passes otherwise. */
export function summariseQaRun(items: QaItem[]): QaResult {
  if (items.length === 0) return "fail";
  if (items.some((i) => i.result === "fail")) return "fail";
  if (items.some((i) => i.result === "warning")) return "warning";
  return "pass";
}

export interface PublishGateInputs {
  projectStatus: string;
  latestQaOverall: QaResult | null;
  clientApproved: boolean;
}

export interface PublishGateResult {
  allowed: boolean;
  reasons: string[];
}

/**
 * Production publish requires, without exception: the project sitting in
 * approved_to_publish, a latest QA run that did not fail, and a recorded
 * client approval. "Never generate live production deployment without
 * explicit approval" is the spec's hardest rule — this is where it lives.
 */
export function canPublishLandingPage(input: PublishGateInputs): PublishGateResult {
  const reasons: string[] = [];

  if (input.projectStatus !== "approved_to_publish") {
    reasons.push(`Project is in "${input.projectStatus}", not approved_to_publish.`);
  }
  if (input.latestQaOverall === null) {
    reasons.push("No QA run has been recorded.");
  } else if (input.latestQaOverall === "fail") {
    reasons.push("The latest QA run failed. Fix the failures and re-run QA.");
  }
  if (!input.clientApproved) {
    reasons.push("Client approval has not been recorded.");
  }

  return { allowed: reasons.length === 0, reasons };
}
