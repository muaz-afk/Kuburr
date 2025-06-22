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
        { error: 'Akses ditolak. Hanya admin yang boleh mengesahkan pembayaran.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { verified, adminNotes } = body

    if (typeof verified !== 'boolean') {
      return NextResponse.json(
        { error: 'Status pengesahan pembayaran adalah wajib.' },
        { status: 400 }
      )
    }

    // Get payment and booking information
    const { data: payment, error: fetchError } = await supabase
      .from('Payment')
      .select(`
        id,
        bookingId,
        paymentStatus,
        Booking:bookingId (
          id,
          status,
          userId
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Rekod pembayaran tidak ditemukan.' },
        { status: 404 }
      )
    }

    if (payment.paymentStatus !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Hanya pembayaran yang dihantar boleh disahkan.' },
        { status: 400 }
      )
    }

    if (payment.Booking.status !== 'APPROVED_PENDING_PAYMENT') {
      return NextResponse.json(
        { error: 'Status tempahan tidak sesuai untuk pengesahan pembayaran.' },
        { status: 400 }
      )
    }

    const newPaymentStatus = verified ? 'SUCCESSFUL' : 'REJECTED'
    const newBookingStatus = verified ? 'PAYMENT_CONFIRMED' : 'APPROVED_PENDING_PAYMENT'

    // Update payment status
    const { error: paymentUpdateError } = await supabase
      .from('Payment')
      .update({
        paymentStatus: newPaymentStatus,
        verifiedBy: user.id,
        verifiedAt: new Date().toISOString(),
        paymentNotes: adminNotes || null,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)

    if (paymentUpdateError) {
      return NextResponse.json(
        { error: 'Gagal mengemas kini status pembayaran.' },
        { status: 500 }
      )
    }

    // Update booking status if payment is verified
    if (verified) {
      const { error: bookingUpdateError } = await supabase
        .from('Booking')
        .update({
          status: newBookingStatus,
          updatedAt: new Date().toISOString()
        })
        .eq('id', payment.bookingId)

      if (bookingUpdateError) {
        // Rollback payment status if booking update fails
        await supabase
          .from('Payment')
          .update({ 
            paymentStatus: 'SUBMITTED',
            verifiedBy: null,
            verifiedAt: null
          })
          .eq('id', id)

        return NextResponse.json(
          { error: 'Gagal mengemas kini status tempahan.' },
          { status: 500 }
        )
      }
    }

    const message = verified 
      ? 'Pembayaran berjaya disahkan. Tempahan kini menunggu untuk dilaksanakan.'
      : 'Pembayaran ditolak. Pelanggan perlu menghantar semula bukti pembayaran.'

    return NextResponse.json({
      message,
      payment: {
        id,
        paymentStatus: newPaymentStatus,
        verifiedBy: user.id,
        verifiedAt: new Date().toISOString()
      },
      booking: {
        id: payment.bookingId,
        status: newBookingStatus
      }
    })

  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Ralat dalaman pelayan.' },
      { status: 500 }
    )
  }
}