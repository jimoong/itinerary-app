'use client';

import { useState } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { Place } from '@/lib/types';

interface EditPlaceProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlace: (place: Omit<Place, 'id'>) => void;
  dayNumber: number;
}

export default function EditPlace({ isOpen, onClose, onAddPlace, dayNumber }: EditPlaceProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    description: '',
    duration: '60',
    category: 'landmark',
    startTime: '09:00',
    kidsRating: '',
    transportMode: 'walk',
    transportDuration: '10',
    transportDistance: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPlace: any = {
      name: formData.name,
      address: formData.address,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      description: formData.description,
      duration: parseInt(formData.duration),
      category: formData.category,
      startTime: formData.startTime
    };

    if (formData.kidsRating) {
      newPlace.kidsRating = formData.kidsRating;
    }

    if (formData.transportMode && formData.transportDuration) {
      newPlace.transportToNext = {
        mode: formData.transportMode,
        duration: parseInt(formData.transportDuration),
        distance: formData.transportDistance || undefined
      };
    }

    onAddPlace(newPlace);

    // Reset form
    setFormData({
      name: '',
      address: '',
      lat: '',
      lng: '',
      description: '',
      duration: '60',
      category: 'landmark',
      startTime: '09:00',
      kidsRating: '',
      transportMode: 'walk',
      transportDuration: '10',
      transportDistance: ''
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Place</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 dark:text-gray-300" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Place Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Place Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="e.g., Prague Castle"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="Full address"
              />
            </div>

            {/* Latitude */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="50.0875"
              />
            </div>

            {/* Longitude */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="14.4324"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="landmark">Landmark</option>
                <option value="museum">Museum</option>
                <option value="restaurant">Restaurant</option>
                <option value="park">Park</option>
                <option value="shopping">Shopping</option>
                <option value="entertainment">Entertainment</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                min="15"
                step="15"
              />
            </div>

            {/* Start Time */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                rows={3}
                placeholder="Brief description of the place"
              />
            </div>

            {/* Kids Rating */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kids Suitability (Optional)
              </label>
              <input
                type="text"
                value={formData.kidsRating}
                onChange={(e) => setFormData({ ...formData, kidsRating: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Interactive exhibits perfect for ages 6-9"
              />
            </div>

            {/* Transport to next location */}
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Transport to Next Location (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transport Mode
                  </label>
                  <select
                    value={formData.transportMode}
                    onChange={(e) => setFormData({ ...formData, transportMode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="walk">Walking</option>
                    <option value="taxi">Taxi</option>
                    <option value="metro">Metro</option>
                    <option value="tram">Tram</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Travel Time (min)
                  </label>
                  <input
                    type="number"
                    value={formData.transportDuration}
                    onChange={(e) => setFormData({ ...formData, transportDuration: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distance
                  </label>
                  <input
                    type="text"
                    value={formData.transportDistance}
                    onChange={(e) => setFormData({ ...formData, transportDistance: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.5 km"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Helper text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> You can search for place coordinates on Google Maps by right-clicking the location.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Place
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

