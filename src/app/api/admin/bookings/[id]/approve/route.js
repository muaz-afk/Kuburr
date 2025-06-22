import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
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
        { error: 'Akses ditolak. Hanya admin yang boleh meluluskan tempahan.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { adminNotes } = body

    // Get the booking first to validate status
    const { data: booking, error: fetchError } = await supabase
      .from('Booking')
      .select('id, status, totalPrice, userId, plotId')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Tempahan tidak ditemukan.' },
        { status: 404 }
      )
    }

    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Hanya tempahan yang berstatus PENDING boleh diluluskan.' },
        { status: 400 }
      )
    }

    // Start transaction by updating booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('Booking')
      .update({
        status: 'APPROVED_PENDING_PAYMENT',
        approvedBy: user.id,
        adminNotes: adminNotes || null,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Gagal mengemas kini status tempahan.' },
        { status: 500 }
      )
    }

    // Create initial payment record
    const { error: paymentError } = await supabase
      .from('Payment')
      .insert({
        bookingId: id,
        amount: booking.totalPrice,
        currency: 'MYR',
        paymentMethod: 'QR_PAYMENT',
        paymentStatus: 'PENDING'
      })

    if (paymentError) {
      // Rollback booking status if payment creation fails
      await supabase
        .from('Booking')
        .update({ 
          status: 'PENDING',
          approvedBy: null,
          adminNotes: null
        })
        .eq('id', id)

      return NextResponse.json(
        { error: 'Gagal mencipta rekod pembayaran.' },
        { status: 500 }
      )
    }

    // Update plot status to BOOKED if not already
    await supabase
      .from('Plot')
      .update({ status: 'BOOKED' })
      .eq('id', booking.plotId)

    return NextResponse.json({
      message: 'Tempahan berjaya diluluskan. Pelanggan akan dimaklumkan untuk membuat pembayaran.',
      booking: updatedBooking,
      paymentDeadline: updatedBooking.paymentDeadline
    })

  } catch (error) {
    console.error('Error approving booking:', error)
    return NextResponse.json(
      { error: 'Ralat dalaman pelayan.' },
      { status: 500 }
    )
  }
}