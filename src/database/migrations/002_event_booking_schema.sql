-- ============================================================
-- ChefLink Database Schema v2.0 – Event Booking Module
-- Run after 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE event_status   AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'ATTENDED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE events (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID          NOT NULL REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
  title                 VARCHAR(255)  NOT NULL,
  description           TEXT,
  event_type            VARCHAR(100),
  event_date            DATE          NOT NULL,
  start_time            TIME          NOT NULL,
  end_time              TIME          NOT NULL,
  venue                 VARCHAR(255)  NOT NULL,
  address               TEXT,
  city                  VARCHAR(100),
  state                 VARCHAR(100),
  country               VARCHAR(100)  NOT NULL DEFAULT 'India',
  max_participants      INTEGER       NOT NULL CHECK (max_participants > 0),
  current_participants  INTEGER       NOT NULL DEFAULT 0 CHECK (current_participants >= 0),
  price                 NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency              VARCHAR(10)   NOT NULL DEFAULT 'INR',
  banner_url            TEXT,
  status                event_status  NOT NULL DEFAULT 'DRAFT',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_event_times        CHECK (end_time > start_time),
  CONSTRAINT chk_participants_cap   CHECK (current_participants <= max_participants)
);

CREATE INDEX idx_events_restaurant_id ON events (restaurant_id);
CREATE INDEX idx_events_event_date    ON events (event_date);
CREATE INDEX idx_events_city          ON events (city);
CREATE INDEX idx_events_status        ON events (status);

-- ============================================================
-- EVENT BOOKINGS
-- ============================================================

CREATE TABLE event_bookings (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID           NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id          UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_status   booking_status NOT NULL DEFAULT 'PENDING',
  number_of_people INTEGER        NOT NULL DEFAULT 1 CHECK (number_of_people > 0),
  booking_date     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  special_request  TEXT,
  payment_status   payment_status NOT NULL DEFAULT 'PENDING',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_bookings_event_id ON event_bookings (event_id);
CREATE INDEX idx_event_bookings_user_id  ON event_bookings (user_id);

-- ============================================================
-- EVENT GALLERY
-- ============================================================

CREATE TABLE event_gallery (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  image_url  TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_gallery_event_id ON event_gallery (event_id);

-- ============================================================
-- updated_at TRIGGERS  (reuses the function from migration 001)
-- ============================================================

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_event_bookings_updated_at
  BEFORE UPDATE ON event_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
