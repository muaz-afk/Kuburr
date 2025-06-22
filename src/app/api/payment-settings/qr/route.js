import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// GET - Fetch current QR image
export async function GET() {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .select('qr_image_url')
      .eq('type', 'qr_payment')
      .single();

    if (error) {
      console.error('Error fetching QR settings:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Error fetching QR settings' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      qrImageUrl: data?.qr_image_url || '/images/default-qr.png'
    });
  } catch (err) {
    console.error('Server error fetching QR settings:', err);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}

// PUT - Update QR image URL (admin only)
export async function PUT(request) {
  try {
    console.log('QR PUT request received');
    
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check result:', { user: user?.id, authError });
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required',
        error: authError?.message 
      }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('User')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('User profile check:', { userProfile, profileError });

    if (profileError || !userProfile || userProfile.role !== 'ADMIN') {
      console.log('Admin access denied:', { profileError, role: userProfile?.role });
      return NextResponse.json({ 
        success: false, 
        message: 'Admin access required',
        error: profileError?.message 
      }, { status: 403 });
    }

    const { qrImageUrl } = await request.json();

    if (!qrImageUrl || typeof qrImageUrl !== 'string') {
      return NextResponse.json({ 
        success: false, 
        message: 'Valid QR image URL is required' 
      }, { status: 400 });
    }

    // Check if setting exists
    console.log('Checking for existing QR setting...');
    const { data: existing, error: selectError } = await supabase
      .from('payment_settings')
      .select('id')
      .eq('type', 'qr_payment')
      .single();

    console.log('Existing QR setting:', { existing, selectError });

    let result;
    if (existing) {
      // Update existing
      console.log('Updating existing QR setting with URL:', qrImageUrl);
      result = await supabase
        .from('payment_settings')
        .update({ 
          qr_image_url: qrImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('type', 'qr_payment');
    } else {
      // Create new
      console.log('Creating new QR setting with URL:', qrImageUrl);
      result = await supabase
        .from('payment_settings')
        .insert({
          type: 'qr_payment',
          qr_image_url: qrImageUrl
        });
    }

    console.log('Database operation result:', result);

    if (result.error) {
      console.error('Error updating QR settings:', result.error);
      return NextResponse.json({ 
        success: false, 
        message: 'Error updating QR settings',
        error: result.error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'QR image updated successfully'
    });
  } catch (err) {
    console.error('Server error updating QR settings:', err);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error',
      error: err.message 
    }, { status: 500 });
  }
}

// OPTIONS - Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 