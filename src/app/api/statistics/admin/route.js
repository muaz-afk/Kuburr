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

    // Check if user is admin
    const { data: profiles, error: profileError } = await supabase
      .from('User')
      .select('role')
      .eq('id', String(user.id));

    if (profileError || !profiles || profiles.length !== 1 || profiles[0].role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
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
        userId,
        Plot!Booking_plotId_fkey(
          plotIdentifier,
          row,
          column
        ),
        Deceased(
          name,
          icNumber
        ),
        User!Booking_userId_fkey(
          name,
          email
        )
      `);

    // Build query for waqaf
    let waqafQuery = supabase
      .from('Waqaf')
      .select(`
        id,
        donor_name,
        donor_email,
        amount,
        currency,
        payment_status,
        created_at,
        message
      `);

    // Add date filters if provided
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31T23:59:59`);
      
      bookingQuery = bookingQuery
        .gte('bookingDate', startDate.toISOString())
        .lte('bookingDate', endDate.toISOString());
        
      waqafQuery = waqafQuery
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    if (month && year) {
      const startDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
      
      bookingQuery = bookingQuery
        .gte('bookingDate', startDate.toISOString())
        .lte('bookingDate', endDate.toISOString());
        
      waqafQuery = waqafQuery
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    // Execute queries
    const [bookingResult, waqafResult] = await Promise.all([
      bookingQuery,
      waqafQuery
    ]);

    if (bookingResult.error) {
      console.error('Error fetching bookings:', bookingResult.error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    if (waqafResult.error) {
      console.error('Error fetching waqaf:', waqafResult.error);
      return NextResponse.json({ error: 'Failed to fetch waqaf data' }, { status: 500 });
    }

    const bookings = bookingResult.data;
    const waqafData = waqafResult.data;

    // Calculate booking statistics
    const totalBookings = bookings.length;
    const totalBookingAmount = bookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length;
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;

    // Calculate waqaf statistics
    const totalWaqaf = waqafData.length;
    const totalWaqafAmount = waqafData.reduce((sum, waqaf) => sum + (parseFloat(waqaf.amount) || 0), 0);
    const successfulWaqaf = waqafData.filter(w => w.payment_status === 'SUCCESSFUL').length;

    // Group bookings by month for chart data
    const monthlyBookings = {};
    bookings.forEach(booking => {
      const date = new Date(booking.bookingDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyBookings[monthKey]) {
        monthlyBookings[monthKey] = { count: 0, amount: 0 };
      }
      monthlyBookings[monthKey].count += 1;
      monthlyBookings[monthKey].amount += booking.totalPrice || 0;
    });

    // Group waqaf by month for chart data
    const monthlyWaqaf = {};
    waqafData.forEach(waqaf => {
      const date = new Date(waqaf.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyWaqaf[monthKey]) {
        monthlyWaqaf[monthKey] = { count: 0, amount: 0 };
      }
      monthlyWaqaf[monthKey].count += 1;
      monthlyWaqaf[monthKey].amount += parseFloat(waqaf.amount) || 0;
    });

    const stats = {
      bookings: {
        totalBookings,
        totalBookingAmount,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        monthlyData: monthlyBookings,
        data: bookings.map(booking => ({
          ...booking,
          plotInfo: booking.Plot ? `${booking.Plot.plotIdentifier} (${booking.Plot.row}-${booking.Plot.column})` : 'N/A',
          deceasedName: booking.Deceased?.name || 'N/A',
          userName: booking.User?.name || booking.User?.email || 'N/A'
        }))
      },
      waqaf: {
        totalWaqaf,
        totalWaqafAmount,
        successfulWaqaf,
        monthlyData: monthlyWaqaf,
        data: waqafData
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in admin statistics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 