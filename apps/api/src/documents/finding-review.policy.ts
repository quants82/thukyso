export type FindingReviewReason =
  | "AI_MARKED_FOR_REVIEW"
  | "LOW_CONFIDENCE"
  | "MISSING_EVIDENCE";

interface FindingForReview {
  type: string;
  confidence: number | null;
  page: number | null;
  section: string | null;
  quote: string | null;
}

export const HUMAN_REVIEW_CONFIDENCE_THRESHOLD = 0.8;

export function findingReviewReason(
  finding: FindingForReview
): FindingReviewReason | null {
  if (finding.type === "REQUIRES_REVIEW") return "AI_MARKED_FOR_REVIEW";
  if (
    finding.confidence === null ||
    finding.confidence < HUMAN_REVIEW_CONFIDENCE_THRESHOLD
  ) {
    return "LOW_CONFIDENCE";
  }
  if (
    finding.page === null &&
    !finding.section?.trim() &&
    !finding.quote?.trim()
  ) {
    return "MISSING_EVIDENCE";
  }
  return null;
}
