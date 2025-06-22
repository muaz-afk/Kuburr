import localFont from "next/font/local";
import Providers from "@/components/Providers";
import ConditionalNavigation from "@/components/ConditionalNavigation";
import { Toaster } from 'sonner';
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "e-PUSARA",
  description: "Sistem Pengurusan Pusara",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ms">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <ConditionalNavigation />
          <main>{children}</main>
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
