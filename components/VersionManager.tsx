'use client';

import { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Edit2, X } from 'lucide-react';
import { getSavedVersions, saveVersion, loadVersion, deleteVersion, renameVersion, type SavedVersion } from '@/lib/storage';
import { Trip } from '@/lib/types';

interface VersionManagerProps {
  currentTrip: Trip | null;
  onLoadVersion: (trip: Trip) => void;
}

export default function VersionManager({ currentTrip, onLoadVersion }: VersionManagerProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saveName, setSaveName] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Load saved versions when panel opens
  useEffect(() => {
    if (showPanel) {
      setSavedVersions(getSavedVersions());
      setShouldRender(true);
      // Trigger animation after render
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      // Start closing animation
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [showPanel]);

  const handleSave = () => {
    if (!currentTrip) return;
    
    const name = saveName.trim() || undefined;
    saveVersion(currentTrip, name);
    setSaveName('');
    setSavedVersions(getSavedVersions());
  };

  const handleLoad = (versionId: string) => {
    const trip = loadVersion(versionId);
    if (trip) {
      onLoadVersion(trip);
      setShowPanel(false);
    }
  };

  const handleDelete = (versionId: string) => {
    if (confirm('Delete this saved version?')) {
      deleteVersion(versionId);
      setSavedVersions(getSavedVersions());
    }
  };

  const handleRename = (versionId: string) => {
    if (editName.trim()) {
      renameVersion(versionId, editName.trim());
      setSavedVersions(getSavedVersions());
      setEditingId(null);
      setEditName('');
    }
  };

  const startEdit = (version: SavedVersion) => {
    setEditingId(version.id);
    setEditName(version.name);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
        title="Manage Saved Versions"
      >
        <FolderOpen className="w-4 h-4" />
      </button>

      {/* Backdrop and Panel */}
      {shouldRender && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
              isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setShowPanel(false)}
          />
          
          {/* Panel */}
          <div className={`fixed z-50 bg-white dark:bg-slate-900 shadow-2xl flex flex-col
                          md:left-0 md:right-auto md:top-0 md:w-[45%] md:max-w-[600px] md:h-full
                          bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl md:rounded-none
                          md:left-auto
                          transition-transform duration-300 ease-in-out
                          ${isAnimating 
                            ? 'translate-x-0 translate-y-0' 
                            : 'md:-translate-x-full md:translate-y-0 translate-y-full'
                          }`}>
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Saved Versions</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Save Current */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Save Current Itinerary
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Version name (optional)"
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <button
                    onClick={handleSave}
                    disabled={!currentTrip}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Keeps last 5 versions automatically
                </p>
              </div>

              {/* Saved Versions List */}
              <div className="pb-8">
                {savedVersions.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <FolderOpen className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No saved versions yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {savedVersions.map((version) => (
                      <div
                        key={version.id}
                        className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {editingId === version.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(version.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleRename(version.id)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-2 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-slate-900 dark:text-white truncate">
                                  {version.name}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {formatDate(version.timestamp)}
                                </p>
                              </div>
                              <div className="flex gap-1 ml-4">
                                <button
                                  onClick={() => startEdit(version)}
                                  className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                  title="Rename"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(version.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => handleLoad(version.id)}
                              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                            >
                              Load
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

