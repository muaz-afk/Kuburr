-- Undo Migration: Remove Funeral Kit Inventory System
-- Date: 2025-01-06
-- Description: Removes FuneralKit, FuneralKitUsage, and BookingFuneralKit tables and related types

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS "BookingFuneralKit" CASCADE;
DROP TABLE IF EXISTS "FuneralKitUsage" CASCADE;
DROP TABLE IF EXISTS "FuneralKit" CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS "KitType" CASCADE;

-- Note: Indexes and constraints are automatically dropped with the tables