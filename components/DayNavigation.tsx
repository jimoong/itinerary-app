'use client';

import { DayItinerary } from '@/lib/types';
import { ChevronLeft, ChevronRight, RotateCcw, Calendar, CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef, useEffect } from 'react';

interface DayNavigationProps {
  currentDay: DayItinerary;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onHardRefresh: () => void;
  onRegenerateCurrentDay: () => void;
}

export default function DayNavigation({
  currentDay,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  onHardRefresh,
  onRegenerateCurrentDay
}: DayNavigationProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  let formattedDate = 'Invalid Date';
  
  try {
    // Parse date as local date to avoid timezone issues
    const [year, month, day] = currentDay.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      formattedDate = format(date, 'MMM d');
    }
  } catch (error) {
    console.error('Error formatting date:', error);
  }
  
  return (
    <div className="bg-white dark:bg-black border-t border-gray-200 dark:border-slate-700 shadow-lg px-6 py-4 safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-40 h-16 pb-16">
      <div className="mx-auto flex items-center justify-center gap-4 pb-safe">

        <div className="flex items-left gap-2 absolute left-6">
          <button
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                canGoPrevious
                  ? 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  : 'text-gray-400 dark:text-gray-600 border-gray-100 dark:border-slate-800 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                canGoNext
                  ? 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  : 'text-gray-400 dark:text-gray-600 border-gray-100 dark:border-slate-800 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

        </div>

        <div className="flex items-center">
          <div>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{formattedDate}</p>
          </div>

        </div>

        <div className="flex items-right gap-2 absolute right-6" ref={menuRef}>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRegenerateCurrentDay();
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-slate-700"
                >
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Regenerate This Day
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Get new suggestions for {format(new Date(currentDay.date.split('-').map(Number).slice(0, 3).join('-')), 'MMM d')}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onHardRefresh();
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                >
                  <CalendarRange className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Regenerate All Days
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Start fresh with new itinerary
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

