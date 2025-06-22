'use client';

import AdminNavigation from '@/components/AdminNavigation';

// TODO: Add Admin-specific navigation or header if needed in the future.

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavigation /> 
      <main>{children}</main>
      {/* Potential future Admin Footer could go here */}
    </div>
  );
} 