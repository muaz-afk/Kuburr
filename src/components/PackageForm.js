'use client';

import { useState, useEffect } from 'react';

export default function PackageForm({ onSubmit, initialData = {}, isSubmitting = false }) {
  const [label, setLabel] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    // Populate form if initialData is provided (for editing)
    if (initialData.id) {
      setLabel(initialData.label || '');
      setPrice(initialData.price?.toString() || '');
      setDescription(initialData.description || '');
    } else {
      // Reset form for adding
      setLabel('');
      setPrice('');
      setDescription('');
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
        alert('Sila masukkan harga yang sah (nombor positif).');
        return;
    }

    onSubmit({
      label,
      price: priceValue,
      description,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="label" className="block text-sm font-medium text-gray-700">
          Nama Pakej (Label) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900"
        />
      </div>
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
          Harga (RM) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          step="0.01"
          min="0"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Deskripsi
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="3"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900"
        ></textarea>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Menyimpan...' : (initialData.id ? 'Simpan Perubahan' : 'Tambah Pakej')}
        </button>
      </div>
    </form>
  );
} 