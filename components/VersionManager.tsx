'use client';

import { useState, useRef, useEffect } from 'react';
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
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved versions when panel opens
  useEffect(() => {
    if (showPanel) {
      setSavedVersions(getSavedVersions());
    }
  }, [showPanel]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    <div className="relative" ref={panelRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
        title="Manage Saved Versions"
      >
        <FolderOpen className="w-4 h-4" />
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="absolute bottom-full right-0 mb-2 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Saved Versions</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Save Current */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Save Current Itinerary
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Version name (optional)"
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={!currentTrip}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          <div className="max-h-96 overflow-y-auto">
            {savedVersions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No saved versions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {savedVersions.map((version) => (
                  <div
                    key={version.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    {editingId === version.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(version.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(version.id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-sm hover:bg-slate-400 dark:hover:bg-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 dark:text-white">
                              {version.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(version.timestamp)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(version)}
                              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Rename"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(version.id)}
                              className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleLoad(version.id)}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Load This Version
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

