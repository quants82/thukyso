ALTER TABLE "DocumentAnalysis"
ADD COLUMN "sourceSha256" TEXT;

UPDATE "DocumentAnalysis" AS analysis
SET "sourceSha256" = COALESCE(
  document.sha256,
  'legacy:' || analysis.id::text
)
FROM "Document" AS document
WHERE document.id = analysis."documentId";

ALTER TABLE "DocumentAnalysis"
ALTER COLUMN "sourceSha256" SET NOT NULL;

CREATE UNIQUE INDEX "DocumentAnalysis_source_key"
ON "DocumentAnalysis"("documentId", "sourceSha256", "schemaVersion", model);
