import nodemailer from 'nodemailer';

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Sahkan Email Anda - e-PUSARA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a237e;">Sahkan Email Anda</h2>
        <p>Terima kasih kerana mendaftar di e-PUSARA. Sila klik pautan di bawah untuk mengesahkan alamat email anda:</p>
        <p style="margin: 20px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #1a237e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Sahkan Email
          </a>
        </p>
        <p>Jika anda tidak mendaftar di e-PUSARA, sila abaikan email ini.</p>
        <p>Pautan ini akan tamat dalam masa 24 jam.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Tetapan Semula Kata Laluan - e-PUSARA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a237e;">Tetapan Semula Kata Laluan</h2>
        <p>Anda telah meminta untuk menetapkan semula kata laluan anda. Sila klik pautan di bawah untuk menetapkan kata laluan baharu:</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" 
             style="background-color: #1a237e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Tetapkan Semula Kata Laluan
          </a>
        </p>
        <p>Jika anda tidak meminta tetapan semula kata laluan, sila abaikan email ini.</p>
        <p>Pautan ini akan tamat dalam masa 1 jam.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
