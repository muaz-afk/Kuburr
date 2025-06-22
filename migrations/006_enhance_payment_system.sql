-- Migration: Enhance payment system with comprehensive tracking
-- Date: 2024-12-18
-- Purpose: Add comprehensive payment tracking, approval workflow, and audit trail

-- Step 1: Add missing booking approval and payment tracking fields
ALTER TABLE public."Booking" 
ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS approved_by text NULL,
ADD COLUMN IF NOT EXISTS approval_notes text NULL,
ADD COLUMN IF NOT EXISTS rejected_reason text NULL,
ADD COLUMN IF NOT EXISTS payment_due_date timestamptz NULL,
ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS payment_amount decimal(10,2) NULL;

-- Step 2: Create payment history audit table
CREATE TABLE IF NOT EXISTS public."PaymentHistory" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public."Booking"(id) ON DELETE CASCADE,
    payment_status text NOT NULL,
    payment_method text NULL,
    amount decimal(10,2) NULL,
    receipt_url text NULL,
    receipt_filename text NULL,
    notes text NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    created_by text NULL,
    admin_notes text NULL
);

-- Step 3: Create payment settings configuration table
CREATE TABLE IF NOT EXISTS public."PaymentConfiguration" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_type text NOT NULL UNIQUE, -- 'booking', 'waqaf'
    qr_image_url text NULL,
    bank_details jsonb NULL,
    default_amount decimal(10,2) NULL,
    payment_deadline_days integer DEFAULT 7,
    auto_approve boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Step 4: Add enhanced booking status tracking
ALTER TABLE public."Booking" 
ADD COLUMN IF NOT EXISTS booking_status text DEFAULT 'PENDING';

-- Update existing booking statuses based on current payment status
UPDATE public."Booking" 
SET booking_status = CASE 
    WHEN payment_status = 'SUCCESSFUL' THEN 'CONFIRMED'
    WHEN payment_status = 'FAILED' THEN 'CANCELLED'
    WHEN payment_status = 'PENDING' AND approved_at IS NOT NULL THEN 'APPROVED_PENDING_PAYMENT'
    ELSE 'PENDING'
END;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "Booking_approved_at_idx" 
ON public."Booking" USING btree (approved_at) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "Booking_approved_by_idx" 
ON public."Booking" USING btree (approved_by) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "Booking_payment_due_date_idx" 
ON public."Booking" USING btree (payment_due_date) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "Booking_booking_status_idx" 
ON public."Booking" USING btree (booking_status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "PaymentHistory_booking_id_idx" 
ON public."PaymentHistory" USING btree (booking_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "PaymentHistory_created_at_idx" 
ON public."PaymentHistory" USING btree (created_at) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "PaymentConfiguration_payment_type_idx" 
ON public."PaymentConfiguration" USING btree (payment_type) TABLESPACE pg_default;

-- Step 6: Insert default payment configurations
INSERT INTO public."PaymentConfiguration" (payment_type, payment_deadline_days, auto_approve, active)
VALUES 
    ('booking', 7, false, true),
    ('waqaf', 0, true, true)
ON CONFLICT (payment_type) DO NOTHING;

-- Step 7: Create RLS policies for new tables
ALTER TABLE public."PaymentHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentConfiguration" ENABLE ROW LEVEL SECURITY;

-- PaymentHistory policies
CREATE POLICY "Users can view their own payment history" ON public."PaymentHistory"
FOR SELECT USING (
    booking_id IN (
        SELECT id FROM public."Booking" WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all payment history" ON public."PaymentHistory"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public."User" 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

CREATE POLICY "System can insert payment history" ON public."PaymentHistory"
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update payment history" ON public."PaymentHistory"
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public."User" 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

-- PaymentConfiguration policies
CREATE POLICY "Everyone can view active payment configurations" ON public."PaymentConfiguration"
FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage payment configurations" ON public."PaymentConfiguration"
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public."User" 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);

-- Step 8: Create functions for payment workflow
CREATE OR REPLACE FUNCTION public.approve_booking(
    booking_id_param uuid,
    approved_by_param text,
    approval_notes_param text DEFAULT NULL,
    payment_due_days integer DEFAULT 7
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update booking with approval details
    UPDATE public."Booking" 
    SET 
        approved_at = timezone('utc', now()),
        approved_by = approved_by_param,
        approval_notes = approval_notes_param,
        payment_due_date = timezone('utc', now()) + (payment_due_days || ' days')::interval,
        booking_status = 'APPROVED_PENDING_PAYMENT'
    WHERE id = booking_id_param;
    
    -- Insert payment history record
    INSERT INTO public."PaymentHistory" (
        booking_id, payment_status, notes, created_by, admin_notes
    ) VALUES (
        booking_id_param, 
        'APPROVED_PENDING_PAYMENT', 
        'Booking approved by admin',
        approved_by_param,
        approval_notes_param
    );
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_booking(
    booking_id_param uuid,
    rejected_by_param text,
    rejection_reason_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update booking with rejection details
    UPDATE public."Booking" 
    SET 
        rejected_reason = rejection_reason_param,
        booking_status = 'CANCELLED',
        payment_status = 'FAILED'
    WHERE id = booking_id_param;
    
    -- Insert payment history record
    INSERT INTO public."PaymentHistory" (
        booking_id, payment_status, notes, created_by, admin_notes
    ) VALUES (
        booking_id_param, 
        'CANCELLED', 
        'Booking rejected by admin',
        rejected_by_param,
        rejection_reason_param
    );
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_payment(
    booking_id_param uuid,
    receipt_url_param text,
    receipt_filename_param text,
    confirmed_by_param text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update booking with payment confirmation
    UPDATE public."Booking" 
    SET 
        payment_status = 'SUCCESSFUL',
        payment_receipt_url = receipt_url_param,
        payment_receipt_filename = receipt_filename_param,
        payment_confirmed_at = timezone('utc', now()),
        booking_status = 'CONFIRMED'
    WHERE id = booking_id_param;
    
    -- Insert payment history record
    INSERT INTO public."PaymentHistory" (
        booking_id, payment_status, receipt_url, receipt_filename, 
        notes, created_by
    ) VALUES (
        booking_id_param, 
        'SUCCESSFUL',
        receipt_url_param,
        receipt_filename_param,
        'Payment confirmed',
        COALESCE(confirmed_by_param, 'system')
    );
    
    RETURN true;
END;
$$;

-- Step 9: Add comments for documentation
COMMENT ON COLUMN public."Booking".approved_at IS 'Timestamp when booking was approved by admin';
COMMENT ON COLUMN public."Booking".approved_by IS 'ID or email of admin who approved the booking';
COMMENT ON COLUMN public."Booking".approval_notes IS 'Admin notes during approval process';
COMMENT ON COLUMN public."Booking".rejected_reason IS 'Reason for booking rejection';
COMMENT ON COLUMN public."Booking".payment_due_date IS 'Deadline for payment submission';
COMMENT ON COLUMN public."Booking".payment_confirmed_at IS 'Timestamp when payment was confirmed';
COMMENT ON COLUMN public."Booking".payment_amount IS 'Actual payment amount received';
COMMENT ON COLUMN public."Booking".booking_status IS 'Overall booking status: PENDING, APPROVED_PENDING_PAYMENT, CONFIRMED, COMPLETED, CANCELLED';

COMMENT ON TABLE public."PaymentHistory" IS 'Audit trail for all payment-related activities';
COMMENT ON TABLE public."PaymentConfiguration" IS 'Configuration settings for different payment types';

-- Step 10: Grant necessary permissions
GRANT SELECT, INSERT ON public."PaymentHistory" TO authenticated;
GRANT SELECT ON public."PaymentConfiguration" TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_booking TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_booking TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment TO authenticated;