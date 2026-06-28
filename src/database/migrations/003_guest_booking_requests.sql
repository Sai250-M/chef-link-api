-- ============================================================
-- ChefLink Database Schema v3.0 – Guest Event Booking Module
-- Run after 002_event_booking_schema.sql
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE booking_type AS ENUM ('CHEF', 'HELPER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE guest_event_type AS ENUM (
    'BIRTHDAY',
    'WEDDING',
    'HOUSEWARMING',
    'ANNIVERSARY',
    'BABY_SHOWER',
    'CORPORATE_EVENT',
    'PRIVATE_PARTY',
    'LIVE_COOKING',
    'FESTIVAL',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- booking_request_status is distinct from the existing booking_status
-- (which has PENDING/CONFIRMED/CANCELLED/ATTENDED for restaurant event bookings).
-- This enum covers the guest-initiated chef/helper booking lifecycle.
DO $$ BEGIN
  CREATE TYPE booking_request_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- BOOKING REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_requests (
  id                   UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Exactly one of chef_id or helper_id must be populated (enforced by constraint below)
  chef_id              UUID                   REFERENCES chef_profiles(id)   ON DELETE SET NULL,
  helper_id            UUID                   REFERENCES helper_profiles(id) ON DELETE SET NULL,

  booking_type         booking_type           NOT NULL,

  -- Guest contact info (no account required)
  guest_name           VARCHAR(150)           NOT NULL,
  guest_email          VARCHAR(255)           NOT NULL,
  guest_phone          VARCHAR(20)            NOT NULL,

  -- Event details
  event_type           guest_event_type       NOT NULL,
  event_date           DATE                   NOT NULL,
  start_time           TIME                   NOT NULL,
  end_time             TIME                   NOT NULL,
  guest_count          INTEGER                NOT NULL CHECK (guest_count > 0),

  -- Budget
  budget               NUMERIC(10, 2)         NOT NULL CHECK (budget > 0),
  currency             VARCHAR(10)            NOT NULL DEFAULT 'INR',

  -- Location
  location             VARCHAR(255),
  address              TEXT,
  city                 VARCHAR(100),
  state                VARCHAR(100),
  country              VARCHAR(100)           NOT NULL DEFAULT 'India',

  special_requirements TEXT,
  status               booking_request_status NOT NULL DEFAULT 'PENDING',

  created_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

  -- Enforce that booking_type matches the populated FK and neither both nor neither are set
  CONSTRAINT chk_booking_recipient CHECK (
    (booking_type = 'CHEF'   AND chef_id IS NOT NULL   AND helper_id IS NULL) OR
    (booking_type = 'HELPER' AND chef_id IS NULL        AND helper_id IS NOT NULL)
  ),
  CONSTRAINT chk_booking_times CHECK (end_time > start_time)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_booking_requests_chef_id      ON booking_requests (chef_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_helper_id    ON booking_requests (helper_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status       ON booking_requests (status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_event_date   ON booking_requests (event_date);
CREATE INDEX IF NOT EXISTS idx_booking_requests_city         ON booking_requests (city);
CREATE INDEX IF NOT EXISTS idx_booking_requests_booking_type ON booking_requests (booking_type);

-- ============================================================
-- updated_at TRIGGER  (reuses function from migration 001)
-- ============================================================

CREATE TRIGGER trg_booking_requests_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
