-- Migration: Add payment receipt fields to Booking table
-- Date: 2024-12-06
-- Purpose: Add payment receipt tracking to bookings similar to waqaf system

-- Add payment receipt fields to Booking table
ALTER TABLE public."Booking" 
ADD COLUMN IF NOT EXISTS payment_receipt_url text NULL,
ADD COLUMN IF NOT EXISTS payment_receipt_filename text NULL,
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS payment_method text NULL DEFAULT 'QR_PAYMENT';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "Booking_payment_status_idx" 
ON public."Booking" USING btree (payment_status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "Booking_payment_method_idx" 
ON public."Booking" USING btree (payment_method) TABLESPACE pg_default;

-- Add comments for documentation
COMMENT ON COLUMN public."Booking".payment_receipt_url IS 'URL to uploaded payment receipt file';
COMMENT ON COLUMN public."Booking".payment_receipt_filename IS 'Original filename of uploaded payment receipt';
COMMENT ON COLUMN public."Booking".payment_status IS 'Payment status: PENDING, SUCCESSFUL, FAILED';
COMMENT ON COLUMN public."Booking".payment_method IS 'Payment method used: QR_PAYMENT, BANK_TRANSFER, etc.';