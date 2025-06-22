import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Sila log masuk terlebih dahulu.' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profiles, error: profileError } = await supabase
      .from('User')
      .select('role')
      .eq('id', String(user.id))

    if (profileError || !profiles || profiles.length !== 1 || profiles[0].role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya admin yang boleh melihat senarai tempahan.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // Filter by status
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10
    const offset = (page - 1) * limit

    // Build query based on filters
    let query = supabase
      .from('Booking')
      .select(`
        id,
        userId,
        plotId,
        bookingDate,
        totalPrice,
        status,
        createdAt,
        updatedAt,
        approvalDate,
        approvedBy,
        rejectionReason,
        paymentDeadline,
        adminNotes,
        death_certificate_url,
        burial_permit_url,
        User:userId (
          id,
          name,
          email,
          phone
        ),
        Plot:plotId (
          id,
          plotIdentifier,
          row,
          column
        ),
        Deceased:deceasedId (
          id,
          name,
          icNumber,
          gender,
          dateOfBirth,
          dateOfDeath
        ),
        BookingPackage (
          Package:packageId (
            id,
            label,
            price
          )
        ),
        BookingStaff (
          id,
          staffType,
          Staff:staffId (
            id,
            name,
            staffType
          )
        ),
        BookingFuneralKit (
          quantity,
          FuneralKit:kitId (
            id,
            kitType
          )
        ),
        Payment (
          id,
          amount,
          paymentStatus,
          paymentMethod,
          receiptUrl,
          paidAt,
          verifiedAt,
          verifiedBy
        )
      `)
      .order('createdAt', { ascending: false })

    // Apply status filter if provided
    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('Booking')
      .select('id', { count: 'exact', head: true })

    if (status && status !== 'ALL') {
      countQuery = countQuery.eq('status', status)
    }

    const { count: totalCount } = await countQuery

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json(
        { error: 'Gagal mendapatkan senarai tempahan.' },
        { status: 500 }
      )
    }

    // Calculate statistics for dashboard
    const { data: stats } = await supabase
      .from('Booking')
      .select('status')

    const statistics = stats?.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1
      },
      statistics
    })

  } catch (error) {
    console.error('Error in admin bookings API:', error)
    return NextResponse.json(
      { error: 'Ralat dalaman pelayan.' },
      { status: 500 }
    )
  }
}