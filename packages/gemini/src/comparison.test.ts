import { describe, expect, it } from "vitest";
import { comparisonResultSchema } from "./schemas/comparison.js";

describe("comparisonResultSchema", () => {
  it("accepts a sourced material change", () => {
    expect(comparisonResultSchema.parse({
      relationship: "Văn bản mới thay thế một phần",
      executiveSummary: "Có một thay đổi cần áp dụng.",
      changes: [{
        category: "CHANGED", topic: "Dạy thêm", oldRule: "Quy định cũ",
        newRule: "Quy định mới", practicalImpact: "Thay đổi quy trình",
        actionRequired: "Rà soát kế hoạch",
        sourceEvidence: { page: 2, section: "Điều 3", quote: "Cũ" },
        targetEvidence: { page: 4, section: "Điều 5", quote: "Mới" },
        confidence: 0.9, needsReview: false
      }],
      unresolvedQuestions: [], confidence: 0.9
    }).changes).toHaveLength(1);
  });

  it("rejects more than thirty changes", () => {
    const change = {
      category: "UNCLEAR", topic: "Chưa rõ", oldRule: null, newRule: null,
      practicalImpact: null, actionRequired: null, sourceEvidence: null,
      targetEvidence: null, confidence: 0.2, needsReview: true
    };
    expect(comparisonResultSchema.safeParse({
      relationship: "", executiveSummary: "", changes: Array(31).fill(change),
      unresolvedQuestions: [], confidence: 0.2
    }).success).toBe(false);
  });
});
