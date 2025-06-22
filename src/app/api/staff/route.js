import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// GET /api/staff - Get all staff or filter by type
export async function GET(request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const staffType = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = supabase
      .from('Staff')
      .select('*')
      .order('name', { ascending: true });

    if (staffType) {
      query = query.eq('staffType', staffType);
    }

    if (activeOnly) {
      query = query.eq('isActive', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching staff:', error);
      return NextResponse.json({ error: 'Gagal mendapatkan data kakitangan' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Ralat server dalaman' }, { status: 500 });
  }
}

// POST /api/staff - Create new staff (Admin only)
export async function POST(request) {
  try {
    const supabase = createClient();
    
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
    const { name, phone, staffType } = body;

    // Validation
    if (!name || !staffType) {
      return NextResponse.json({ error: 'Nama dan jenis kakitangan diperlukan' }, { status: 400 });
    }

    if (!['PENGALI_KUBUR', 'PEMANDI_JENAZAH'].includes(staffType)) {
      return NextResponse.json({ error: 'Jenis kakitangan tidak sah' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const staffData = {
      id: uuidv4(),
      name: name.trim(),
      phone: phone ? phone.trim() : null,
      staffType,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    const { data, error } = await supabase
      .from('Staff')
      .insert(staffData)
      .select()
      .single();

    if (error) {
      console.error('Error creating staff:', error);
      return NextResponse.json({ error: 'Gagal mencipta kakitangan' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Ralat server dalaman' }, { status: 500 });
  }
} 