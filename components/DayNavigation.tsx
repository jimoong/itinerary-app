'use client';

import { DayItinerary } from '@/lib/types';
import { ChevronLeft, ChevronRight, Hotel } from 'lucide-react';
import { format } from 'date-fns';

interface DayNavigationProps {
  currentDay: DayItinerary;
  totalDays: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export default function DayNavigation({
  currentDay,
  totalDays,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext
}: DayNavigationProps) {
  let formattedDate = 'Invalid Date';
  
  try {
    const date = new Date(currentDay.date);
    if (!isNaN(date.getTime())) {
      formattedDate = format(date, 'EEE, MMM d');
    }
  } catch (error) {
    console.error('Error formatting date:', error);
  }
  
  return (
    <div className="bg-white px-6 py-4 flex flex-grow">
      <div className="flex items-center justify-center mx-auto flex-grow w-full">
        {/* Navigation controls */}
        <div className="flex items-center text-center gap-4">
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              canGoPrevious
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Day info */}
          <div className="flex-1 justify-center pl-4 pr-4">
            <div className="flex items-center gap-3 justify-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Day {currentDay.dayNumber}
              </h1>
              {/* <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                {currentDay.city}
              </span> */}
            </div>
            <p className="text-sm text-gray-600">{formattedDate}</p>
            {/* <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <Hotel className="w-4 h-4" />
              <span>{currentDay.hotel.name}</span>
            </div> */}
          </div>


          <button
            onClick={onNext}
            disabled={!canGoNext}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              canGoNext
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

