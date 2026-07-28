CREATE TYPE "FindingReviewStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED', 'EDITED');

ALTER TABLE "AnalysisFinding"
ADD COLUMN "reviewStatus" "FindingReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewedTitle" TEXT,
ADD COLUMN "reviewedDetail" TEXT,
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" UUID;

CREATE INDEX "AnalysisFinding_analysisId_reviewStatus_idx"
ON "AnalysisFinding"("analysisId", "reviewStatus");

CREATE INDEX "AnalysisFinding_reviewedById_idx"
ON "AnalysisFinding"("reviewedById");

ALTER TABLE "AnalysisFinding"
ADD CONSTRAINT "AnalysisFinding_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
