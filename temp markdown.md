# Supabase Setup SQL

Run this entire SQL block in your Supabase SQL Editor for the `gigcare` project.

```sql
-- 1. CLEAN START: Drop existing triggers and tables
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.location_signals CASCADE;
DROP TABLE IF EXISTS public.claims CASCADE;
DROP TABLE IF EXISTS public.policies CASCADE;
DROP TABLE IF EXISTS public.premium_quotes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.zones CASCADE;

-- 2. Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. CREATE: Zones table
CREATE TABLE public.zones (
  zone_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  zone_risk_score FLOAT DEFAULT 1.0,
  zone_risk_level TEXT DEFAULT 'MEDIUM',
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREATE: Profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'worker',
  platform TEXT,
  zone_id VARCHAR(50) REFERENCES public.zones(zone_id),
  last_known_latitude DOUBLE PRECISION,
  last_known_longitude DOUBLE PRECISION,
  location_verified BOOLEAN DEFAULT FALSE,
  zone_mismatch BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CREATE: Premium Quotes table
CREATE TABLE public.premium_quotes (
  quote_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  zone_id VARCHAR(50) REFERENCES public.zones(zone_id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  premium_rupees INT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CREATE: Policies table
CREATE TABLE public.policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.premium_quotes(quote_id),
  coverage_tier TEXT NOT NULL,
  premium_paid INT NOT NULL,
  max_payout INT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Haversine Distance Function
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  dist DOUBLE PRECISION;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  dist := acos(
    sin(radians(lat1)) * sin(radians(lat2)) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    cos(radians(lon2) - radians(lon1))
  ) * 6371;
  RETURN dist;
END;
$$ LANGUAGE plpgsql;

-- 8. Secure Auth Trigger Logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  reg_lat DOUBLE PRECISION;
  reg_lon DOUBLE PRECISION;
  nearest_zone_id VARCHAR(50);
  selected_zone_id VARCHAR(50);
  dist_to_selected DOUBLE PRECISION;
  computed_zone_mismatch BOOLEAN := FALSE;
  computed_zone_id VARCHAR(50);
BEGIN
  reg_lat := NULLIF(new.raw_user_meta_data->>'latitude', '')::DOUBLE PRECISION;
  reg_lon := NULLIF(new.raw_user_meta_data->>'longitude', '')::DOUBLE PRECISION;
  selected_zone_id := new.raw_user_meta_data->>'zone_id';

  IF reg_lat IS NOT NULL AND reg_lon IS NOT NULL THEN
    SELECT zone_id
      INTO nearest_zone_id
    FROM public.zones
    ORDER BY public.calculate_distance(reg_lat, reg_lon, lat, lon) ASC NULLS LAST
    LIMIT 1;

    IF selected_zone_id IS NOT NULL THEN
      SELECT public.calculate_distance(reg_lat, reg_lon, lat, lon)
        INTO dist_to_selected
      FROM public.zones
      WHERE zone_id = selected_zone_id;

      IF dist_to_selected IS NOT NULL AND dist_to_selected > 10 THEN
        computed_zone_mismatch := TRUE;
      END IF;
    END IF;
  END IF;

  computed_zone_id := COALESCE(selected_zone_id, nearest_zone_id, 'zone_01');

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    platform,
    zone_id,
    last_known_latitude,
    last_known_longitude,
    location_verified,
    zone_mismatch
  ) VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    'worker',
    new.raw_user_meta_data->>'platform',
    computed_zone_id,
    reg_lat,
    reg_lon,
    (reg_lat IS NOT NULL AND reg_lon IS NOT NULL),
    computed_zone_mismatch
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Final Seed: Bengaluru Zones
INSERT INTO public.zones (zone_id, name, city, zone_risk_score, zone_risk_level, lat, lon)
VALUES 
  ('zone_01', 'Koramangala', 'Bengaluru', 0.85, 'LOW', 12.9352, 77.6245),
  ('zone_02', 'Whitefield', 'Bengaluru', 1.60, 'HIGH', 12.9698, 77.7499),
  ('zone_03', 'Indiranagar', 'Bengaluru', 1.00, 'MEDIUM', 12.9716, 77.6412),
  ('zone_04', 'HSR Layout', 'Bengaluru', 1.20, 'MEDIUM', 12.9151, 77.6398),
  ('zone_05', 'Bommanahalli', 'Bengaluru', 1.45, 'HIGH', 12.9010, 77.6182);
```
