-- Undo Migration: Fix Booking Workflow
-- Description: Revert booking workflow changes, remove Payment table, and restore original status flow
-- Date: 2025-06-20

-- 1. Drop triggers first
DROP TRIGGER IF EXISTS validate_booking_status_transition_trigger ON "Booking";
DROP TRIGGER IF EXISTS set_payment_deadline_trigger ON "Booking";
DROP TRIGGER IF EXISTS update_payment_updated_at ON "Payment";

-- 2. Drop functions
DROP FUNCTION IF EXISTS validate_booking_status_transition();
DROP FUNCTION IF EXISTS set_payment_deadline();
DROP FUNCTION IF EXISTS update_payment_updated_at();

-- 3. Drop indexes for new booking columns
DROP INDEX IF EXISTS "Booking_status_idx";
DROP INDEX IF EXISTS "Booking_approvedBy_idx";
DROP INDEX IF EXISTS "Booking_paymentDeadline_idx";

-- 4. Revert booking status mappings to original values
UPDATE "Booking" SET status = 'CONFIRMED' WHERE status = 'PAYMENT_CONFIRMED';
UPDATE "Booking" SET status = 'CANCELLED' WHERE status = 'REJECTED';

-- Set any bookings with new statuses back to PENDING
UPDATE "Booking" 
SET status = 'PENDING' 
WHERE status IN ('APPROVED_PENDING_PAYMENT');

-- 5. Drop Payment table and its indexes
DROP INDEX IF EXISTS "Payment_bookingId_idx";
DROP INDEX IF EXISTS "Payment_paymentStatus_idx";
DROP INDEX IF EXISTS "Payment_createdAt_idx";
DROP INDEX IF EXISTS "Payment_verifiedBy_idx";

DROP TABLE IF EXISTS public."Payment";

-- 6. Remove foreign key constraint for approvedBy
ALTER TABLE "Booking" 
DROP CONSTRAINT IF EXISTS "Booking_approvedBy_fkey";

-- 7. Remove new columns from Booking table
ALTER TABLE "Booking" 
DROP COLUMN IF EXISTS "approvalDate",
DROP COLUMN IF EXISTS "approvedBy",
DROP COLUMN IF EXISTS "rejectionReason",
DROP COLUMN IF EXISTS "paymentDeadline",
DROP COLUMN IF EXISTS "adminNotes";

-- Note: Cannot directly remove values from ENUM type in PostgreSQL
-- The new BookingStatus values (APPROVED_PENDING_PAYMENT, PAYMENT_CONFIRMED, REJECTED) 
-- will remain in the ENUM but won't be used.
-- To completely remove them, you would need to:
-- 1. Create a new ENUM without these values
-- 2. Update the column to use the new ENUM
-- 3. Drop the old ENUM
-- This is more complex and potentially risky, so we leave the ENUM values in place.