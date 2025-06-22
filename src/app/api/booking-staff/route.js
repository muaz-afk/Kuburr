import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// POST /api/booking-staff - Assign staff to booking
export async function POST(request) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Tidak dibenarkan - Sila log masuk' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, staffAssignments } = body;

    // Validation
    if (!bookingId || !staffAssignments || !Array.isArray(staffAssignments)) {
      return NextResponse.json({ 
        error: 'ID tempahan dan tugasan kakitangan diperlukan' 
      }, { status: 400 });
    }

    // Validate that both staff types are provided (mandatory as per requirements)
    const requiredStaffTypes = ['PENGALI_KUBUR', 'PEMANDI_JENAZAH'];
    const providedStaffTypes = staffAssignments.map(a => a.staffType);
    
    for (const requiredType of requiredStaffTypes) {
      if (!providedStaffTypes.includes(requiredType)) {
        return NextResponse.json({ 
          error: `Tugasan ${requiredType === 'PENGALI_KUBUR' ? 'Pengali Kubur' : 'Pemandi Jenazah'} diperlukan` 
        }, { status: 400 });
      }
    }

    // Check if booking exists and get booking date for availability check
    const { data: booking, error: bookingError } = await supabase
      .from('Booking')
      .select('id, bookingDate, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Tempahan tidak ditemui' }, { status: 404 });
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Tidak boleh menugaskan kakitangan kepada tempahan yang dibatalkan' }, { status: 400 });
    }

    // Check staff availability for the booking date
    const bookingDate = new Date(booking.bookingDate);
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get existing assignments for this date (excluding current booking)
    const { data: existingAssignments, error: assignmentError } = await supabase
      .from('BookingStaff')
      .select(`
        staffId,
        Booking!inner (
          bookingDate,
          status
        )
      `)
      .neq('bookingId', bookingId)
      .gte('Booking.bookingDate', startOfDay.toISOString())
      .lte('Booking.bookingDate', endOfDay.toISOString())
      .neq('Booking.status', 'CANCELLED');

    if (assignmentError) {
      console.error('Error checking existing assignments:', assignmentError);
      return NextResponse.json({ error: 'Gagal menyemak ketersediaan kakitangan' }, { status: 500 });
    }

    // Check for conflicts
    const assignedStaffIds = new Set(existingAssignments?.map(a => a.staffId) || []);
    const requestedStaffIds = staffAssignments.map(a => a.staffId);
    
    for (const staffId of requestedStaffIds) {
      // Skip conflict check for "not-needed-pemandi" as it can be assigned to multiple bookings
      if (staffId === 'not-needed-pemandi') {
        continue;
      }
      
      if (assignedStaffIds.has(staffId)) {
        return NextResponse.json({ 
          error: 'Salah satu kakitangan yang dipilih sudah ditugaskan pada tarikh ini' 
        }, { status: 400 });
      }
    }

    // Remove existing assignments for this booking
    const { error: deleteError } = await supabase
      .from('BookingStaff')
      .delete()
      .eq('bookingId', bookingId);

    if (deleteError) {
      console.error('Error removing existing assignments:', deleteError);
      return NextResponse.json({ error: 'Gagal mengemaskini tugasan' }, { status: 500 });
    }

    // Insert new assignments
    const now = new Date().toISOString();
    const newAssignments = staffAssignments.map(assignment => ({
      id: uuidv4(),
      bookingId,
      staffId: assignment.staffId,
      staffType: assignment.staffType,
      assignedAt: now,
      assignedBy: user.id
    }));

    const { data: createdAssignments, error: insertError } = await supabase
      .from('BookingStaff')
      .insert(newAssignments)
      .select(`
        *,
        Staff (
          id,
          name,
          phone,
          staffType
        )
      `);

    if (insertError) {
      console.error('Error creating assignments:', insertError);
      return NextResponse.json({ error: 'Gagal mencipta tugasan kakitangan' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Tugasan kakitangan berjaya disimpan',
      assignments: createdAssignments
    }, { status: 201 });

  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Ralat server dalaman' }, { status: 500 });
  }
}

// GET /api/booking-staff - Get staff assignments for a booking
export async function GET(request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ error: 'ID tempahan diperlukan' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('BookingStaff')
      .select(`
        *,
        Staff (
          id,
          name,
          phone,
          staffType
        )
      `)
      .eq('bookingId', bookingId);

    if (error) {
      console.error('Error fetching assignments:', error);
      return NextResponse.json({ error: 'Gagal mendapatkan tugasan kakitangan' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Ralat server dalaman' }, { status: 500 });
  }
} 