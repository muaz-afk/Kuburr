-- Migration: Fix Booking Workflow
-- Description: Restructure booking status flow, add Payment table, and fix payment workflow
-- Date: 2025-06-20

-- 1. Update BookingStatus ENUM to include all workflow states
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'APPROVED_PENDING_PAYMENT';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_CONFIRMED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- 2. Add new columns to Booking table for improved workflow
ALTER TABLE "Booking" 
ADD COLUMN IF NOT EXISTS "approvalDate" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "approvedBy" text,
ADD COLUMN IF NOT EXISTS "rejectionReason" text,
ADD COLUMN IF NOT EXISTS "paymentDeadline" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "adminNotes" text;

-- 3. Add foreign key constraint for approvedBy
ALTER TABLE "Booking" 
ADD CONSTRAINT "Booking_approvedBy_fkey" 
FOREIGN KEY ("approvedBy") REFERENCES "User" (id) ON DELETE SET NULL;

-- 4. Create Payment table for tracking payment records
CREATE TABLE IF NOT EXISTS public."Payment" (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  "bookingId" text NOT NULL,
  amount double precision NOT NULL,
  currency text NOT NULL DEFAULT 'MYR',
  "paymentMethod" text NOT NULL DEFAULT 'QR_PAYMENT',
  "paymentStatus" text NOT NULL DEFAULT 'PENDING',
  "transactionId" text,
  "receiptUrl" text,
  "receiptFilename" text,
  "paidAt" timestamp with time zone,
  "verifiedBy" text,
  "verifiedAt" timestamp with time zone,
  "paymentNotes" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "Payment_pkey" PRIMARY KEY (id),
  CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" (id) ON DELETE CASCADE,
  CONSTRAINT "Payment_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User" (id) ON DELETE SET NULL,
  CONSTRAINT "Payment_amount_check" CHECK (amount > 0)
);

-- 5. Add indexes for Payment table
CREATE INDEX IF NOT EXISTS "Payment_bookingId_idx" ON public."Payment" USING btree ("bookingId");
CREATE INDEX IF NOT EXISTS "Payment_paymentStatus_idx" ON public."Payment" USING btree ("paymentStatus");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON public."Payment" USING btree ("createdAt");
CREATE INDEX IF NOT EXISTS "Payment_verifiedBy_idx" ON public."Payment" USING btree ("verifiedBy");

-- 6. Add trigger for Payment updated_at
CREATE OR REPLACE FUNCTION update_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_updated_at 
BEFORE UPDATE ON "Payment" 
FOR EACH ROW EXECUTE FUNCTION update_payment_updated_at();

-- 7. Create function to automatically set payment deadline when booking is approved
CREATE OR REPLACE FUNCTION set_payment_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to APPROVED_PENDING_PAYMENT, set payment deadline to 7 days from now
    IF NEW.status = 'APPROVED_PENDING_PAYMENT' AND OLD.status != 'APPROVED_PENDING_PAYMENT' THEN
        NEW."paymentDeadline" = CURRENT_TIMESTAMP + INTERVAL '7 days';
        NEW."approvalDate" = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Add trigger for automatic payment deadline setting
CREATE TRIGGER set_payment_deadline_trigger
BEFORE UPDATE ON "Booking" 
FOR EACH ROW EXECUTE FUNCTION set_payment_deadline();

-- 9. Create function to validate booking status transitions
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Define valid status transitions
    -- PENDING -> APPROVED_PENDING_PAYMENT, REJECTED
    -- APPROVED_PENDING_PAYMENT -> PAYMENT_CONFIRMED, REJECTED
    -- PAYMENT_CONFIRMED -> COMPLETED
    -- REJECTED -> (no transitions allowed)
    -- COMPLETED -> (no transitions allowed)
    
    IF OLD.status IS NOT NULL AND NEW.status != OLD.status THEN
        CASE OLD.status
            WHEN 'PENDING' THEN
                IF NEW.status NOT IN ('APPROVED_PENDING_PAYMENT', 'REJECTED') THEN
                    RAISE EXCEPTION 'Invalid status transition from PENDING to %', NEW.status;
                END IF;
            WHEN 'APPROVED_PENDING_PAYMENT' THEN
                IF NEW.status NOT IN ('PAYMENT_CONFIRMED', 'REJECTED') THEN
                    RAISE EXCEPTION 'Invalid status transition from APPROVED_PENDING_PAYMENT to %', NEW.status;
                END IF;
            WHEN 'PAYMENT_CONFIRMED' THEN
                IF NEW.status NOT IN ('COMPLETED') THEN
                    RAISE EXCEPTION 'Invalid status transition from PAYMENT_CONFIRMED to %', NEW.status;
                END IF;
            WHEN 'REJECTED' THEN
                RAISE EXCEPTION 'Cannot change status from REJECTED';
            WHEN 'COMPLETED' THEN
                RAISE EXCEPTION 'Cannot change status from COMPLETED';
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Add trigger for status transition validation
CREATE TRIGGER validate_booking_status_transition_trigger
BEFORE UPDATE ON "Booking" 
FOR EACH ROW EXECUTE FUNCTION validate_booking_status_transition();

-- 11. Update existing bookings with default status if they have invalid states
UPDATE "Booking" 
SET status = 'PENDING' 
WHERE status NOT IN ('PENDING', 'APPROVED_PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'COMPLETED', 'REJECTED', 'CONFIRMED', 'CANCELLED');

-- Map old statuses to new workflow
UPDATE "Booking" SET status = 'PAYMENT_CONFIRMED' WHERE status = 'CONFIRMED';
UPDATE "Booking" SET status = 'REJECTED' WHERE status = 'CANCELLED';

-- 12. Add index for new booking columns
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON public."Booking" USING btree (status);
CREATE INDEX IF NOT EXISTS "Booking_approvedBy_idx" ON public."Booking" USING btree ("approvedBy");
CREATE INDEX IF NOT EXISTS "Booking_paymentDeadline_idx" ON public."Booking" USING btree ("paymentDeadline");