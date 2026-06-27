-- ============================================================
-- ChefLink Database Schema v1.0
-- Run this once against your PostgreSQL database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('ROLE_CHEF', 'ROLE_HELPER', 'ROLE_RESTAURANT', 'ROLE_ADMIN');
CREATE TYPE application_status AS ENUM ('PENDING', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN');
CREATE TYPE assignment_status AS ENUM ('ACTIVE', 'COMPLETED', 'TERMINATED');
CREATE TYPE job_status AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'FILLED', 'CANCELLED');
CREATE TYPE role_type AS ENUM ('CHEF', 'HELPER', 'BOTH');
CREATE TYPE salary_type AS ENUM ('HOURLY', 'DAILY', 'MONTHLY', 'FIXED');
CREATE TYPE notification_type AS ENUM ('APPLICATION', 'JOB_POST', 'SHORTLISTED', 'HIRED', 'SYSTEM');
CREATE TYPE day_of_week AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');
CREATE TYPE proficiency_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20),
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_users_email     ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role      ON users (role)  WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active    ON users (is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- CHEF PROFILES
-- ============================================================

CREATE TABLE chef_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio                     TEXT,
  years_experience        SMALLINT CHECK (years_experience >= 0 AND years_experience <= 60),
  specialization          VARCHAR(255),
  hourly_rate             NUMERIC(10,2) CHECK (hourly_rate >= 0),
  currency                VARCHAR(10) NOT NULL DEFAULT 'INR',
  is_available            BOOLEAN NOT NULL DEFAULT TRUE,
  location                VARCHAR(255),
  city                    VARCHAR(100),
  state                   VARCHAR(100),
  country                 VARCHAR(100) NOT NULL DEFAULT 'India',
  profile_completion_pct  SMALLINT NOT NULL DEFAULT 0 CHECK (profile_completion_pct BETWEEN 0 AND 100),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chef_profiles_user_id     ON chef_profiles (user_id);
CREATE INDEX idx_chef_profiles_available   ON chef_profiles (is_available);
CREATE INDEX idx_chef_profiles_city        ON chef_profiles (city);

-- ============================================================
-- HELPER PROFILES
-- ============================================================

CREATE TABLE helper_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio                     TEXT,
  years_experience        SMALLINT CHECK (years_experience >= 0 AND years_experience <= 60),
  hourly_rate             NUMERIC(10,2) CHECK (hourly_rate >= 0),
  currency                VARCHAR(10) NOT NULL DEFAULT 'INR',
  is_available            BOOLEAN NOT NULL DEFAULT TRUE,
  location                VARCHAR(255),
  city                    VARCHAR(100),
  state                   VARCHAR(100),
  country                 VARCHAR(100) NOT NULL DEFAULT 'India',
  profile_completion_pct  SMALLINT NOT NULL DEFAULT 0 CHECK (profile_completion_pct BETWEEN 0 AND 100),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_helper_profiles_user_id   ON helper_profiles (user_id);
CREATE INDEX idx_helper_profiles_available ON helper_profiles (is_available);
CREATE INDEX idx_helper_profiles_city      ON helper_profiles (city);

-- ============================================================
-- RESTAURANT PROFILES
-- ============================================================

CREATE TABLE restaurant_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  cuisine_type        VARCHAR(255),
  address             TEXT,
  city                VARCHAR(100),
  state               VARCHAR(100),
  country             VARCHAR(100) NOT NULL DEFAULT 'India',
  pincode             VARCHAR(10),
  website             VARCHAR(255),
  established_year    SMALLINT CHECK (established_year BETWEEN 1800 AND 2100),
  seating_capacity    INTEGER CHECK (seating_capacity > 0),
  logo_url            TEXT,
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  profile_completion_pct SMALLINT NOT NULL DEFAULT 0 CHECK (profile_completion_pct BETWEEN 0 AND 100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restaurant_profiles_user_id ON restaurant_profiles (user_id);
CREATE INDEX idx_restaurant_profiles_city    ON restaurant_profiles (city);

-- ============================================================
-- CUISINES (reference table)
-- ============================================================

CREATE TABLE cuisines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHEF CUISINES (many-to-many)
-- ============================================================

CREATE TABLE chef_cuisines (
  chef_id    UUID NOT NULL REFERENCES chef_profiles(id) ON DELETE CASCADE,
  cuisine_id UUID NOT NULL REFERENCES cuisines(id) ON DELETE CASCADE,
  PRIMARY KEY (chef_id, cuisine_id)
);

-- ============================================================
-- SKILLS (reference table)
-- ============================================================

CREATE TABLE skills (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  category   VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HELPER SKILLS (many-to-many with proficiency)
-- ============================================================

CREATE TABLE helper_skills (
  helper_id         UUID NOT NULL REFERENCES helper_profiles(id) ON DELETE CASCADE,
  skill_id          UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level proficiency_level NOT NULL DEFAULT 'BEGINNER',
  PRIMARY KEY (helper_id, skill_id)
);

-- ============================================================
-- CHEF CERTIFICATES
-- ============================================================

CREATE TABLE chef_certificates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     UUID NOT NULL REFERENCES chef_profiles(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  issuer      VARCHAR(255),
  issued_year SMALLINT,
  file_url    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chef_certificates_chef_id ON chef_certificates (chef_id);

-- ============================================================
-- AVAILABILITY SLOTS
-- ============================================================

CREATE TABLE availability_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week   day_of_week,
  start_time    TIME,
  end_time      TIME,
  is_recurring  BOOLEAN NOT NULL DEFAULT TRUE,
  specific_date DATE,
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_time_range CHECK (end_time > start_time),
  CONSTRAINT chk_recurring_or_specific CHECK (
    (is_recurring = TRUE AND day_of_week IS NOT NULL) OR
    (is_recurring = FALSE AND specific_date IS NOT NULL)
  )
);

CREATE INDEX idx_availability_slots_user_id ON availability_slots (user_id);

-- ============================================================
-- RESTAURANT JOB POSTS
-- ============================================================

CREATE TABLE restaurant_job_posts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL,
  description         TEXT NOT NULL,
  role_type           role_type NOT NULL DEFAULT 'BOTH',
  salary_min          NUMERIC(10,2) CHECK (salary_min >= 0),
  salary_max          NUMERIC(10,2) CHECK (salary_max >= 0),
  salary_type         salary_type NOT NULL DEFAULT 'MONTHLY',
  currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
  location            VARCHAR(255),
  city                VARCHAR(100),
  is_remote           BOOLEAN NOT NULL DEFAULT FALSE,
  experience_required SMALLINT CHECK (experience_required >= 0),
  openings            SMALLINT NOT NULL DEFAULT 1 CHECK (openings > 0),
  status              job_status NOT NULL DEFAULT 'OPEN',
  deadline            DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_salary_range CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);

CREATE INDEX idx_job_posts_restaurant_id ON restaurant_job_posts (restaurant_id);
CREATE INDEX idx_job_posts_status        ON restaurant_job_posts (status);
CREATE INDEX idx_job_posts_role_type     ON restaurant_job_posts (role_type);
CREATE INDEX idx_job_posts_city          ON restaurant_job_posts (city);
CREATE INDEX idx_job_posts_created_at    ON restaurant_job_posts (created_at DESC);

-- ============================================================
-- JOB POST CUISINES (many-to-many)
-- ============================================================

CREATE TABLE job_post_cuisines (
  job_id     UUID NOT NULL REFERENCES restaurant_job_posts(id) ON DELETE CASCADE,
  cuisine_id UUID NOT NULL REFERENCES cuisines(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, cuisine_id)
);

-- ============================================================
-- JOB POST SKILLS (many-to-many)
-- ============================================================

CREATE TABLE job_post_skills (
  job_id   UUID NOT NULL REFERENCES restaurant_job_posts(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

-- ============================================================
-- APPLICATIONS
-- ============================================================

CREATE TABLE applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES restaurant_job_posts(id) ON DELETE CASCADE,
  applicant_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_role user_role NOT NULL CHECK (applicant_role IN ('ROLE_CHEF', 'ROLE_HELPER')),
  status         application_status NOT NULL DEFAULT 'PENDING',
  cover_letter   TEXT,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, applicant_id)
);

CREATE INDEX idx_applications_job_id       ON applications (job_id);
CREATE INDEX idx_applications_applicant_id ON applications (applicant_id);
CREATE INDEX idx_applications_status       ON applications (status);

-- ============================================================
-- ASSIGNMENTS (hired staff)
-- ============================================================

CREATE TABLE assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID REFERENCES restaurant_job_posts(id) ON DELETE SET NULL,
  worker_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE,
  status        assignment_status NOT NULL DEFAULT 'ACTIVE',
  hourly_rate   NUMERIC(10,2) CHECK (hourly_rate >= 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_worker_id     ON assignments (worker_id);
CREATE INDEX idx_assignments_restaurant_id ON assignments (restaurant_id);
CREATE INDEX idx_assignments_status        ON assignments (status);

-- ============================================================
-- SAVED PROFILES (restaurant bookmarks)
-- ============================================================

CREATE TABLE saved_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_role  user_role NOT NULL CHECK (profile_role IN ('ROLE_CHEF', 'ROLE_HELPER')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, profile_id)
);

CREATE INDEX idx_saved_profiles_restaurant_id ON saved_profiles (restaurant_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  data       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id  ON notifications (user_id);
CREATE INDEX idx_notifications_is_read  ON notifications (user_id, is_read);
CREATE INDEX idx_notifications_created  ON notifications (created_at DESC);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_revoked  BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address  INET,
  user_agent  TEXT
);

CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================

CREATE TABLE password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user_id    ON password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens (token_hash);

-- ============================================================
-- updated_at TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_chef_profiles_updated_at
  BEFORE UPDATE ON chef_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_helper_profiles_updated_at
  BEFORE UPDATE ON helper_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_restaurant_profiles_updated_at
  BEFORE UPDATE ON restaurant_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_job_posts_updated_at
  BEFORE UPDATE ON restaurant_job_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: CUISINES
-- ============================================================

INSERT INTO cuisines (name, slug) VALUES
  ('Indian', 'indian'), ('North Indian', 'north-indian'), ('South Indian', 'south-indian'),
  ('Mughlai', 'mughlai'), ('Bengali', 'bengali'), ('Gujarati', 'gujarati'),
  ('Rajasthani', 'rajasthani'), ('Punjabi', 'punjabi'), ('Maharashtrian', 'maharashtrian'),
  ('Continental', 'continental'), ('Italian', 'italian'), ('Chinese', 'chinese'),
  ('Thai', 'thai'), ('Japanese', 'japanese'), ('Mediterranean', 'mediterranean'),
  ('Mexican', 'mexican'), ('French', 'french'), ('American', 'american'),
  ('Middle Eastern', 'middle-eastern'), ('Bakery & Pastry', 'bakery-pastry');

-- ============================================================
-- SEED: SKILLS
-- ============================================================

INSERT INTO skills (name, slug, category) VALUES
  ('Food Prep', 'food-prep', 'Kitchen'),
  ('Knife Skills', 'knife-skills', 'Kitchen'),
  ('Grilling', 'grilling', 'Cooking'),
  ('Baking', 'baking', 'Cooking'),
  ('Plating', 'plating', 'Presentation'),
  ('Inventory Management', 'inventory-management', 'Operations'),
  ('Kitchen Cleaning', 'kitchen-cleaning', 'Sanitation'),
  ('HACCP Compliance', 'haccp-compliance', 'Safety'),
  ('Menu Planning', 'menu-planning', 'Management'),
  ('Team Leadership', 'team-leadership', 'Management'),
  ('Dishwashing', 'dishwashing', 'Sanitation'),
  ('Sous Vide', 'sous-vide', 'Cooking'),
  ('Pastry Arts', 'pastry-arts', 'Cooking'),
  ('Customer Service', 'customer-service', 'Hospitality'),
  ('Cost Control', 'cost-control', 'Management');
