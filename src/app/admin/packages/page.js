'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Loading from '@/components/Loading';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import Modal from '@/components/Modal';
import PackageForm from '@/components/PackageForm';

export default function ManagePackages() {
  const supabase = createClient();
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setIsLoading(prev => !prev ? true : prev);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('Package')
        .select('*')
        .order('createdAt', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      setPackages(data || []);
    } catch (err) {
      console.error('Error fetching packages:', err);
      const errMsg = err.message || 'Ralat tidak diketahui.';
      setError(`Gagal memuatkan senarai pakej: ${errMsg}`);
      toast.error(`Gagal memuatkan pakej: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPackage = async (newPackageData) => {
    setIsSubmitting(true);
    setError('');
    try {
      const { error: insertError } = await supabase
        .from('Package')
        .insert([newPackageData]);

      if (insertError) {
        throw insertError;
      }

      toast.success('Pakej berjaya ditambah!');
      setIsAddModalOpen(false);
      fetchPackages();
    } catch (err) {
      console.error('Error adding package:', err);
      const errMsg = err.message || 'Ralat tidak diketahui.';
      setError(`Gagal menambah pakej: ${errMsg}`);
      toast.error(`Gagal menambah pakej: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPackage = async (updatedData) => {
    if (!editingPackage?.id) return;
    setIsSubmitting(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('Package')
        .update(updatedData)
        .eq('id', editingPackage.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('Pakej berjaya dikemaskini!');
      setIsEditModalOpen(false);
      setEditingPackage(null);
      fetchPackages();
    } catch (err) {
      console.error('Error updating package:', err);
      const errMsg = err.message || 'Ralat tidak diketahui.';
      setError(`Gagal mengemaskini pakej: ${errMsg}`);
      toast.error(`Gagal mengemaskini pakej: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePackage = async (packageId) => {
    console.log('Deleting package:', packageId);
    if (!window.confirm('Adakah anda pasti mahu memadam pakej ini?')) {
        return;
    }
    
    setError('');
    try {
        const { error: deleteError } = await supabase
            .from('Package')
            .delete()
            .eq('id', packageId);

        if (deleteError) {
            throw deleteError;
        }

        toast.success('Pakej berjaya dipadam!');
        fetchPackages();
    } catch (err) {
        console.error('Error deleting package:', err);
        const errMsg = err.message || 'Ralat tidak diketahui.';
        setError(`Gagal memadam pakej: ${errMsg}`);
        toast.error(`Gagal memadam pakej: ${errMsg}`);
    }
  };

  const openAddModal = () => {
    setError('');
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const openEditModal = (pkg) => {
    setError('');
    setEditingPackage(pkg);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPackage(null);
  };

  if (isLoading && packages.length === 0) {
    return <Loading />;
  }

  return (
    <div className="py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Urus Pakej
          </h1>
          <button
            onClick={openAddModal}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light transition-colors font-medium flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Tambah Pakej Baru
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Ralat Semasa Operasi</p>
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Pakej (Label)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga (RM)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deskripsi
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packages.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      Tiada pakej ditemui.
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg) => (
                    <tr key={pkg.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pkg.label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pkg.price ? pkg.price.toFixed(2) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={pkg.description}>
                        {pkg.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => openEditModal(pkg)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Padam"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {isLoading && packages.length > 0 && (
                    <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                            Memuatkan semula...
                        </td>
                    </tr>
                 )} 
              </tbody>
            </table>
          </div>
        </div>
        
        <Modal isOpen={isAddModalOpen} onClose={closeAddModal} title="Tambah Pakej Baru">
          <PackageForm 
            onSubmit={handleAddPackage} 
            isSubmitting={isSubmitting}
          />
        </Modal>

        <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Kemaskini Pakej">
          <PackageForm 
            onSubmit={handleEditPackage} 
            initialData={editingPackage || {}} 
            isSubmitting={isSubmitting}
          />
        </Modal>
      </div>
    </div>
  );
} 