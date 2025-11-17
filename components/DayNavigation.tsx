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
  isRegenerating?: boolean;
}

export default function DayNavigation({
  currentDay,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  onHardRefresh,
  onRegenerateCurrentDay,
  isRegenerating = false
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
    <div className="bg-white dark:bg-black dark:border-slate-700 shadow-lg px-6 fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto flex items-center justify-center gap-4 h-16 pb-safe">

        <div className="flex items-center gap-4">
          <button
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                canGoPrevious
                  ? 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  : 'text-gray-400 dark:text-gray-600 border-gray-100 dark:border-slate-800 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formattedDate}</p>
          </div>

          <button
              onClick={onNext}
              disabled={!canGoNext}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                canGoNext
                  ? 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  : 'text-gray-400 dark:text-gray-600 border-gray-100 dark:border-slate-800 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
        </div>

        <div className="flex items-right gap-2 absolute right-6" ref={menuRef}>
          <div className="relative">
            <button
              onClick={() => !isRegenerating && setShowMenu(!showMenu)}
              disabled={isRegenerating}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isRegenerating
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              <RotateCcw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
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
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Regenerate This Day
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
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Regenerate All Days
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

