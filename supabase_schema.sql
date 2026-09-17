-- Mindwave Car Race Leaderboard - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor (https://app.supabase.com -> SQL Editor)

-- 1. Create race_history table
CREATE TABLE IF NOT EXISTS public.race_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id TEXT UNIQUE NOT NULL,
    location_id TEXT NOT NULL DEFAULT 'location_1',
    race_id TEXT,
    player_id TEXT,
    player_name TEXT NOT NULL,
    best_lap TEXT DEFAULT '--',
    laps INTEGER DEFAULT 0,
    target_laps INTEGER DEFAULT 8,
    total_time_ms INTEGER DEFAULT 0,
    total_time_str TEXT DEFAULT '--',
    fastest_lap_str TEXT DEFAULT '--',
    is_winner BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'PARTICIPANT',
    timestamp BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index on location_id for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_race_history_location ON public.race_history (location_id);
CREATE INDEX IF NOT EXISTS idx_race_history_timestamp ON public.race_history (timestamp DESC);

-- 3. Enable Row Level Security (RLS) and allow public read/write access for leaderboard API
ALTER TABLE public.race_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access for all
CREATE POLICY "Allow public read access" 
ON public.race_history 
FOR SELECT 
USING (true);

-- Policy: Allow insert/update access for all
CREATE POLICY "Allow public insert access" 
ON public.race_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.race_history 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access" 
ON public.race_history 
FOR DELETE 
USING (true);

-- Enable Realtime for race_history table so public TVs sync automatically
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_history;
