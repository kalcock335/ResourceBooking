import { useMemo } from 'react';
import Holidays from 'date-holidays';

export function useWorkingDays() {
  const holidays = useMemo(() => new Holidays('GB', 'ENG'), []);

  const getWorkingDaysInWeek = (weekStart: string): number => {
    const start = new Date(weekStart);
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const day = d.getDay();
      const isWeekend = day === 0 || day === 6;
      const isHoliday = holidays.isHoliday(d);
      if (!isWeekend && !isHoliday) count++;
    }
    return count;
  };

  const getWorkingDays = (start: Date, end: Date): number => {
    let count = 0;
    const d = new Date(start);
    while (d <= end) {
      const day = d.getDay();
      const isWeekend = day === 0 || day === 6;
      const isHoliday = holidays.isHoliday(d);
      if (!isWeekend && !isHoliday) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  };

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  return {
    getWorkingDaysInWeek,
    getWorkingDays,
    getMonday,
  };
} 