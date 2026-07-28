DROP INDEX IF EXISTS "DocumentComparison_sourceDocumentId_targetDocumentId_key";

ALTER TABLE "DocumentComparison"
ALTER COLUMN "result" DROP NOT NULL,
ADD COLUMN "sourceSha256" TEXT,
ADD COLUMN "targetSha256" TEXT,
ADD COLUMN "model" TEXT,
ADD COLUMN "schemaVersion" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "errorCode" TEXT,
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "requestedById" UUID,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "DocumentComparison" c
SET "sourceSha256" = COALESCE(s.sha256, 'legacy'),
    "targetSha256" = COALESCE(t.sha256, 'legacy'),
    "model" = 'legacy',
    "schemaVersion" = 'legacy',
    "status" = 'COMPLETED'
FROM "Document" s, "Document" t
WHERE c."sourceDocumentId" = s.id AND c."targetDocumentId" = t.id;

ALTER TABLE "DocumentComparison"
ALTER COLUMN "sourceSha256" SET NOT NULL,
ALTER COLUMN "targetSha256" SET NOT NULL,
ALTER COLUMN "model" SET NOT NULL,
ALTER COLUMN "schemaVersion" SET NOT NULL;

CREATE UNIQUE INDEX "DocumentComparison_source_key" ON "DocumentComparison"
("sourceDocumentId", "targetDocumentId", "sourceSha256", "targetSha256", "schemaVersion", "model");
CREATE INDEX "DocumentComparison_sourceDocumentId_targetDocumentId_createdAt_idx"
ON "DocumentComparison"("sourceDocumentId", "targetDocumentId", "createdAt");
