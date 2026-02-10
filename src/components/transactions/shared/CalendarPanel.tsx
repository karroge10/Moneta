'use client';

import { useState, useRef, useEffect } from 'react';
import { NavArrowLeft, NavArrowRight, NavArrowDown } from 'iconoir-react';

export type CalendarControlAlignment = 'start' | 'center' | 'end';

export interface CalendarPanelProps {
  selectedDate: string;
  currentMonth: Date;
  onChange: (value: string) => void;
  onMonthChange: (date: Date) => void;
  controlAlignment?: CalendarControlAlignment;
}

export function CalendarPanel({
  selectedDate,
  currentMonth,
  onChange,
  onMonthChange,
  controlAlignment = 'center',
}: CalendarPanelProps) {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const today = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

  const startWeekDay = startOfMonth.getDay();
  const days: Date[] = [];
  const startDate = new Date(startOfMonth);
  startDate.setDate(startOfMonth.getDate() - startWeekDay);

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }

  // Parse selected date in local time to avoid timezone issues
  const selected = selectedDate ? (() => {
    // Handle YYYY-MM-DD format
    if (selectedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = selectedDate.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    // Fallback to standard Date parsing
    const date = new Date(selectedDate);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  })() : null;

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // Format date in local time to avoid timezone issues (YYYY-MM-DD)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedYear = selected?.getFullYear() ?? today.getFullYear();
  const minYear = Math.min(today.getFullYear(), selectedYear, currentMonth.getFullYear()) - 50;
  const maxYear = today.getFullYear() + 1;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, idx) => maxYear - idx);

  const alignmentClass =
    controlAlignment === 'start' ? 'justify-start' : controlAlignment === 'end' ? 'justify-end' : 'justify-center';

  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (monthRef.current && !monthRef.current.contains(target)) setMonthOpen(false);
      if (yearRef.current && !yearRef.current.contains(target)) setYearOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectMonth = (idx: number) => {
    onMonthChange(new Date(currentMonth.getFullYear(), idx, 1));
    setMonthOpen(false);
  };
  const selectYear = (y: number) => {
    onMonthChange(new Date(y, currentMonth.getMonth(), 1));
    setYearOpen(false);
  };

  return (
    <div className="p-3 space-y-3">
      <div className={`flex ${alignmentClass}`}>
        <div className="flex items-center justify-center gap-2 flex-nowrap">
          <button
            type="button"
            onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="w-9 h-9 rounded-full hover-text-purple transition-colors cursor-pointer bg-[#1f1f1f] flex items-center justify-center"
            aria-label="Previous month"
          >
            <NavArrowLeft width={18} height={18} strokeWidth={1.5} />
          </button>
          <div className="flex items-center justify-center gap-2">
            <div className="relative" ref={monthRef}>
              <button
                type="button"
                onClick={() => { setYearOpen(false); setMonthOpen((o) => !o); }}
                aria-label="Select month"
                aria-expanded={monthOpen}
                className="relative h-10 bg-[#202020] border border-[#3a3a3a] text-body text-sm rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-[var(--accent-purple)] cursor-pointer flex items-center gap-2 min-w-[100px]"
                style={{ color: 'var(--text-primary)' }}
              >
                <span className="truncate">{monthNames[currentMonth.getMonth()]}</span>
                <NavArrowDown width={14} height={14} strokeWidth={2} className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0" style={{ color: '#B9B9B9' }} />
              </button>
              {monthOpen && (
                <div className="absolute top-full left-0 mt-1 rounded-2xl shadow-lg overflow-hidden z-20 min-w-[100px] max-h-[200px] overflow-y-auto" style={{ backgroundColor: '#202020', border: '1px solid #3a3a3a' }}>
                  {monthNames.map((name, idx) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => selectMonth(idx)}
                      className="w-full text-left px-3 py-2 text-body text-sm hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                      style={{ color: currentMonth.getMonth() === idx ? 'var(--accent-purple)' : 'var(--text-primary)' }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={yearRef}>
              <button
                type="button"
                onClick={() => { setMonthOpen(false); setYearOpen((o) => !o); }}
                aria-label="Select year"
                aria-expanded={yearOpen}
                className="relative h-10 bg-[#202020] border border-[#3a3a3a] text-body text-sm rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-[var(--accent-purple)] cursor-pointer flex items-center gap-2 min-w-[72px]"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>{currentMonth.getFullYear()}</span>
                <NavArrowDown width={14} height={14} strokeWidth={2} className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0" style={{ color: '#B9B9B9' }} />
              </button>
              {yearOpen && (
                <div className="absolute top-full left-0 mt-1 rounded-2xl shadow-lg overflow-hidden z-20 min-w-[72px] max-h-[200px] overflow-y-auto" style={{ backgroundColor: '#202020', border: '1px solid #3a3a3a' }}>
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => selectYear(y)}
                      className="w-full text-left px-3 py-2 text-body text-sm hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                      style={{ color: currentMonth.getFullYear() === y ? 'var(--accent-purple)' : 'var(--text-primary)' }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="w-9 h-9 rounded-full hover-text-purple transition-colors cursor-pointer bg-[#1f1f1f] flex items-center justify-center"
            aria-label="Next month"
          >
            <NavArrowRight width={18} height={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-helper text-[10px] uppercase tracking-wide">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const isCurrentMonth =
            day.getMonth() === currentMonth.getMonth() && day.getFullYear() === currentMonth.getFullYear();
          const isToday = isSameDay(day, today);
          const isSelected = selected && isSameDay(day, selected);

          const buttonClasses = [
            'h-9 rounded-xl text-body font-medium transition-colors cursor-pointer flex items-center justify-center',
            'bg-[#1f1f1f]',
          ];

          if (isSelected) {
            buttonClasses.push('text-black', 'bg-[var(--accent-purple)]');
          } else {
            buttonClasses.push('text-[var(--text-primary)]', 'hover:text-[var(--accent-purple)]', 'hover:bg-[#262626]');
            if (isToday) {
              buttonClasses.push('border', 'border-[var(--accent-purple)]');
            }
          }

          if (!isCurrentMonth) {
            buttonClasses.push('opacity-40');
          }

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onChange(formatDateLocal(day))}
              className={buttonClasses.join(' ')}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarPanel;



