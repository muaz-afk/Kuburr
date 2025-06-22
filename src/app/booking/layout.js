import { BookingContextProvider } from "@/context/BookingContext";

// Layout for the booking section
export default function BookingLayout({ children }) {
  return (
    <BookingContextProvider>
      <main className="min-h-screen bg-gray-50">
        {/* Children will be booking/page.js or booking/register/page.js etc. */}
        {children}
      </main>
    </BookingContextProvider>
  );
} 