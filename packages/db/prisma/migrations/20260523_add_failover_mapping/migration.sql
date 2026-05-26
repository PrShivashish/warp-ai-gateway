-- Migration: add_failover_mapping
-- Adds the fallback self-relation to ModelProviderMapping (Equivalency Matrix)

ALTER TABLE "ModelProviderMapping"
  ADD COLUMN "fallbackMappingId" INTEGER;

ALTER TABLE "ModelProviderMapping"
  ADD CONSTRAINT "ModelProviderMapping_fallbackMappingId_fkey"
  FOREIGN KEY ("fallbackMappingId")
  REFERENCES "ModelProviderMapping"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
