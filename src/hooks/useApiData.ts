import useSWR, { SWRConfiguration, BareFetcher } from 'swr';
import { apiClient } from '../lib/apiClient';

// Our endpoints return objects like { success: boolean, data?: T }
export type ApiListResponse<T> = { success: boolean; data?: T; error?: string };

const fetcher: BareFetcher<ApiListResponse<unknown>> = (url: string) => apiClient(url);

export function useApiData<T = unknown>(url: string, config?: SWRConfiguration<ApiListResponse<T>>) {
  const { data: rawData, error, mutate, isLoading } = useSWR<ApiListResponse<T>>(url, fetcher as BareFetcher<ApiListResponse<T>>, config);
  const data = rawData && Array.isArray((rawData as ApiListResponse<T>).data)
    ? ((rawData as ApiListResponse<T>).data as unknown as T)
    : ([] as unknown as T);
  return {
    data,
    error,
    mutate,
    isLoading,
    success: !!rawData?.success,
  };
}

export function useResources() {
  return useApiData<any[]>('/api/resources');
}

export function useProjects() {
  return useApiData<any[]>('/api/projects');
}

export function useWorkTypes() {
  return useApiData<any[]>('/api/work-types');
}

export function useWeeks() {
  return useApiData<any[]>('/api/weeks');
}

export function useSkills() {
  return useApiData<any[]>('/api/skills');
}

export function useAllocations() {
  return useApiData<any[]>('/api/allocations');
}

export function useAvailability() {
  return useApiData<any[]>('/api/availability');
}

export function useSummary() {
  return useApiData<any[]>('/api/summary');
} 