'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faUser } from '@fortawesome/free-solid-svg-icons';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

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
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, router]);

  const menuItems = user ? [
    { label: 'UTAMA', href: '/' },
    { label: 'CARIAN', href: '/carian' },
    { label: 'LOKASI', href: '/location' },
    { label: 'TEMPAH', href: '/booking/register' },
    { label: 'WAQAF', href: '/waqaf' },
  ] : [
    { label: 'UTAMA', href: '/' },
    { label: 'LOKASI', href: '/location' },
    { label: 'WAQAF', href: '/waqaf' },
  ];

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'e-PUSARA';
      case '/auth/login':
        return 'Log Masuk';
      case '/auth/register':
        return 'Daftar Akaun';
      case '/booking':
        return 'Tempahan Kubur';
      case '/booking/register':
        return 'Pendaftaran Tempahan';
      case '/location':
        return 'Lokasi';
      default:
        return 'e-PUSARA';
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsProfileOpen(false);
    setIsOpen(false);
    router.push('/');
    router.refresh();
  };

  const isActivePath = (href) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const getUserDisplayName = () => {
      if (!user) return '';
      return user.user_metadata?.full_name || user.email || 'Profil';
  };

  return (
    <nav className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold">
              {getPageTitle()}
            </Link>
          </div>
          
          <div className="hidden md:flex md:items-center">
            <div className="flex items-baseline space-x-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActivePath(item.href)
                      ? 'bg-primary-dark text-white'
                      : 'hover:bg-primary-light text-white/90'
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {user ? (
                <div className="relative ml-3">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center hover:bg-primary-light px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <FontAwesomeIcon icon={faUser} className="h-4 w-4 mr-2" />
                    {getUserDisplayName()}
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1" role="menu">
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Profil
                        </Link>
                        <Link
                          href="/profile/change-password"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Tukar Kata Laluan
                       </Link>
                                               <Link
                          href="/profile/bookings"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Sejarah Tempahan
                        </Link>
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
                <>
                  <Link
                    href="/auth/login"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActivePath('/auth/login')
                        ? 'bg-primary-dark text-white'
                        : 'hover:bg-primary-light text-white/90'
                    }`}
                  >
                    LOG MASUK
                  </Link>
                  <Link
                    href="/auth/register"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActivePath('/auth/register')
                        ? 'bg-primary-dark text-white'
                        : 'hover:bg-primary-light text-white/90'
                    }`}
                  >
                    DAFTAR
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md hover:bg-primary-light focus:outline-none"
            >
              <FontAwesomeIcon
                icon={isOpen ? faTimes : faBars}
                className="h-6 w-6"
              />
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActivePath(item.href)
                      ? 'bg-primary-dark text-white'
                      : 'hover:bg-primary-light text-white/90'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 rounded-md text-base font-medium hover:bg-primary-light"
                    onClick={() => setIsOpen(false)}
                  >
                    Profil ({getUserDisplayName()})
                  </Link>
                  <Link
                    href="/profile/change-password"
                    className="block px-3 py-2 rounded-md text-base font-medium hover:bg-primary-light"
                    onClick={() => setIsOpen(false)}
                  >
                    Tukar Kata Laluan
                  </Link>
                  <Link
                    href="/profile/bookings"
                    className="block px-3 py-2 rounded-md text-base font-medium hover:bg-primary-light"
                    onClick={() => setIsOpen(false)}
                  >
                    Sejarah Tempahan
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-primary-light"
                  >
                    Log Keluar
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActivePath('/auth/login')
                        ? 'bg-primary-dark text-white'
                        : 'hover:bg-primary-light text-white/90'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    LOG MASUK
                  </Link>
                  <Link
                    href="/auth/register"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActivePath('/auth/register')
                        ? 'bg-primary-dark text-white'
                        : 'hover:bg-primary-light text-white/90'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    DAFTAR
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
