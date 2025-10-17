-- ============================================================================
-- SPRINT 1 MIGRATIONS - Core & Communication
-- ============================================================================

-- ============================================================================
-- 1. EXTEND USER_PROFILE
-- ============================================================================

-- Add new columns to user_profile
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS level NUMERIC DEFAULT 3.0 CHECK (level >= 1.0 AND level <= 7.0),
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "lang": "en",
  "notifications": {
    "email": true,
    "whatsapp": true,
    "sms": false,
    "push": true
  },
  "privacy": {
    "show_location": true,
    "show_level": true,
    "discoverable": true
  }
}'::jsonb;

-- Create indexes for profile search
CREATE INDEX IF NOT EXISTS idx_user_profile_name ON user_profile(name);
CREATE INDEX IF NOT EXISTS idx_user_profile_phone ON user_profile(phone);
CREATE INDEX IF NOT EXISTS idx_user_profile_location ON user_profile(lat, lng);
CREATE INDEX IF NOT EXISTS idx_user_profile_level ON user_profile(level);

-- ============================================================================
-- 2. SOCIAL FEED TABLES
-- ============================================================================

-- Posts table
CREATE TABLE IF NOT EXISTS post (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organization(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  likes_count INT DEFAULT 0 CHECK (likes_count >= 0),
  comments_count INT DEFAULT 0 CHECK (comments_count >= 0),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private', 'org')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS post_like (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS post_comment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social feed
CREATE INDEX IF NOT EXISTS idx_post_user_id ON post(user_id);
CREATE INDEX IF NOT EXISTS idx_post_org_id ON post(org_id);
CREATE INDEX IF NOT EXISTS idx_post_created_at ON post(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_like_post_id ON post_like(post_id);
CREATE INDEX IF NOT EXISTS idx_post_like_user_id ON post_like(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comment_post_id ON post_comment(post_id);

-- Triggers for social feed
CREATE TRIGGER update_post_updated_at
  BEFORE UPDATE ON post
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comment_updated_at
  BEFORE UPDATE ON post_comment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_like_count_trigger
  AFTER INSERT OR DELETE ON post_like
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_comment_count_trigger
  AFTER INSERT OR DELETE ON post_comment
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

-- ============================================================================
-- 3. BOOKING SYSTEM TABLES
-- ============================================================================

-- Court table
CREATE TABLE IF NOT EXISTS court (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'outdoor' CHECK (type IN ('indoor', 'outdoor', 'covered')),
  surface TEXT DEFAULT 'concrete' CHECK (surface IN ('carpet', 'concrete', 'grass', 'crystal', 'synthetic')),
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability slots table
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES court(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price_per_hour NUMERIC NOT NULL CHECK (price_per_hour >= 0),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Booking table
CREATE TABLE IF NOT EXISTS booking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES court(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_booking_time CHECK (end_at > start_at)
);

-- Indexes for booking system
CREATE INDEX IF NOT EXISTS idx_court_org_id ON court(org_id);
CREATE INDEX IF NOT EXISTS idx_court_active ON court(active);
CREATE INDEX IF NOT EXISTS idx_availability_court_id ON availability(court_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_booking_court_id ON booking(court_id);
CREATE INDEX IF NOT EXISTS idx_booking_user_id ON booking(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_org_id ON booking(org_id);
CREATE INDEX IF NOT EXISTS idx_booking_start_at ON booking(start_at);
CREATE INDEX IF NOT EXISTS idx_booking_status ON booking(status);

-- Triggers for booking system
CREATE TRIGGER update_court_updated_at
  BEFORE UPDATE ON court
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_updated_at
  BEFORE UPDATE ON booking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM booking
    WHERE court_id = NEW.court_id
    AND status IN ('pending', 'confirmed')
    AND id != COALESCE(NEW.id, gen_random_uuid())
    AND (
      (start_at <= NEW.start_at AND end_at > NEW.start_at)
      OR (start_at < NEW.end_at AND end_at >= NEW.end_at)
      OR (start_at >= NEW.start_at AND end_at <= NEW.end_at)
    )
  ) THEN
    RAISE EXCEPTION 'Booking conflict: Court is already booked for this time slot';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_conflict_check
  BEFORE INSERT OR UPDATE ON booking
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_conflict();
