import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query for bookings
    let bookingQuery = supabase
      .from('Booking')
      .select(`
        id,
        totalPrice,
        status,
        bookingDate,
        createdAt,
        Plot!Booking_plotId_fkey(
          plotIdentifier,
          row,
          column
        ),
        Deceased(
          name,
          icNumber
        )
      `)
      .eq('userId', user.id);

    // Add date filters if provided
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31T23:59:59`);
      bookingQuery = bookingQuery
        .gte('bookingDate', startDate.toISOString())
        .lte('bookingDate', endDate.toISOString());
    }

    if (month && year) {
      const startDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
      bookingQuery = bookingQuery
        .gte('bookingDate', startDate.toISOString())
        .lte('bookingDate', endDate.toISOString());
    }

    const { data: bookings, error: bookingError } = await bookingQuery;

    if (bookingError) {
      console.error('Error fetching user bookings:', bookingError);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Calculate statistics
    const totalBookings = bookings.length;
    const totalAmount = bookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length;
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;

    // Group by month for chart data
    const monthlyData = {};
    bookings.forEach(booking => {
      const date = new Date(booking.bookingDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, amount: 0 };
      }
      monthlyData[monthKey].count += 1;
      monthlyData[monthKey].amount += booking.totalPrice || 0;
    });

    const stats = {
      totalBookings,
      totalAmount,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      monthlyData,
      bookings: bookings.map(booking => ({
        ...booking,
        plotInfo: booking.Plot ? `${booking.Plot.plotIdentifier} (${booking.Plot.row}-${booking.Plot.column})` : 'N/A',
        deceasedName: booking.Deceased?.name || 'N/A'
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in user statistics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 