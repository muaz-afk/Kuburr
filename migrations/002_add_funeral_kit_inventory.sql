-- Migration: Add Funeral Kit Inventory System
-- Date: 2025-01-06
-- Description: Add FuneralKit, FuneralKitUsage, and BookingFuneralKit tables for kit inventory management

-- Create KitType enum for funeral kit types
CREATE TYPE "KitType" AS ENUM ('LELAKI', 'PEREMPUAN');

-- Create FuneralKit table to track kit inventory
CREATE TABLE "FuneralKit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kitType" "KitType" NOT NULL UNIQUE,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "totalUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL
);

-- Create FuneralKitUsage table for tracking all kit quantity changes
CREATE TABLE "FuneralKitUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kitId" TEXT NOT NULL,
    "bookingId" TEXT,
    "quantityChange" INTEGER NOT NULL, -- Positive for additions, negative for usage
    "reason" TEXT NOT NULL, -- 'BOOKING', 'ADMIN_ADD', 'ADMIN_REMOVE', 'BOOKING_CANCELLED'
    "changedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FuneralKitUsage_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "FuneralKit"("id") ON DELETE CASCADE,
    CONSTRAINT "FuneralKitUsage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL,
    CONSTRAINT "FuneralKitUsage_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE SET NULL
);

-- Create BookingFuneralKit table to link bookings with kit usage
CREATE TABLE "BookingFuneralKit" (
    "bookingId" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingFuneralKit_pkey" PRIMARY KEY ("bookingId", "kitId"),
    CONSTRAINT "BookingFuneralKit_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE,
    CONSTRAINT "BookingFuneralKit_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "FuneralKit"("id") ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX "FuneralKit_kitType_idx" ON "FuneralKit"("kitType");
CREATE INDEX "FuneralKitUsage_kitId_idx" ON "FuneralKitUsage"("kitId");
CREATE INDEX "FuneralKitUsage_bookingId_idx" ON "FuneralKitUsage"("bookingId");
CREATE INDEX "FuneralKitUsage_changedBy_idx" ON "FuneralKitUsage"("changedBy");
CREATE INDEX "FuneralKitUsage_reason_idx" ON "FuneralKitUsage"("reason");
CREATE INDEX "FuneralKitUsage_createdAt_idx" ON "FuneralKitUsage"("createdAt");
CREATE INDEX "BookingFuneralKit_kitId_idx" ON "BookingFuneralKit"("kitId");

-- Insert initial funeral kit data
INSERT INTO "FuneralKit" ("id", "kitType", "availableQuantity", "totalUsed", "updatedAt") VALUES
('kit_lelaki', 'LELAKI', 15, 0, CURRENT_TIMESTAMP),
('kit_perempuan', 'PEREMPUAN', 15, 0, CURRENT_TIMESTAMP);

-- Insert initial usage records for the starting inventory
INSERT INTO "FuneralKitUsage" ("id", "kitId", "quantityChange", "reason", "changedBy", "notes") VALUES
('usage_init_lelaki', 'kit_lelaki', 15, 'ADMIN_ADD', NULL, 'Initial inventory setup'),
('usage_init_perempuan', 'kit_perempuan', 15, 'ADMIN_ADD', NULL, 'Initial inventory setup');

-- Add comments for documentation
COMMENT ON TABLE "FuneralKit" IS 'Stores funeral kit inventory with available quantities for male and female kits';
COMMENT ON TABLE "FuneralKitUsage" IS 'Tracks all changes to funeral kit quantities including bookings and admin adjustments';
COMMENT ON TABLE "BookingFuneralKit" IS 'Links bookings to specific funeral kits used';
COMMENT ON TYPE "KitType" IS 'Enum for funeral kit types: LELAKI (Male), PEREMPUAN (Female)';

-- Add constraints to ensure data integrity
ALTER TABLE "FuneralKit" ADD CONSTRAINT "FuneralKit_availableQuantity_check" CHECK ("availableQuantity" >= 0);
ALTER TABLE "FuneralKit" ADD CONSTRAINT "FuneralKit_totalUsed_check" CHECK ("totalUsed" >= 0);
ALTER TABLE "BookingFuneralKit" ADD CONSTRAINT "BookingFuneralKit_quantity_check" CHECK ("quantity" > 0);