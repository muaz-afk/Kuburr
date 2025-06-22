import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/funeral-kits - Get all funeral kit information
export async function GET() {
  try {
    const supabase = createClient();

    // Get the current user to check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all funeral kits with their current quantities
    const { data: kits, error: kitsError } = await supabase
      .from('FuneralKit')
      .select('*')
      .order('kitType', { ascending: true });

    if (kitsError) {
      console.error('Error fetching funeral kits:', kitsError);
      return NextResponse.json(
        { error: 'Failed to fetch funeral kit data' },
        { status: 500 }
      );
    }

    console.log('[funeral-kits API] Fetched kits from database:', kits);
    console.log('[funeral-kits API] Kit count:', kits?.length || 0);
    
    return NextResponse.json({
      success: true,
      kits: kits || []
    });

  } catch (error) {
    console.error('Unexpected error in funeral-kits API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/funeral-kits - Update kit quantities (Admin only)
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

    // Check if user is admin
    const { data: profiles, error: profileError } = await supabase
      .from('User')
      .select('role')
      .eq('id', String(user.id));

    if (profileError || !profiles || profiles.length !== 1 || profiles[0].role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { kitId, quantityChange, reason, notes } = body;

    // Validate input
    if (!kitId || typeof quantityChange !== 'number' || quantityChange === 0) {
      return NextResponse.json(
        { error: 'Invalid input. kitId and non-zero quantityChange are required.' },
        { status: 400 }
      );
    }

    if (!reason || !['ADMIN_ADD', 'ADMIN_REMOVE'].includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason. Must be ADMIN_ADD or ADMIN_REMOVE.' },
        { status: 400 }
      );
    }

    // Get current kit data
    const { data: currentKit, error: kitError } = await supabase
      .from('FuneralKit')
      .select('*')
      .eq('id', kitId)
      .single();

    if (kitError || !currentKit) {
      return NextResponse.json(
        { error: 'Funeral kit not found' },
        { status: 404 }
      );
    }

    // Calculate new quantity
    const newQuantity = currentKit.availableQuantity + quantityChange;

    // Validate new quantity is not negative
    if (newQuantity < 0) {
      return NextResponse.json(
        { error: `Cannot reduce quantity below 0. Current: ${currentKit.availableQuantity}, Requested change: ${quantityChange}` },
        { status: 400 }
      );
    }

    // Start transaction by updating kit quantity
    const { error: updateError } = await supabase
      .from('FuneralKit')
      .update({
        availableQuantity: newQuantity,
        updatedAt: new Date().toISOString()
      })
      .eq('id', kitId);

    if (updateError) {
      console.error('Error updating funeral kit quantity:', updateError);
      return NextResponse.json(
        { error: 'Failed to update kit quantity' },
        { status: 500 }
      );
    }

    // Create usage record
    const usageId = `usage_${kitId}_${Date.now()}`;
    const { error: usageError } = await supabase
      .from('FuneralKitUsage')
      .insert({
        id: usageId,
        kitId: kitId,
        bookingId: null,
        quantityChange: quantityChange,
        reason: reason,
        changedBy: user?.id || null,
        notes: notes || null
      });

    if (usageError) {
      console.error('Error creating usage record:', usageError);
      // Note: We could rollback the kit update here, but for simplicity we'll log the error
      // In a production system, you'd want to use database transactions
    }

    // Fetch updated kit data
    const { data: updatedKit, error: fetchError } = await supabase
      .from('FuneralKit')
      .select('*')
      .eq('id', kitId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated kit data:', fetchError);
    }

    return NextResponse.json({
      success: true,
      message: `Kit quantity updated successfully. ${quantityChange > 0 ? 'Added' : 'Removed'} ${Math.abs(quantityChange)} kit(s).`,
      kit: updatedKit || currentKit
    });

  } catch (error) {
    console.error('Unexpected error in funeral-kits POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}