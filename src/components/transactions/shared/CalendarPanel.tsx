'use client';

import { CSSProperties } from 'react';
import { NavArrowLeft, NavArrowRight } from 'iconoir-react';

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

  const selected = selectedDate ? new Date(selectedDate) : null;

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const monthLabel = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-3 space-y-3">
      <div className={`flex items-center ${controlAlignment === 'end' ? 'justify-end gap-2' : 'justify-between'}`}>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <NavArrowLeft width={18} height={18} strokeWidth={1.5} />
        </button>
        {controlAlignment !== 'end' && <span className="text-body font-semibold">{monthLabel}</span>}
        <button
          type="button"
          onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
          aria-label="Next month"
        >
          <NavArrowRight width={18} height={18} strokeWidth={1.5} />
        </button>
        {controlAlignment === 'end' && <span className="text-body font-semibold ml-2">{monthLabel}</span>}
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

          const buttonClasses = ['h-9 rounded-xl text-body font-medium transition-colors cursor-pointer'];
          const buttonStyle: CSSProperties = {
            backgroundColor: '#1f1f1f',
            color: 'var(--text-primary)',
          };

          if (isSelected) {
            buttonClasses.push('text-black');
            buttonStyle.backgroundColor = 'var(--accent-purple)';
          } else if (isToday) {
            buttonClasses.push('border');
            buttonStyle.borderColor = 'var(--accent-purple)';
            buttonStyle.borderWidth = '1px';
          }

          if (!isCurrentMonth) {
            buttonClasses.push('opacity-40');
          }

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onChange(day.toISOString().slice(0, 10))}
              className={buttonClasses.join(' ')}
              style={buttonStyle}
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



