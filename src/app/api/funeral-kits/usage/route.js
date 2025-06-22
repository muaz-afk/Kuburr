import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/funeral-kits/usage - Get funeral kit usage history (Admin only)
export async function GET(request) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const kitId = searchParams.get('kitId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Build query
    let query = supabase
      .from('FuneralKitUsage')
      .select(`
        *,
        kit:kitId (
          id,
          kitType
        ),
        changedByUser:changedBy (
          id,
          name,
          email
        ),
        booking:bookingId (
          id,
          deceased:Deceased (
            name,
            icNumber
          )
        )
      `)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by kitId if provided
    if (kitId) {
      query = query.eq('kitId', kitId);
    }

    const { data: usageHistory, error: usageError } = await query;

    if (usageError) {
      console.error('Error fetching funeral kit usage history:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage history' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('FuneralKitUsage')
      .select('*', { count: 'exact', head: true });

    if (kitId) {
      countQuery = countQuery.eq('kitId', kitId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting usage count:', countError);
    }

    return NextResponse.json({
      success: true,
      usage: usageHistory || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }
    });

  } catch (error) {
    console.error('Unexpected error in funeral-kits usage API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}