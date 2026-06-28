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

// ── Events ───────────────────────────────────────────────────
export type EventStatus   = "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "ATTENDED";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FAILED";

export interface Event {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  max_participants: number;
  current_participants: number;
  price: number;
  currency: string;
  banner_url: string | null;
  status: EventStatus;
  created_at: Date;
  updated_at: Date;
}

export interface EventBooking {
  id: string;
  event_id: string;
  user_id: string;
  booking_status: BookingStatus;
  number_of_people: number;
  booking_date: Date;
  special_request: string | null;
  payment_status: PaymentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface EventGalleryImage {
  id: string;
  event_id: string;
  image_url: string;
  created_at: Date;
}

// ── Guest Event Booking ───────────────────────────────────────
export type GuestBookingType        = "CHEF" | "HELPER";
export type GuestEventType          =
  | "BIRTHDAY" | "WEDDING" | "HOUSEWARMING" | "ANNIVERSARY"
  | "BABY_SHOWER" | "CORPORATE_EVENT" | "PRIVATE_PARTY"
  | "LIVE_COOKING" | "FESTIVAL" | "OTHER";
export type BookingRequestStatus    = "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "CANCELLED";

export interface BookingRequest {
  id:                   string;
  chef_id:              string | null;
  helper_id:            string | null;
  booking_type:         GuestBookingType;
  guest_name:           string;
  guest_email:          string;
  guest_phone:          string;
  event_type:           GuestEventType;
  event_date:           string;
  start_time:           string;
  end_time:             string;
  guest_count:          number;
  budget:               number;
  currency:             string;
  location:             string | null;
  address:              string | null;
  city:                 string | null;
  state:                string | null;
  country:              string;
  special_requirements: string | null;
  status:               BookingRequestStatus;
  created_at:           Date;
  updated_at:           Date;
}

export interface BookingAnalytics {
  bookings_per_month:  Array<{ month: string; count: number }>;
  bookings_by_event:   Array<{ event_type: string; count: number }>;
  bookings_by_city:    Array<{ city: string; count: number }>;
  most_booked_chefs:   Array<{ id: string; first_name: string; last_name: string; booking_count: number }>;
  most_booked_helpers: Array<{ id: string; first_name: string; last_name: string; booking_count: number }>;
  status_summary:      Array<{ status: string; count: number }>;
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
