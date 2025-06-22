import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// PUT /api/staff/[id] - Update staff (Admin only)
export async function PUT(request, { params }) {
  try {
    const supabase = createClient();
    const { id } = params;
    
    // Check authentication and admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Tidak dibenarkan - Sila log masuk' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profiles, error: profileError } = await supabase
      .from('User')
      .select('role')
      .eq('id', user.id);

    if (profileError || !profiles || profiles.length !== 1 || profiles[0].role !== 'ADMIN') {
      return NextResponse.json({ error: 'Tidak dibenarkan - Admin sahaja' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, staffType, isActive } = body;

    // Validation
    if (!name || !staffType) {
      return NextResponse.json({ error: 'Nama dan jenis kakitangan diperlukan' }, { status: 400 });
    }

    if (!['PENGALI_KUBUR', 'PEMANDI_JENAZAH'].includes(staffType)) {
      return NextResponse.json({ error: 'Jenis kakitangan tidak sah' }, { status: 400 });
    }

    const updateData = {
      name: name.trim(),
      phone: phone ? phone.trim() : null,
      staffType,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('Staff')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating staff:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Kakitangan tidak ditemui' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Gagal mengemaskini kakitangan' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Ralat server dalaman' }, { status: 500 });
  }
}

// DELETE /api/staff/[id] - Delete staff (Admin only)
export async function DELETE(request, { params }) {
  try {
    const supabase = createClient();
    const { id } = params;
    
    // Check authentication and admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Tidak dibenarkan - Sila log masuk' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profiles, error: profileError } = await supabase
      .from('User')
      .select('role')
      .eq('id', user.id);

    if (profileError || !profiles || profiles.length !== 1 || profiles[0].role !== 'ADMIN') {
      return NextResponse.json({ error: 'Tidak dibenarkan - Admin sahaja' }, { status: 403 });
    }

    // Check if staff has any active assignments
    const { data: assignments, error: assignmentError } = await supabase
      .from('BookingStaff')
      .select('id')
      .eq('staffId', id)
      .limit(1);

    if (assignmentError) {
      console.error('Error checking staff assignments:', assignmentError);
      return NextResponse.json({ error: 'Gagal menyemak tugasan kakitangan' }, { status: 500 });
    }

    if (assignments && assignments.length > 0) {
      return NextResponse.json({ 
        error: 'Tidak boleh memadamkan kakitangan yang mempunyai tugasan aktif. Sila nonaktifkan sahaja.' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('Staff')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting staff:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Kakitangan tidak ditemui' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Gagal memadamkan kakitangan' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Kakitangan berjaya dipadamkan' });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Ralat server dalaman' }, { status: 500 });
  }
} 