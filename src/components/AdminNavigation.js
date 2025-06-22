'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faUser, faTachometerAlt, faCalendarCheck, faBoxOpen, faBox, faUsers, faHandHoldingHeart, faChartBar } from '@fortawesome/free-solid-svg-icons';

export default function AdminNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState(null); // We still need user info for the profile dropdown
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Fetch user session for profile display and logout
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setIsOpen(false);
        setIsProfileOpen(false);
        // Redirect if user logs out while on an admin page
        if (!session) {
            router.push('/auth/login'); 
        }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, router]);

  // Define admin menu items
  const adminMenuItems = [
    { label: 'Dashboard', href: '/admin', icon: faTachometerAlt },
    { label: 'Tempahan', href: '/admin/bookings', icon: faCalendarCheck },
    { label: 'Pakej', href: '/admin/packages', icon: faBoxOpen },
    { label: 'Kit Jenazah', href: '/admin/kits', icon: faBox },
    { label: 'Kakitangan', href: '/admin/staff', icon: faUsers },
    { label: 'Waqaf', href: '/admin/waqaf', icon: faHandHoldingHeart },
    { label: 'Statistik', href: '/admin/statistics', icon: faChartBar },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsProfileOpen(false);
    setIsOpen(false);
    router.push('/auth/login'); // Redirect to login after admin logout
    router.refresh();
  };

  const isActivePath = (href) => {
    if (href === '/admin' && pathname === '/admin') {
        return true;
    }
    return pathname.startsWith(href) && href !== '/admin';
  };

  const getUserDisplayName = () => {
      if (!user) return '';
      // Assuming role info isn't directly needed in display name here
      return user.user_metadata?.full_name || user.email || 'Admin';
  };

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo/Title */}
          <div className="flex-shrink-0">
            <Link href="/admin" className="text-xl font-bold">
              Admin Panel
            </Link>
          </div>
          
          {/* Center: Desktop Navigation Links */}
          <div className="hidden md:flex md:items-center">
            <div className="flex items-baseline space-x-4">
              {adminMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActivePath(item.href)
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {item.icon && <FontAwesomeIcon icon={item.icon} className="mr-2 h-4 w-4" />} 
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side: Profile Dropdown */}
          <div className="hidden md:block">
             {user ? (
                <div className="relative ml-3">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <FontAwesomeIcon icon={faUser} className="h-4 w-4 mr-2" />
                    {getUserDisplayName()}
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                      <div className="py-1" role="menu">
                         {/* No profile links needed for admin nav, maybe add later? */}
                         {/* Example: 
                         <Link href="/profile" ...>Profil</Link>
                         */}
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                        >
                          Log Keluar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                 <Link href="/auth/login" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    Log Masuk
                 </Link>
              )}
           </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
             {user && (
               <button
                 onClick={() => setIsProfileOpen(!isProfileOpen)}
                 className="text-gray-300 hover:bg-gray-700 hover:text-white p-2 rounded-md mr-2"
               >
                 <FontAwesomeIcon icon={faUser} className="h-6 w-6" />
               </button>
             )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <FontAwesomeIcon
                icon={isOpen ? faTimes : faBars}
                className="h-6 w-6"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {adminMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors block ${
                  isActivePath(item.href)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                 {item.icon && <FontAwesomeIcon icon={item.icon} className="mr-3 h-5 w-5" />} 
                 {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      {/* Mobile Profile Dropdown (Simplified for now) */}
      {isProfileOpen && user && (
           <div className="md:hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 mr-4">
             <div className="py-1" role="menu">
               <button
                 onClick={handleSignOut}
                 className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                 role="menuitem"
               >
                 Log Keluar
               </button>
             </div>
           </div>
      )}
    </nav>
  );
} 