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

    const { id } = params
    const formData = await request.formData()
    const receiptFile = formData.get('receipt')
    const transactionId = formData.get('transactionId')
    const paymentNotes = formData.get('paymentNotes')

    // Validate booking ownership and status
    const { data: booking, error: fetchError } = await supabase
      .from('Booking')
      .select('id, userId, status, totalPrice')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Tempahan tidak ditemukan.' },
        { status: 404 }
      )
    }

    if (booking.userId !== user.id) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda hanya boleh mengurus tempahan sendiri.' },
        { status: 403 }
      )
    }

    if (booking.status !== 'APPROVED_PENDING_PAYMENT') {
      return NextResponse.json(
        { error: 'Pembayaran hanya boleh dibuat untuk tempahan yang diluluskan.' },
        { status: 400 }
      )
    }

    let receiptUrl = null
    let receiptFilename = null

    // Handle receipt file upload if provided
    if (receiptFile && receiptFile.size > 0) {
      const filename = `payment_receipt_${id}_${Date.now()}.${receiptFile.name.split('.').pop()}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(`payment_receipts/${user.id}/${filename}`, receiptFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        return NextResponse.json(
          { error: 'Gagal memuat naik resit pembayaran.' },
          { status: 500 }
        )
      }

      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(uploadData.path)

      receiptUrl = urlData.publicUrl
      receiptFilename = filename
    }

    // Update payment record
    const { data: payment, error: paymentError } = await supabase
      .from('Payment')
      .update({
        paymentStatus: 'SUBMITTED',
        transactionId: transactionId || null,
        receiptUrl,
        receiptFilename,
        paymentNotes: paymentNotes || null,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('bookingId', id)
      .eq('paymentStatus', 'PENDING')
      .select()
      .single()

    if (paymentError) {
      // Clean up uploaded file if payment update fails
      if (receiptUrl) {
        await supabase.storage
          .from('profiles')
          .remove([`payment_receipts/${user.id}/${receiptFilename}`])
      }

      return NextResponse.json(
        { error: 'Gagal mengemas kini rekod pembayaran.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Pembayaran berjaya dihantar. Menunggu pengesahan daripada admin.',
      payment: {
        id: payment.id,
        amount: payment.amount,
        paymentStatus: payment.paymentStatus,
        receiptUrl: payment.receiptUrl,
        paidAt: payment.paidAt
      }
    })

  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Ralat dalaman pelayan.' },
      { status: 500 }
    )
  }
}

export async function GET(request, { params }) {
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

    const { id } = params

    // Validate booking ownership
    const { data: booking, error: fetchError } = await supabase
      .from('Booking')
      .select('id, userId')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Tempahan tidak ditemukan.' },
        { status: 404 }
      )
    }

    // Check if user is admin for additional access
    const { data: profiles } = await supabase
      .from('User')
      .select('role')
      .eq('id', String(user.id))
    
    const isAdmin = profiles && profiles.length === 1 && profiles[0].role === 'ADMIN'
    
    if (booking.userId !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Akses ditolak.' },
        { status: 403 }
      )
    }

    // Get payment information
    const { data: payment, error: paymentError } = await supabase
      .from('Payment')
      .select(`
        id,
        amount,
        currency,
        paymentMethod,
        paymentStatus,
        transactionId,
        receiptUrl,
        receiptFilename,
        paidAt,
        verifiedAt,
        verifiedBy,
        paymentNotes,
        createdAt
      `)
      .eq('bookingId', id)
      .single()

    if (paymentError) {
      return NextResponse.json(
        { error: 'Maklumat pembayaran tidak ditemukan.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ payment })

  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { error: 'Ralat dalaman pelayan.' },
      { status: 500 }
    )
  }
}