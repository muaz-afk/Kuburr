-- Migration: Add Staff Management System
-- Date: 2024-12-19
-- Description: Add Staff and BookingStaff tables for grave digger and body washer assignment

-- Create StaffType enum
CREATE TYPE "StaffType" AS ENUM ('PENGALI_KUBUR', 'PEMANDI_JENAZAH');

-- Create Staff table
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "staffType" "StaffType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL
);

-- Create BookingStaff table (Many-to-Many relationship)
CREATE TABLE "BookingStaff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffType" "StaffType" NOT NULL,
    "assignedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL, -- User ID who made the assignment
    CONSTRAINT "BookingStaff_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE,
    CONSTRAINT "BookingStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE,
    CONSTRAINT "BookingStaff_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT,
    -- Ensure only one staff per booking per staff type
    CONSTRAINT "BookingStaff_bookingId_staffType_key" UNIQUE ("bookingId", "staffType")
);

-- Create indexes for performance
CREATE INDEX "Staff_staffType_idx" ON "Staff"("staffType");
CREATE INDEX "Staff_isActive_idx" ON "Staff"("isActive");
CREATE INDEX "Staff_name_idx" ON "Staff"("name");
CREATE INDEX "BookingStaff_bookingId_idx" ON "BookingStaff"("bookingId");
CREATE INDEX "BookingStaff_staffId_idx" ON "BookingStaff"("staffId");
CREATE INDEX "BookingStaff_staffType_idx" ON "BookingStaff"("staffType");

-- Insert sample staff data
INSERT INTO "Staff" ("id", "name", "phone", "staffType", "isActive") VALUES
-- Grave Diggers (Pengali Kubur)
('staff_pk_001', 'Ahmad bin Hassan', '012-3456789', 'PENGALI_KUBUR', true),
('staff_pk_002', 'Muhammad bin Ali', '012-3456790', 'PENGALI_KUBUR', true),
('staff_pk_003', 'Ibrahim bin Omar', '012-3456791', 'PENGALI_KUBUR', true),

-- Body Washers (Pemandi Jenazah)
('staff_pj_001', 'Fatimah binti Ahmad', '012-3456792', 'PEMANDI_JENAZAH', true),
('staff_pj_002', 'Khadijah binti Hassan', '012-3456793', 'PEMANDI_JENAZAH', true),
('staff_pj_003', 'Aminah binti Ibrahim', '012-3456794', 'PEMANDI_JENAZAH', true),

-- Special "Not Needed" option for body washer (for cases where deceased already bathed at hospital)
('not-needed-pemandi', 'Tidak Perlu', NULL, 'PEMANDI_JENAZAH', true);

-- Add comments
COMMENT ON TABLE "Staff" IS 'Table to store cemetery staff information including grave diggers and body washers';
COMMENT ON TABLE "BookingStaff" IS 'Join table to assign staff to bookings, prevents double-booking per staff type';
COMMENT ON TYPE "StaffType" IS 'Enum for staff types: PENGALI_KUBUR (Grave Digger), PEMANDI_JENAZAH (Body Washer)'; 