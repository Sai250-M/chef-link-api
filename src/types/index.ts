import { Request } from "express";

// ── Enums ────────────────────────────────────────────────────
export type UserRole = "ROLE_CHEF" | "ROLE_HELPER" | "ROLE_RESTAURANT" | "ROLE_ADMIN";
export type ApplicationStatus = "PENDING" | "SHORTLISTED" | "REJECTED" | "HIRED" | "WITHDRAWN";
export type AssignmentStatus = "ACTIVE" | "COMPLETED" | "TERMINATED";
export type JobStatus = "DRAFT" | "OPEN" | "CLOSED" | "FILLED" | "CANCELLED";
export type RoleType = "CHEF" | "HELPER" | "BOTH";
export type SalaryType = "HOURLY" | "DAILY" | "MONTHLY" | "FIXED";
export type NotificationType = "APPLICATION" | "JOB_POST" | "SHORTLISTED" | "HIRED" | "SYSTEM";
export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
export type ProficiencyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

// ── Auth ─────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ── User ─────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export type SafeUser = Omit<User, "password_hash" | "deleted_at">;

// ── Chef ─────────────────────────────────────────────────────
export interface ChefProfile {
  id: string;
  user_id: string;
  bio: string | null;
  years_experience: number | null;
  specialization: string | null;
  hourly_rate: number | null;
  currency: string;
  is_available: boolean;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string;
  profile_completion_pct: number;
  created_at: Date;
  updated_at: Date;
}

export interface ChefCertificate {
  id: string;
  chef_id: string;
  title: string;
  issuer: string | null;
  issued_year: number | null;
  file_url: string;
  created_at: Date;
}

export interface Cuisine {
  id: string;
  name: string;
  slug: string;
}

// ── Helper ───────────────────────────────────────────────────
export interface HelperProfile {
  id: string;
  user_id: string;
  bio: string | null;
  years_experience: number | null;
  hourly_rate: number | null;
  currency: string;
  is_available: boolean;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string;
  profile_completion_pct: number;
  created_at: Date;
  updated_at: Date;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string | null;
}

// ── Restaurant ───────────────────────────────────────────────
export interface RestaurantProfile {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cuisine_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  pincode: string | null;
  website: string | null;
  established_year: number | null;
  seating_capacity: number | null;
  logo_url: string | null;
  is_verified: boolean;
  profile_completion_pct: number;
  created_at: Date;
  updated_at: Date;
}

// ── Jobs ─────────────────────────────────────────────────────
export interface JobPost {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  role_type: RoleType;
  salary_min: number | null;
  salary_max: number | null;
  salary_type: SalaryType;
  currency: string;
  location: string | null;
  city: string | null;
  is_remote: boolean;
  experience_required: number | null;
  openings: number;
  status: JobStatus;
  deadline: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── Applications ─────────────────────────────────────────────
export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  applicant_role: UserRole;
  status: ApplicationStatus;
  cover_letter: string | null;
  applied_at: Date;
  updated_at: Date;
}

// ── Pagination ───────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── API Response ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: Record<string, string[]>;
}

// ── Express Augment ──────────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
