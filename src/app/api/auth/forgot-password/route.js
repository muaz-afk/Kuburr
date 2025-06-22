import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Alamat email diperlukan' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format alamat email tidak sah' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Use Supabase's resetPasswordForEmail method
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.epusaraalfirdaus.systems';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });

    if (error) {
      console.error('Reset password error:', error);
      // Don't reveal whether the email exists for security reasons
      return NextResponse.json(
        { message: 'Jika akaun wujud, arahan untuk menetapkan semula kata laluan telah dihantar ke email anda.' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'Jika akaun wujud, arahan untuk menetapkan semula kata laluan telah dihantar ke email anda.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password API error:', error);
    return NextResponse.json(
      { error: 'Ralat dalaman pelayan' },
      { status: 500 }
    );
  }
}