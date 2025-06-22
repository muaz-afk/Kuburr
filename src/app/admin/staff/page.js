'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Loading from '@/components/Loading';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faPlus, 
  faEdit, 
  faTrash, 
  faSpinner, 
  faUserTie, 
  faUser,
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';

const STAFF_TYPES = {
  PENGALI_KUBUR: { label: 'Pengali Kubur', icon: faUserTie },
  PEMANDI_JENAZAH: { label: 'Pemandi Jenazah', icon: faUser }
};

export default function AdminStaffPage() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PENGALI_KUBUR, PEMANDI_JENAZAH, ACTIVE, INACTIVE
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    staffType: 'PENGALI_KUBUR',
    isActive: true
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Sila log masuk untuk mengakses halaman admin.');
        router.push('/auth/login');
        return false;
      }

      // Fetch user profile to check role
      const { data: profiles, error: profileError } = await supabase
        .from('User')
        .select('role')
        .eq('id', String(user.id));
        
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        toast.error(`Gagal mendapatkan maklumat pengguna: ${profileError.message}`);
        router.push('/');
        return false;
      }

      if (!profiles || profiles.length !== 1 || profiles[0].role !== 'ADMIN') {
        toast.error('Anda tidak mempunyai kebenaran untuk mengakses halaman ini.');
        router.push('/');
        return false;
      }
      return true;
    };

    const fetchStaff = async () => {
      setIsLoading(true);
      setError('');
      try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) {
          setIsLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('Staff')
          .select('*')
          .order('name', { ascending: true });

        if (fetchError) {
          throw new Error(`Gagal memuatkan data kakitangan: ${fetchError.message}`);
        }

        setStaff(data || []);

      } catch (fetchError) {
        console.error('Error fetching staff:', fetchError);
        setError(fetchError.message);
        toast.error(`Gagal memuatkan data: ${fetchError.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [supabase, router]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      staffType: 'PENGALI_KUBUR',
      isActive: true
    });
    setEditingStaff(null);
    setShowForm(false);
  };

  const handleAddStaff = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditStaff = (staffMember) => {
    setFormData({
      name: staffMember.name,
      phone: staffMember.phone || '',
      staffType: staffMember.staffType,
      isActive: staffMember.isActive
    });
    setEditingStaff(staffMember);
    setShowForm(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menyimpan data kakitangan');
      }

      const savedStaff = await response.json();

      if (editingStaff) {
        // Update existing staff
        setStaff(prev => prev.map(s => s.id === editingStaff.id ? savedStaff : s));
        toast.success('Maklumat kakitangan berjaya dikemaskini');
      } else {
        // Add new staff
        setStaff(prev => [...prev, savedStaff]);
        toast.success('Kakitangan baharu berjaya ditambah');
      }

      resetForm();
    } catch (err) {
      console.error('Error saving staff:', err);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffMember) => {
    if (!confirm(`Adakah anda pasti untuk memadamkan ${staffMember.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/staff/${staffMember.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memadamkan kakitangan');
      }

      setStaff(prev => prev.filter(s => s.id !== staffMember.id));
      toast.success('Kakitangan berjaya dipadamkan');
    } catch (err) {
      console.error('Error deleting staff:', err);
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (staffMember) => {
    try {
      const response = await fetch(`/api/staff/${staffMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...staffMember,
          isActive: !staffMember.isActive
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengemaskini status kakitangan');
      }

      const updatedStaff = await response.json();
      setStaff(prev => prev.map(s => s.id === staffMember.id ? updatedStaff : s));
      toast.success(`Kakitangan ${updatedStaff.isActive ? 'diaktifkan' : 'dinyahaktifkan'}`);
    } catch (err) {
      console.error('Error toggling staff status:', err);
      toast.error(err.message);
    }
  };

  const filteredStaff = staff.filter(s => {
    switch (filter) {
      case 'PENGALI_KUBUR':
      case 'PEMANDI_JENAZAH':
        return s.staffType === filter;
      case 'ACTIVE':
        return s.isActive;
      case 'INACTIVE':
        return !s.isActive;
      default:
        return true;
    }
  });

  const getStaffTypeInfo = (type) => STAFF_TYPES[type] || { label: type, icon: faUser };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-primary text-white p-6 sm:p-8 rounded-t-lg shadow mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pengurusan Kakitangan</h1>
            <p className="mt-1 text-primary-light text-sm sm:text-base">Urus kakitangan pengali kubur dan pemandi jenazah.</p>
          </div>
          <Link href="/admin" className="text-white hover:text-primary-light transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Kembali ke Dashboard
          </Link>
        </div>

        {/* Content Area */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow space-y-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              <p className="font-bold">Ralat</p>
              <p>{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <button
                onClick={handleAddStaff}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                Tambah Kakitangan
              </button>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'ALL', label: 'Semua' },
                { key: 'PENGALI_KUBUR', label: 'Pengali Kubur' },
                { key: 'PEMANDI_JENAZAH', label: 'Pemandi Jenazah' },
                { key: 'ACTIVE', label: 'Aktif' },
                { key: 'INACTIVE', label: 'Tidak Aktif' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filter === key
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Staff List */}
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tiada kakitangan ditemui.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jenis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaff.map((staffMember) => {
                    const typeInfo = getStaffTypeInfo(staffMember.staffType);
                    return (
                      <tr key={staffMember.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={typeInfo.icon} className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{staffMember.name}</div>
                              <div className="text-sm text-gray-500">ID: {staffMember.id.substring(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staffMember.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(staffMember)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              staffMember.isActive
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            <FontAwesomeIcon
                              icon={staffMember.isActive ? faEye : faEyeSlash}
                              className="h-3 w-3 mr-1"
                            />
                            {staffMember.isActive ? 'Aktif' : 'Tidak Aktif'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditStaff(staffMember)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Edit"
                            >
                              <FontAwesomeIcon icon={faEdit} className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staffMember)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Padam"
                            >
                              <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {staff.filter(s => s.staffType === 'PENGALI_KUBUR').length}
              </div>
              <div className="text-sm text-blue-600">Pengali Kubur</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {staff.filter(s => s.staffType === 'PEMANDI_JENAZAH').length}
              </div>
              <div className="text-sm text-purple-600">Pemandi Jenazah</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {staff.filter(s => s.isActive).length}
              </div>
              <div className="text-sm text-green-600">Kakitangan Aktif</div>
            </div>
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingStaff ? 'Edit Kakitangan' : 'Tambah Kakitangan Baharu'}
                </h3>
                
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Penuh <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-black disabled:bg-gray-100"
                      placeholder="Masukkan nama penuh"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      No. Telefon
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-black disabled:bg-gray-100"
                      placeholder="Contoh: 012-3456789"
                    />
                  </div>

                  <div>
                    <label htmlFor="staffType" className="block text-sm font-medium text-gray-700 mb-1">
                      Jenis Kakitangan <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="staffType"
                      value={formData.staffType}
                      onChange={(e) => setFormData(prev => ({ ...prev, staffType: e.target.value }))}
                      required
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-black disabled:bg-gray-100"
                    >
                      <option value="PENGALI_KUBUR">Pengali Kubur</option>
                      <option value="PEMANDI_JENAZAH">Pemandi Jenazah</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Kakitangan Aktif</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting && <FontAwesomeIcon icon={faSpinner} spin className="h-4 w-4" />}
                      {editingStaff ? 'Kemaskini' : 'Tambah'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 