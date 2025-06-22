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
        { error: 'Akses ditolak. Hanya admin yang boleh menandakan tempahan sebagai selesai.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { adminNotes } = body

    // Get the booking first to validate status
    const { data: booking, error: fetchError } = await supabase
      .from('Booking')
      .select('id, status, plotId, deceasedId')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Tempahan tidak ditemukan.' },
        { status: 404 }
      )
    }

    if (booking.status !== 'PAYMENT_CONFIRMED') {
      return NextResponse.json(
        { error: 'Hanya tempahan dengan pembayaran yang disahkan boleh ditandakan sebagai selesai.' },
        { status: 400 }
      )
    }

    // Update booking status to COMPLETED
    const { data: updatedBooking, error: updateError } = await supabase
      .from('Booking')
      .update({
        status: 'COMPLETED',
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

    // Update plot status to OCCUPIED
    await supabase
      .from('Plot')
      .update({ status: 'OCCUPIED' })
      .eq('id', booking.plotId)

    // If there's a deceased record, ensure it's properly linked
    if (booking.deceasedId) {
      await supabase
        .from('Deceased')
        .update({ 
          plotId: booking.plotId,
          updatedAt: new Date().toISOString()
        })
        .eq('id', booking.deceasedId)
    }

    // Update funeral kit usage to reflect actual consumption
    const { data: kitUsage } = await supabase
      .from('BookingFuneralKit')
      .select('kitId, quantity')
      .eq('bookingId', id)

    if (kitUsage && kitUsage.length > 0) {
      for (const kit of kitUsage) {
        // Update total used count
        await supabase
          .from('FuneralKit')
          .update({
            totalUsed: supabase.raw('totalUsed + ?', [kit.quantity])
          })
          .eq('id', kit.kitId)

        // Create usage audit record for completion
        await supabase
          .from('FuneralKitUsage')
          .insert({
            kitId: kit.kitId,
            bookingId: id,
            quantityChange: -kit.quantity, // Negative to indicate consumption
            reason: 'BOOKING_COMPLETED',
            changedBy: user.id,
            notes: 'Kit digunakan untuk tempahan yang telah selesai'
          })
      }
    }

    return NextResponse.json({
      message: 'Tempahan berjaya ditandakan sebagai selesai. Plot kini berstatus OCCUPIED.',
      booking: updatedBooking
    })

  } catch (error) {
    console.error('Error completing booking:', error)
    return NextResponse.json(
      { error: 'Ralat dalaman pelayan.' },
      { status: 500 }
    )
  }
}