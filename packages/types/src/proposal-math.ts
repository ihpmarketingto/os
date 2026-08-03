/**
 * Proposal pricing.
 *
 * The trap this exists to prevent is adding a recurring fee to a one-time
 * fee and presenting the result as a single number. "$12,000" meaning
 * "$4,000 to build plus $2,000 a month for four months" is the kind of
 * figure that gets agreed to and then argued about. Every total here says
 * which kind of money it is, and there is no function that returns one
 * blended number.
 */

export const LINE_CADENCES = ["one_time", "monthly", "quarterly"] as const;
export type LineCadence = (typeof LINE_CADENCES)[number];

export interface ProposalLine {
  id: string;
  description: string;
  cadence: LineCadence;
  quantity: number;
  unitPrice: number;
}

export function lineTotal(line: ProposalLine): number {
  return line.quantity * line.unitPrice;
}

export interface ProposalTotals {
  /** Charged once, at the start. */
  oneTime: number;
  /** Charged every month. Quarterly lines are divided, not summed. */
  monthlyRecurring: number;
  /** What the client pays on the first invoice: the one-time work plus one month. */
  firstInvoice: number;
  /** Recurring value over twelve months. Excludes the one-time work. */
  annualRecurring: number;
  /** True when the proposal mixes both kinds, so the UI must say so. */
  hasMixedCadence: boolean;
  lineCount: number;
}

/** Monthly equivalent of a line, so cadences can be compared like for like. */
export function monthlyEquivalent(line: ProposalLine): number {
  const total = lineTotal(line);
  switch (line.cadence) {
    case "monthly":
      return total;
    case "quarterly":
      return total / 3;
    case "one_time":
      return 0;
  }
}

export function calculateProposalTotals(lines: ProposalLine[]): ProposalTotals {
  let oneTime = 0;
  let monthlyRecurring = 0;
  let hasOneTime = false;
  let hasRecurring = false;

  for (const line of lines) {
    if (line.cadence === "one_time") {
      oneTime += lineTotal(line);
      hasOneTime = true;
    } else {
      monthlyRecurring += monthlyEquivalent(line);
      hasRecurring = true;
    }
  }

  return {
    oneTime,
    monthlyRecurring,
    firstInvoice: oneTime + monthlyRecurring,
    annualRecurring: monthlyRecurring * 12,
    hasMixedCadence: hasOneTime && hasRecurring,
    lineCount: lines.length,
  };
}

/**
 * The single number stored on the proposal record. First-invoice value is
 * used deliberately: it is the only figure that is unambiguously money the
 * client hands over, and it does not overstate a retainer as though the
 * whole year were already won.
 */
export function proposalHeadlineAmount(lines: ProposalLine[]): number {
  return calculateProposalTotals(lines).firstInvoice;
}

export const PROPOSAL_STATUSES = ["draft", "sent", "accepted", "declined", "expired"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** A proposal cannot go back to draft once it has been sent to a client. */
export function allowedNextProposalStatuses(current: ProposalStatus): ProposalStatus[] {
  switch (current) {
    case "draft":
      return ["sent"];
    case "sent":
      return ["accepted", "declined", "expired"];
    case "accepted":
    case "declined":
    case "expired":
      return [];
  }
}

export interface ProposalReadiness {
  ready: boolean;
  blockers: string[];
}

/**
 * What has to be true before a proposal is fit to go to a client. Checked in
 * the action rather than only in the UI, so an empty or unpriced quote
 * cannot be marked sent by any route.
 */
export function checkProposalReadiness(input: {
  clientId: string | null;
  lines: ProposalLine[];
  validUntil: string | null;
}): ProposalReadiness {
  const blockers: string[] = [];

  if (!input.clientId) blockers.push("No client is attached.");
  if (input.lines.length === 0) blockers.push("There are no line items.");

  const totals = calculateProposalTotals(input.lines);
  if (input.lines.length > 0 && totals.firstInvoice <= 0) {
    blockers.push("Everything is priced at zero.");
  }
  if (!input.validUntil) blockers.push("No expiry date is set.");

  return { ready: blockers.length === 0, blockers };
}
