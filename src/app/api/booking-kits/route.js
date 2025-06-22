import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/booking-kits - Reserve funeral kits for a booking
export async function POST(request) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bookingId, selectedKits } = body;

    // Validate input
    if (!bookingId || !selectedKits || !Array.isArray(selectedKits) || selectedKits.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input. bookingId and selectedKits array are required.' },
        { status: 400 }
      );
    }

    // Validate booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('Booking')
      .select('id, userId, status')
      .eq('id', bookingId)
      .eq('userId', user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      );
    }

    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only modify kits for pending bookings' },
        { status: 400 }
      );
    }

    // Process each selected kit
    const kitResults = [];
    let hasErrors = false;

    for (const kitSelection of selectedKits) {
      const { kitType, quantity = 1 } = kitSelection;

      if (!kitType || !['LELAKI', 'PEREMPUAN'].includes(kitType)) {
        return NextResponse.json(
          { error: `Invalid kit type: ${kitType}` },
          { status: 400 }
        );
      }

      if (quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity: ${quantity}` },
          { status: 400 }
        );
      }

      // Get kit by type
      const { data: kit, error: kitError } = await supabase
        .from('FuneralKit')
        .select('*')
        .eq('kitType', kitType)
        .single();

      if (kitError || !kit) {
        return NextResponse.json(
          { error: `Funeral kit type ${kitType} not found` },
          { status: 404 }
        );
      }

      // Check availability
      if (kit.availableQuantity < quantity) {
        return NextResponse.json(
          { error: `Insufficient ${kitType} kits. Available: ${kit.availableQuantity}, Requested: ${quantity}` },
          { status: 400 }
        );
      }

      // Check if kit already reserved for this booking
      const { data: existingReservation, error: reservationError } = await supabase
        .from('BookingFuneralKit')
        .select('*')
        .eq('bookingId', bookingId)
        .eq('kitId', kit.id)
        .single();

      if (reservationError && reservationError.code !== 'PGRST116') {
        console.error('Error checking existing reservation:', reservationError);
        hasErrors = true;
        continue;
      }

      if (existingReservation) {
        return NextResponse.json(
          { error: `Kit type ${kitType} already reserved for this booking` },
          { status: 400 }
        );
      }

      // Reserve the kit quantity
      const newAvailableQuantity = kit.availableQuantity - quantity;
      const newTotalUsed = kit.totalUsed + quantity;

      // Update kit quantity
      const { error: updateError } = await supabase
        .from('FuneralKit')
        .update({
          availableQuantity: newAvailableQuantity,
          totalUsed: newTotalUsed,
          updatedAt: new Date().toISOString()
        })
        .eq('id', kit.id);

      if (updateError) {
        console.error('Error updating kit quantity:', updateError);
        hasErrors = true;
        continue;
      }

      // Create booking kit reservation
      const { error: reservationInsertError } = await supabase
        .from('BookingFuneralKit')
        .insert({
          bookingId: bookingId,
          kitId: kit.id,
          quantity: quantity
        });

      if (reservationInsertError) {
        console.error('Error creating kit reservation:', reservationInsertError);
        hasErrors = true;
        continue;
      }

      // Create usage record
      const usageId = `usage_booking_${bookingId}_${kit.id}_${Date.now()}`;
      const { error: usageError } = await supabase
        .from('FuneralKitUsage')
        .insert({
          id: usageId,
          kitId: kit.id,
          bookingId: bookingId,
          quantityChange: -quantity,
          reason: 'BOOKING',
          changedBy: user?.id || null,
          notes: `Reserved for booking ${bookingId}`
        });

      if (usageError) {
        console.error('Error creating usage record:', usageError);
        // Continue - usage record is for tracking, not critical
      }

      kitResults.push({
        kitType: kitType,
        kitId: kit.id,
        quantity: quantity,
        success: true
      });
    }

    if (hasErrors) {
      return NextResponse.json(
        { error: 'Some kit reservations failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Funeral kits reserved successfully',
      reservedKits: kitResults
    });

  } catch (error) {
    console.error('Unexpected error in booking-kits API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/booking-kits - Cancel funeral kit reservations for a booking
export async function DELETE(request) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId parameter is required' },
        { status: 400 }
      );
    }

    // Get booking kit reservations
    const { data: reservations, error: reservationsError } = await supabase
      .from('BookingFuneralKit')
      .select(`
        *,
        kit:kitId (
          id,
          kitType,
          availableQuantity,
          totalUsed
        )
      `)
      .eq('bookingId', bookingId);

    if (reservationsError) {
      console.error('Error fetching kit reservations:', reservationsError);
      return NextResponse.json(
        { error: 'Failed to fetch kit reservations' },
        { status: 500 }
      );
    }

    if (!reservations || reservations.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No kit reservations to cancel' }
      );
    }

    // Restore kit quantities and remove reservations
    for (const reservation of reservations) {
      const { kit, quantity } = reservation;

      // Restore kit quantity
      const newAvailableQuantity = kit.availableQuantity + quantity;
      const newTotalUsed = kit.totalUsed - quantity;

      const { error: updateError } = await supabase
        .from('FuneralKit')
        .update({
          availableQuantity: newAvailableQuantity,
          totalUsed: newTotalUsed,
          updatedAt: new Date().toISOString()
        })
        .eq('id', kit.id);

      if (updateError) {
        console.error('Error restoring kit quantity:', updateError);
      }

      // Create usage record for cancellation
      const usageId = `usage_cancel_${bookingId}_${kit.id}_${Date.now()}`;
      const { error: usageError } = await supabase
        .from('FuneralKitUsage')
        .insert({
          id: usageId,
          kitId: kit.id,
          bookingId: bookingId,
          quantityChange: quantity,
          reason: 'BOOKING_CANCELLED',
          changedBy: user?.id || null,
          notes: `Cancelled reservation for booking ${bookingId}`
        });

      if (usageError) {
        console.error('Error creating cancellation usage record:', usageError);
      }
    }

    // Remove all reservations for this booking
    const { error: deleteError } = await supabase
      .from('BookingFuneralKit')
      .delete()
      .eq('bookingId', bookingId);

    if (deleteError) {
      console.error('Error deleting kit reservations:', deleteError);
      return NextResponse.json(
        { error: 'Failed to cancel kit reservations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kit reservations cancelled successfully',
      cancelledCount: reservations.length
    });

  } catch (error) {
    console.error('Unexpected error in booking-kits DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}