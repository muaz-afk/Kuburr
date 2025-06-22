import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabase = createClient();

    // 1. Authenticate the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.id) { // Ensure user and user.id are valid
      console.warn('API: /api/user/bookings - Authentication failed or user.id missing.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Log the authenticated user's ID for debugging
    console.log(`API: /api/user/bookings - Authenticated user ID: ${user.id}`);
 
    // 2. Fetch all bookings for the authenticated user with related data
    const { data: bookings, error: bookingsError } = await supabase
      .from('Booking')
      .select(`
        id,
        userId,
        plotId,
        deceasedId,
        bookingDate,
        totalPrice,
        status,
        createdAt,
        updatedAt,
        Plot!Booking_plotId_fkey ( plotIdentifier ),
        Deceased ( name ),
        BookingPackage ( Package ( id, label, price ) ),
        BookingStaff ( Staff ( id, name, staffType ) ),
        BookingFuneralKit ( FuneralKit ( id, kitType ) )
      `)
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

console.log('Fetched bookings data:', JSON.stringify(bookings, null, 2)); // Log the fetched data
    console.log('Supabase bookings query error:', bookingsError); // Log any error from this specific query
    if (bookingsError) {
      console.error('Error fetching user bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch bookings', details: bookingsError.message }, { status: 500 });
    }

    if (!bookings) {
      return NextResponse.json([]);
    }

    // 3. Format the response
    const formattedBookings = bookings.map(booking => {
      return {
        id: booking.id,
        userId: booking.userId,
        bookingDate: booking.bookingDate,
        totalPrice: booking.totalPrice,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        plotId: booking.plotId,
        Plot: booking.Plot || null,
        deceasedId: booking.deceasedId,
        Deceased: booking.Deceased || null,
        packages: booking.BookingPackage.map(bp => ({
          id: bp.Package.id,
          label: bp.Package.label,
          price: bp.Package.price
        })),
        assignedStaff: booking.BookingStaff.map(bs => ({
          id: bs.Staff.id,
          name: bs.Staff.name,
          staffType: bs.Staff.staffType
        })),
        funeralKitType: booking.BookingFuneralKit?.[0]?.FuneralKit?.kitType || null,
        funeralKitId: booking.BookingFuneralKit?.[0]?.FuneralKit?.id || null,
      };
    });

    return NextResponse.json(formattedBookings);

  } catch (error) {
    console.error('API Error fetching user bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}