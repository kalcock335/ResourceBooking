// Centralized shared types for Resource, Project, Skill, etc.

export interface Role {
  id: string;
  name: string;
  label: string;
  isAdmin: boolean;
  isPlannable: boolean;
}

export interface Resource {
  id: string;
  name: string;
  email?: string;
  roles: Role[];
  isActive: boolean;
  jobTitle?: string | null;
  defaultAvailability?: number;
  _count?: {
    allocations: number;
  };
}

export interface Project {
  id: string;
  name: string;
  customer: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  _count?: {
    allocations: number;
  };
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
}

export interface ResourceSkill {
  id: string;
  skillId: string;
  resourceId: string;
  proficiency?: string;
  expiry?: string;
  skill: Skill;
} 