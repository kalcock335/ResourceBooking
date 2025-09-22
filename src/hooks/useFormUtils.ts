import { useCallback } from 'react';
import { UseFormWatch, UseFormSetValue } from 'react-hook-form';

export function useFormUtils() {
  const calculateWeeksFromRange = useCallback((startDate: string, endDate: string): string[] => {
    const weeks: string[] = [];
    if (!startDate || !endDate) return weeks;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return weeks;
    if (end < start) return weeks;
    
    const current = new Date(start);
    while (current <= end) {
      weeks.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 7);
    }
    
    return weeks;
  }, []);

  const calculateWeeksFromCount = useCallback((startDate: string, numWeeks: number): string[] => {
    const weeks: string[] = [];
    if (!startDate || !numWeeks) return weeks;
    
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return weeks;
    
    const current = new Date(start);
    for (let i = 0; i < numWeeks; i++) {
      weeks.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 7);
    }
    
    return weeks;
  }, []);

  const validateDateRange = useCallback((startDate: string, endDate: string): { isValid: boolean; error?: string } => {
    if (!startDate || !endDate) {
      return { isValid: true };
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }
    
    if (end < start) {
      return { isValid: false, error: 'End date cannot be before start date' };
    }
    
    return { isValid: true };
  }, []);

  const autoCalculateWeeks = useCallback((
    watch: UseFormWatch<any>,
    setValue: UseFormSetValue<any>,
    startField: string = 'weekStart',
    endField: string = 'endWeek',
    countField: string = 'numWeeks'
  ) => {
    const startDate = watch(startField);
    const endDate = watch(endField);
    
    if (startDate && endDate) {
      const validation = validateDateRange(startDate as string, endDate as string);
      if (!validation.isValid) {
        setValue(countField, 1);
        return validation.error;
      }
      
      const diff = Math.ceil((new Date(endDate as string).getTime() - new Date(startDate as string).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      setValue(countField, diff);
      return undefined;
    }
    
    return undefined;
  }, [validateDateRange]);

  return {
    calculateWeeksFromRange,
    calculateWeeksFromCount,
    validateDateRange,
    autoCalculateWeeks,
  };
} 