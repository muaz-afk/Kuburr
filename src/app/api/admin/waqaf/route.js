import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET() {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('Waqaf')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching waqaf records:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Error fetching waqaf records' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (err) {
    console.error('Server error fetching waqaf records:', err);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
} 