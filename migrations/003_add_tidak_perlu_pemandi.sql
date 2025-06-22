-- Migration: Add "Tidak Perlu" option for PEMANDI_JENAZAH
-- Date: 2025-01-07
-- Description: Add special staff entry for cases where body washing is not needed (already done at hospital)

-- Insert the "Tidak Perlu" staff option if it doesn't already exist
INSERT INTO "Staff" ("id", "name", "phone", "staffType", "isActive", "createdAt", "updatedAt") 
SELECT 'not-needed-pemandi', 'Tidak Perlu', NULL, 'PEMANDI_JENAZAH', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "Staff" WHERE "id" = 'not-needed-pemandi'
);

-- Add comment explaining the special entry
COMMENT ON COLUMN "Staff"."id" IS 'Staff ID - special value "not-needed-pemandi" indicates body washing service is not required'; 