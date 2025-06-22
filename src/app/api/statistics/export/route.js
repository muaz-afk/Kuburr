import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { type, year, month, data } = await request.json();
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For admin exports, verify admin role
    if (type === 'admin') {
      const { data: profiles, error: profileError } = await supabase
        .from('User')
        .select('role')
        .eq('id', String(user.id));

      if (profileError || !profiles || profiles.length !== 1 || profiles[0].role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }
    }

    // Generate PDF content
    const pdfContent = generatePdfContent(type, year, month, data, user);
    
    // For now, return HTML content that can be converted to PDF on the client side
    // In production, you might want to use libraries like puppeteer or jsPDF on server
    return NextResponse.json({ 
      success: true,
      htmlContent: pdfContent,
      filename: `${type}-statistics-${year}${month ? `-${month}` : ''}.pdf`
    });
  } catch (error) {
    console.error('Error in export API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generatePdfContent(type, year, month, data, user) {
  const isAdmin = type === 'admin';
  const reportTitle = isAdmin ? 'Laporan Statistik Admin' : 'Laporan Statistik Pengguna';
  const periodText = month ? `${getMonthName(month)} ${year}` : `Tahun ${year}`;
  
  let content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #1a237e; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #1a237e; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .period { color: #666; font-size: 16px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1a237e; }
        .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
        .section { margin: 30px 0; }
        .section-title { color: #1a237e; font-size: 18px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .amount { text-align: right; }
        .generated-by { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${reportTitle}</div>
        <div class="period">Tempoh: ${periodText}</div>
      </div>
  `;

  if (isAdmin) {
    // Admin statistics
    const bookingStats = data.bookings;
    const waqafStats = data.waqaf;
    
    content += `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${bookingStats.totalBookings}</div>
          <div class="stat-label">Jumlah Tempahan</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">RM ${bookingStats.totalBookingAmount.toFixed(2)}</div>
          <div class="stat-label">Jumlah Pendapatan Tempahan</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${waqafStats.totalWaqaf}</div>
          <div class="stat-label">Jumlah Waqaf</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">RM ${waqafStats.totalWaqafAmount.toFixed(2)}</div>
          <div class="stat-label">Jumlah Sumbangan Waqaf</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Ringkasan Tempahan</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${bookingStats.pendingBookings}</div>
            <div class="stat-label">Menunggu</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${bookingStats.confirmedBookings}</div>
            <div class="stat-label">Disahkan</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${bookingStats.completedBookings}</div>
            <div class="stat-label">Selesai</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Senarai Tempahan</div>
        <table>
          <thead>
            <tr>
              <th>Tarikh</th>
              <th>Pengguna</th>
              <th>Plot</th>
              <th>Si Mati</th>
              <th>Status</th>
              <th class="amount">Jumlah (RM)</th>
            </tr>
          </thead>
          <tbody>
            ${bookingStats.data.map(booking => `
              <tr>
                <td>${new Date(booking.bookingDate).toLocaleDateString('ms-MY')}</td>
                <td>${booking.userName}</td>
                <td>${booking.plotInfo}</td>
                <td>${booking.deceasedName}</td>
                <td>${booking.status}</td>
                <td class="amount">${booking.totalPrice ? booking.totalPrice.toFixed(2) : '0.00'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Senarai Waqaf</div>
        <table>
          <thead>
            <tr>
              <th>Tarikh</th>
              <th>Penderma</th>
              <th>Email</th>
              <th>Status</th>
              <th class="amount">Jumlah (RM)</th>
              <th>Mesej</th>
            </tr>
          </thead>
          <tbody>
            ${waqafStats.data.map(waqaf => `
              <tr>
                <td>${new Date(waqaf.created_at).toLocaleDateString('ms-MY')}</td>
                <td>${waqaf.donor_name || 'Tanpa Nama'}</td>
                <td>${waqaf.donor_email || '-'}</td>
                <td>${waqaf.payment_status}</td>
                <td class="amount">${parseFloat(waqaf.amount).toFixed(2)}</td>
                <td>${waqaf.message || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    // User statistics
    content += `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.totalBookings}</div>
          <div class="stat-label">Jumlah Tempahan</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">RM ${data.totalAmount.toFixed(2)}</div>
          <div class="stat-label">Jumlah Pembayaran</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.pendingBookings}</div>
          <div class="stat-label">Menunggu</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.completedBookings}</div>
          <div class="stat-label">Selesai</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Senarai Tempahan Anda</div>
        <table>
          <thead>
            <tr>
              <th>Tarikh</th>
              <th>Plot</th>
              <th>Si Mati</th>
              <th>Status</th>
              <th class="amount">Jumlah (RM)</th>
            </tr>
          </thead>
          <tbody>
            ${data.bookings.map(booking => `
              <tr>
                <td>${new Date(booking.bookingDate).toLocaleDateString('ms-MY')}</td>
                <td>${booking.plotInfo}</td>
                <td>${booking.deceasedName}</td>
                <td>${booking.status}</td>
                <td class="amount">${booking.totalPrice ? booking.totalPrice.toFixed(2) : '0.00'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  content += `
      <div class="generated-by">
        Laporan dijana pada: ${new Date().toLocaleString('ms-MY')}<br>
        Dijana oleh: ${user.email}
      </div>
    </body>
    </html>
  `;

  return content;
}

function getMonthName(month) {
  const months = [
    'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
  ];
  return months[parseInt(month) - 1] || 'Tidak Sah';
} 