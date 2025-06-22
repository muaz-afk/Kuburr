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
        { error: 'Akses ditolak. Hanya admin yang boleh menolak tempahan.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { rejectionReason, adminNotes } = body

    if (!rejectionReason || rejectionReason.trim() === '') {
      return NextResponse.json(
        { error: 'Sebab penolakan adalah wajib.' },
        { status: 400 }
      )
    }

    // Get the booking first to validate status and get related data
    const { data: booking, error: fetchError } = await supabase
      .from('Booking')
      .select('id, status, plotId, userId')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Tempahan tidak ditemukan.' },
        { status: 404 }
      )
    }

    if (!['PENDING', 'APPROVED_PENDING_PAYMENT'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Tempahan tidak boleh ditolak pada status semasa.' },
        { status: 400 }
      )
    }

    // Update booking status to REJECTED
    const { data: updatedBooking, error: updateError } = await supabase
      .from('Booking')
      .update({
        status: 'REJECTED',
        approvedBy: user.id,
        rejectionReason: rejectionReason.trim(),
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

    // Release the plot by setting it back to AVAILABLE
    await supabase
      .from('Plot')
      .update({ 
        status: 'AVAILABLE',
        bookingId: null
      })
      .eq('id', booking.plotId)

    // Cancel any existing payment records for this booking
    await supabase
      .from('Payment')
      .update({ paymentStatus: 'CANCELLED' })
      .eq('bookingId', id)
      .eq('paymentStatus', 'PENDING')

    // Release any reserved funeral kits
    const { data: kitReservations } = await supabase
      .from('BookingFuneralKit')
      .select('kitId, quantity')
      .eq('bookingId', id)

    if (kitReservations && kitReservations.length > 0) {
      for (const reservation of kitReservations) {
        // Return quantities to available stock
        await supabase
          .from('FuneralKit')
          .update({
            availableQuantity: supabase.raw('availableQuantity + ?', [reservation.quantity])
          })
          .eq('id', reservation.kitId)

        // Create usage audit record
        await supabase
          .from('FuneralKitUsage')
          .insert({
            kitId: reservation.kitId,
            bookingId: id,
            quantityChange: reservation.quantity,
            reason: 'BOOKING_REJECTED',
            changedBy: user.id,
            notes: `Tempahan ditolak: ${rejectionReason}`
          })
      }
    }

    return NextResponse.json({
      message: 'Tempahan berjaya ditolak. Pelanggan akan dimaklumkan.',
      booking: updatedBooking,
      rejectionReason
    })

  } catch (error) {
    console.error('Error rejecting booking:', error)
    return NextResponse.json(
      { error: 'Ralat dalaman pelayan.' },
      { status: 500 }
    )
  }
}