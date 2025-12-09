-- Create municipal_sources table for tracking verified disposal guidance sources
CREATE TABLE IF NOT EXISTS public.municipal_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location TEXT NOT NULL,
  item_pattern TEXT NOT NULL,
  guidance_text TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('gov', 'jpa', 'hauler', 'microsite', 'phone', 'facility')) NOT NULL,
  source_url TEXT,
  source_phone TEXT,
  source_facility_name TEXT,
  content_hash TEXT, -- SHA-256 hash of normalized content for drift detection
  http_status INTEGER,
  soft_404_detected BOOLEAN DEFAULT false,
  parked_domain_detected BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  next_check_date TIMESTAMPTZ,
  franchise_expiry_date DATE, -- Critical for microsite monitoring
  verification_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_municipal_sources_location ON public.municipal_sources(location);
CREATE INDEX IF NOT EXISTS idx_municipal_sources_next_check ON public.municipal_sources(next_check_date) WHERE next_check_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_municipal_sources_type ON public.municipal_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_municipal_sources_location_item ON public.municipal_sources(location, item_pattern);

-- Create source_stability_log table for tracking URL changes over time
CREATE TABLE IF NOT EXISTS public.source_stability_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.municipal_sources(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  http_status INTEGER,
  soft_404_detected BOOLEAN DEFAULT false,
  parked_domain_detected BOOLEAN DEFAULT false,
  content_hash TEXT,
  content_changed BOOLEAN DEFAULT false,
  error_message TEXT,
  repair_attempted BOOLEAN DEFAULT false,
  repair_successful BOOLEAN DEFAULT false,
  new_url TEXT
);

-- Create index for time-series queries
CREATE INDEX IF NOT EXISTS idx_source_stability_log_checked_at ON public.source_stability_log(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_stability_log_source_id ON public.source_stability_log(source_id);

-- Create legislative_events table for tracking compliance deadlines
CREATE TABLE IF NOT EXISTS public.legislative_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  regulation_name TEXT NOT NULL, -- e.g., "SB 1383", "AB 1826"
  region TEXT NOT NULL, -- e.g., "California", "Alameda County"
  deadline_date DATE NOT NULL,
  description TEXT,
  volatility_window_days INTEGER DEFAULT 60, -- Days before/after to increase validation frequency
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for deadline lookups
CREATE INDEX IF NOT EXISTS idx_legislative_events_deadline ON public.legislative_events(deadline_date);
CREATE INDEX IF NOT EXISTS idx_legislative_events_region ON public.legislative_events(region);

-- Add RLS policies (for now, allow all authenticated access)
ALTER TABLE public.municipal_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_stability_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislative_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role has full access to municipal_sources" ON public.municipal_sources
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to source_stability_log" ON public.source_stability_log
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to legislative_events" ON public.legislative_events
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Allow public read access (for authenticated users querying data)
CREATE POLICY "Public read access to municipal_sources" ON public.municipal_sources
  FOR SELECT USING (true);

CREATE POLICY "Public read access to legislative_events" ON public.legislative_events
  FOR SELECT USING (true);

-- Insert initial legislative events for California
INSERT INTO public.legislative_events (regulation_name, region, deadline_date, description, volatility_window_days)
VALUES 
  ('SB 1383 Phase 1', 'California', '2022-01-01', 'Organic waste collection programs required', 60),
  ('SB 1383 Phase 2', 'California', '2024-01-01', '75% organic waste diversion target', 60),
  ('AB 1826', 'California', '2016-04-01', 'Commercial organic waste recycling', 30)
ON CONFLICT DO NOTHING;

-- Add updated_at trigger for municipal_sources
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_municipal_sources_updated_at
  BEFORE UPDATE ON public.municipal_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
