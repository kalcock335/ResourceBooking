// src/types/resourceRoles.ts

export type ResourceRole =
  | 'admin'
  | 'Consultant'
  | 'Developer'
  | 'Project Manager'
  | 'QA'
  | 'Designer'
  | 'Solution Lead'
  | 'Other';

export interface ResourceRoleOption {
  value: ResourceRole;
  label: string;
  isAdmin: boolean;
  isPlannable: boolean;
}

export const RESOURCE_ROLE_OPTIONS: ResourceRoleOption[] = [
  { value: 'admin', label: 'Admin', isAdmin: true, isPlannable: false },
  { value: 'Consultant', label: 'Consultant', isAdmin: false, isPlannable: true },
  { value: 'Developer', label: 'Developer', isAdmin: false, isPlannable: true },
  { value: 'Project Manager', label: 'Project Manager', isAdmin: false, isPlannable: true },
  { value: 'QA', label: 'QA', isAdmin: false, isPlannable: true },
  { value: 'Designer', label: 'Designer', isAdmin: false, isPlannable: true },
  { value: 'Solution Lead', label: 'Solution Lead', isAdmin: false, isPlannable: true },
  { value: 'Other', label: 'Other', isAdmin: false, isPlannable: true },
]; 