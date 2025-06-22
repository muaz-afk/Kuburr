-- Undo Migration: Revert enhanced payment system changes
-- Date: 2024-12-18
-- Purpose: Rollback comprehensive payment tracking, approval workflow, and audit trail
-- This script reverses changes made in 006_enhance_payment_system.sql

-- Step 1: Drop functions first (due to dependencies)
DROP FUNCTION IF EXISTS public.approve_booking(uuid, text, text, integer);
DROP FUNCTION IF EXISTS public.reject_booking(uuid, text, text);
DROP FUNCTION IF EXISTS public.confirm_payment(uuid, text, text, text);

-- Step 2: Drop RLS policies
DROP POLICY IF EXISTS "Users can view their own payment history" ON public."PaymentHistory";
DROP POLICY IF EXISTS "Admins can view all payment history" ON public."PaymentHistory";
DROP POLICY IF EXISTS "System can insert payment history" ON public."PaymentHistory";
DROP POLICY IF EXISTS "Admins can update payment history" ON public."PaymentHistory";

DROP POLICY IF EXISTS "Everyone can view active payment configurations" ON public."PaymentConfiguration";
DROP POLICY IF EXISTS "Admins can manage payment configurations" ON public."PaymentConfiguration";

-- Step 3: Drop indexes
DROP INDEX IF EXISTS "Booking_approved_at_idx";
DROP INDEX IF EXISTS "Booking_approved_by_idx";
DROP INDEX IF EXISTS "Booking_payment_due_date_idx";
DROP INDEX IF EXISTS "Booking_booking_status_idx";
DROP INDEX IF EXISTS "PaymentHistory_booking_id_idx";
DROP INDEX IF EXISTS "PaymentHistory_created_at_idx";
DROP INDEX IF EXISTS "PaymentConfiguration_payment_type_idx";

-- Step 4: Drop new tables
DROP TABLE IF EXISTS public."PaymentHistory";
DROP TABLE IF EXISTS public."PaymentConfiguration";

-- Step 5: Remove added columns from Booking table
ALTER TABLE public."Booking" 
DROP COLUMN IF EXISTS approved_at,
DROP COLUMN IF EXISTS approved_by,
DROP COLUMN IF EXISTS approval_notes,
DROP COLUMN IF EXISTS rejected_reason,
DROP COLUMN IF EXISTS payment_due_date,
DROP COLUMN IF EXISTS payment_confirmed_at,
DROP COLUMN IF EXISTS payment_amount,
DROP COLUMN IF EXISTS booking_status;

-- Step 6: Reset payment_status values to original state if needed
-- Note: This preserves existing payment status data from migration 005
-- No changes needed here as we're only removing newly added fields

-- Verification query to check rollback completion
-- Uncomment to verify the rollback (for manual testing only)
/*
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'Booking'
    AND column_name IN (
        'approved_at', 'approved_by', 'approval_notes', 
        'rejected_reason', 'payment_due_date', 
        'payment_confirmed_at', 'payment_amount', 'booking_status'
    );

-- Should return 0 rows after successful rollback

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('PaymentHistory', 'PaymentConfiguration');

-- Should return 0 rows after successful rollback
*/