import type { FindingReviewStatus } from "@prisma/client";

export interface DocumentListQuery {
  page?: string;
  pageSize?: string;
  status?: string;
  search?: string;
}

export interface ReviewFindingInput {
  status?: FindingReviewStatus;
  title?: string | null;
  detail?: string | null;
  note?: string | null;
}
