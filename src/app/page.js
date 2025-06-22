'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPhone } from '@fortawesome/free-solid-svg-icons';
import Loading from '@/components/Loading';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('simati');

  useEffect(() => {
    const checkUserRoleAndRedirect = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user session:", userError);
        setIsLoading(false);
        return;
      }

      if (user) {
        const { data: profiles, error: profileError } = await supabase
          .from('User')
          .select('role')
          .eq('id', String(user.id));
        
        console.log('Profile fetch result (Homepage):', { profiles, profileError }); 

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          const errorMsg = profileError.message || 'Ralat tidak diketahui semasa mendapatkan profil.';
          toast.error(`Gagal mendapatkan maklumat pengguna: ${errorMsg}`);
          setIsLoading(false);
          return;
        }

        if (!profiles || profiles.length !== 1) {
            console.error('Error: Expected exactly one profile, found:', profiles ? profiles.length : 0);
            toast.error('Gagal mengesahkan maklumat pengguna (Profil tidak ditemui atau duplikasi).');
            setIsLoading(false);
            return;
        }

        const profile = profiles[0];
        if (profile && profile.role === 'ADMIN') {
          router.replace('/admin');
          return; 
        } 
      } 
      
      setIsLoading(false);
    };

    checkUserRoleAndRedirect();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error('Sila masukkan maklumat carian.');
      return;
    }
    router.push(`/carian?q=${encodeURIComponent(searchTerm)}&type=${searchType}`);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section - Updated Titles */}
      <section className="bg-primary text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            SISTEM PENGURUSAN PERKUBURAN ISLAM
          </h1>
          <h2 className="text-3xl md:text-4xl font-semibold">
            AL FIRDAUS
          </h2>
        </div>
      </section>

      {/* Doa & Search Section - With graveyard background image */}
      <section className="py-16 px-4 relative overflow-hidden">
        {/* Graveyard Background Image covering the entire section */}
        <img
          src="/kuburrrr.jpeg"
          alt="Picture of the graveyards"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        
        <div className="max-w-4xl mx-auto text-center relative z-20">
          {/* Doa Section */}
          <h3 className="text-3xl font-bold text-white mb-4">
            DOA KETIKA MENZIARAH KUBUR
          </h3>
          <Link href="/carian" className="block mb-6 cursor-pointer">
            <img
              src="/doa_white.png"
              alt="Doa Menziarah Kubur"
              className="max-w-full md:max-w-2xl h-auto mx-auto mb-4 rounded shadow"
            />
          </Link>
          <p className="text-yellow-400 italic mb-10 md:text-lg font-medium max-w-full leading-relaxed">
            "Sejahtera ke atas kamu wahai penghuni kubur daripada orang-orang mukmin dan muslim. Sesungguhnya kami dengan kehendak Allah akan mengikuti kamu. Semoga Allah memberi rahmat kepada orang yang terdahulu pergi dan yang mengikuti kemudian, kami memohon kepada Allah kesejahteraan bagi kami dan kamu." - <span className="font-semibold not-italic">HR Muslim & Ibnu Majah</span>
          </p>

          {/* Search Section Card */}
          <div className="bg-white/95 p-6 md:p-8 rounded-lg shadow-lg max-w-2xl mx-auto backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-primary mb-3">
              CARIAN PUSARA
            </h3>
            <p className="text-gray-700 mb-5">
              Sila masukkan maklumat carian:
            </p>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
                <label className="flex items-center gap-2 cursor-pointer text-black bg-gray-50 px-2 py-1 rounded border">
                    <input
                      type="radio"
                      name="search-option"
                      value="simati"
                      checked={searchType === 'simati'}
                      onChange={() => setSearchType('simati')}
                      className="form-radio h-4 w-4 text-primary focus:ring-primary"
                    />
                    Maklumat Simati (Nama/MyKad)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-black bg-gray-50 px-2 py-1 rounded border">
                    <input
                      type="radio"
                      name="search-option"
                      value="kodpusara"
                      checked={searchType === 'kodpusara'}
                      onChange={() => setSearchType('kodpusara')}
                      className="form-radio h-4 w-4 text-primary focus:ring-primary"
                    />
                    Kod Plot (cth: A1-5)
                </label>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Masukkan Maklumat Carian"
                className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white"
              />
              <button
                type="submit"
                className="w-full md:w-auto bg-primary text-white px-8 py-3 rounded-md hover:bg-primary-light transition-colors flex items-center justify-center gap-2 text-lg font-medium"
              >
                <FontAwesomeIcon icon={faSearch} />
                Cari
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-8 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-primary mb-8">Mengenal Kami</h2>
          <div className="prose max-w-none text-black">
            <p className="mb-4">
              Laman web e-Pusara ini adalah laman khusus bagi pengunjung laman web untuk mendapatkan pelbagai maklumat mengenai 
              pengurusan tanah perkuburan di kawasan Parit Yaani. Laman web ini menawarkan kemudahan penempahan pakej pengurusan 
              perkuburan serta pencarian pusara untuk tanah perkuburan Islam di kawasan Parit Yaani.
            </p>
            <p className="mb-4">
              Carian pusara ini boleh dilakukan dengan memasukkan salah satu daripada maklumat berikut:-
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Nama pemilik si mati</li>
              <li>No lot pusara</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer - Updated Content */}
      <footer className="bg-primary text-white py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
          <p className="mb-2 sm:mb-0">&copy; {new Date().getFullYear()} Pihak Pengurusan Jenazah Al-Firdaus</p>
          <a href="tel:012-345678" className="flex items-center justify-center gap-2 hover:text-primary-light transition-colors">
            <FontAwesomeIcon icon={faPhone} className="h-5 w-5" /> 
            Hubungi: 012-345678
          </a>
        </div>
      </footer>
    </main>
  );
}
