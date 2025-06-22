'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();

  // Don't render Navigation if on an admin path or auth paths where it might conflict
  // Added auth paths check as well, assuming admin layout might not cover them.
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/auth')) {
    return null;
  }

  // Otherwise, render the standard Navigation
  return <Navigation />;
} 