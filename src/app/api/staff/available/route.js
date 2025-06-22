import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/staff/available - Get available staff for a specific date/time
export async function GET(request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const bookingDate = searchParams.get('date');
    const staffType = searchParams.get('type');
    const excludeBookingId = searchParams.get('excludeBookingId'); // For editing existing bookings

    if (!bookingDate) {
      return NextResponse.json({ error: 'Tarikh tempahan diperlukan' }, { status: 400 });
    }

    // Parse the booking date
    const targetDate = new Date(bookingDate);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Format tarikh tidak sah' }, { status: 400 });
    }

    // Get the start and end of the booking day (assuming staff can only work one booking per day)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all active staff
    let staffQuery = supabase
      .from('Staff')
      .select('*')
      .eq('isActive', true)
      .order('name', { ascending: true });

    if (staffType) {
      staffQuery = staffQuery.eq('staffType', staffType);
    }

    const { data: allStaff, error: staffError } = await staffQuery;

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json({ error: 'Gagal mendapatkan data kakitangan' }, { status: 500 });
    }

    // Get bookings for the target date to check staff availability
    let bookingQuery = supabase
      .from('Booking')
      .select(`
        id,
        bookingDate,
        BookingStaff (
          staffId,
          staffType
        )
      `)
      .gte('bookingDate', startOfDay.toISOString())
      .lte('bookingDate', endOfDay.toISOString())
      .neq('status', 'CANCELLED'); // Don't consider cancelled bookings

    // Exclude current booking if editing
    if (excludeBookingId) {
      bookingQuery = bookingQuery.neq('id', excludeBookingId);
    }

    const { data: bookings, error: bookingError } = await bookingQuery;

    if (bookingError) {
      console.error('Error fetching bookings:', bookingError);
      return NextResponse.json({ error: 'Gagal menyemak ketersediaan kakitangan' }, { status: 500 });
    }

    // Get all staff IDs that are already assigned for this date
    const assignedStaffIds = new Set();
    bookings?.forEach(booking => {
      booking.BookingStaff?.forEach(assignment => {
        assignedStaffIds.add(assignment.staffId);
      });
    });

    // Filter available staff (not assigned on this date)
    // Special case: "not-needed-pemandi" (Tidak Perlu) is always available regardless of assignments
    const availableStaff = allStaff?.filter(staff => 
      staff.id === 'not-needed-pemandi' || !assignedStaffIds.has(staff.id)
    ) || [];

    // Group by staff type for easier frontend consumption
    const staffByType = {
      PENGALI_KUBUR: availableStaff.filter(s => s.staffType === 'PENGALI_KUBUR'),
      PEMANDI_JENAZAH: availableStaff.filter(s => s.staffType === 'PEMANDI_JENAZAH')
    };

    // Sort PEMANDI_JENAZAH to put "Tidak Perlu" first
    staffByType.PEMANDI_JENAZAH.sort((a, b) => {
      if (a.id === 'not-needed-pemandi') return -1;
      if (b.id === 'not-needed-pemandi') return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      date: bookingDate,
      staffByType,
      totalAvailable: availableStaff.length,
      message: availableStaff.length === 0 ? 'Tiada kakitangan tersedia untuk tarikh ini' : null
    });
    
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Ralat server dalaman' }, { status: 500 });
  }
} 