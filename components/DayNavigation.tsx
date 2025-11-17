'use client';

import { DayItinerary } from '@/lib/types';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

interface DayNavigationProps {
  currentDay: DayItinerary;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onHardRefresh: () => void;
}

export default function DayNavigation({
  currentDay,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  onHardRefresh
}: DayNavigationProps) {
  let formattedDate = 'Invalid Date';
  
  try {
    const date = new Date(currentDay.date);
    if (!isNaN(date.getTime())) {
      formattedDate = format(date, 'MMM d');
    }
  } catch (error) {
    console.error('Error formatting date:', error);
  }
  
  return (
    <div className="bg-white dark:bg-black border-t border-gray-200 dark:border-slate-700 shadow-lg px-6 py-3">
      <div className="mx-auto flex items-center justify-center gap-4">

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
              <span className="hidden sm:inline">Previous</span>
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
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>

        </div>

        <div className="flex items-center">
          <div>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{formattedDate}</p>
          </div>

        </div>

        <div className="flex items-right gap-2 absolute right-6">
          <button
            onClick={onHardRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors dark:bg-red-700 dark:hover:bg-red-800"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

