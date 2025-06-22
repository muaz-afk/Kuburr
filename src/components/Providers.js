'use client';

// Removed SessionProvider import
// import { SessionProvider } from 'next-auth/react';

// This component might no longer be needed if SessionProvider was its only purpose.
// If you add other providers (e.g., ThemeProvider, QueryClientProvider), keep this file.
// Otherwise, you can remove the Providers wrapper from layout.js entirely.
export default function Providers({ children }) {
  // Return children directly, or wrap with other providers if any
  return <>{children}</>; 
}
