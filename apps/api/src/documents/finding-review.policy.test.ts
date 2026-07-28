import { describe, expect, it } from "vitest";
import {
  HUMAN_REVIEW_CONFIDENCE_THRESHOLD,
  findingReviewReason
} from "./finding-review.policy.js";

const clearFinding = {
  type: "DEADLINE",
  confidence: 0.95,
  page: 2,
  section: "Điều 3",
  quote: "Hoàn thành trước ngày 15/8"
};

describe("findingReviewReason", () => {
  it("does not interrupt the user for clear sourced extraction", () => {
    expect(findingReviewReason(clearFinding)).toBeNull();
  });

  it("requires review when Gemini explicitly marks ambiguity", () => {
    expect(
      findingReviewReason({ ...clearFinding, type: "REQUIRES_REVIEW" })
    ).toBe("AI_MARKED_FOR_REVIEW");
  });

  it("requires review below the confidence threshold", () => {
    expect(
      findingReviewReason({
        ...clearFinding,
        confidence: HUMAN_REVIEW_CONFIDENCE_THRESHOLD - 0.01
      })
    ).toBe("LOW_CONFIDENCE");
  });

  it("requires review when no source location or quote exists", () => {
    expect(
      findingReviewReason({
        ...clearFinding,
        page: null,
        section: null,
        quote: null
      })
    ).toBe("MISSING_EVIDENCE");
  });
});
