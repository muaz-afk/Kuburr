-- Migration: Add "Tidak Perlu" option for PENGALI_KUBUR
-- Date: 2025-01-07
-- Description: Add special staff entry for cases where grave digging is not needed (family/community handles it)

-- Insert the "Tidak Perlu" staff option if it doesn't already exist
INSERT INTO "Staff" ("id", "name", "phone", "staffType", "isActive", "createdAt", "updatedAt") 
SELECT 'not-needed-penggali', 'Tidak Perlu', NULL, 'PENGALI_KUBUR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "Staff" WHERE "id" = 'not-needed-penggali'
);

-- Add comment explaining the special entry
COMMENT ON COLUMN "Staff"."id" IS 'Staff ID - special values: "not-needed-pemandi" (body washing not required), "not-needed-penggali" (grave digging not required)'; 