/*
  # Add Page Sessions Summary Table

  1. New Tables
    - `page_sessions_summary`
      - `id` (uuid, primary key)
      - `page_path` (text, not null)
      - `date` (date, not null) 
      - `total_sessions` (integer, default 0)
      - `unique_users` (integer, default 0)
      - `total_time_seconds` (bigint, default 0)
      - `avg_time_seconds` (numeric, default 0)
      - `bounce_sessions` (integer, default 0) - sessions under 10 seconds
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())

  2. Indexes
    - Unique index on (page_path, date) for efficient lookups
    - Index on date for time-based queries
    - Index on page_path for page-specific analytics

  3. Security
    - Enable RLS on `page_sessions_summary` table
    - Add policy for authenticated users to read summary data
    - Add policy for admins to manage summary data

  4. Functions
    - Function to refresh daily summaries
    - Trigger to update summaries when page_sessions change
*/

-- Create the page sessions summary table
CREATE TABLE IF NOT EXISTS page_sessions_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  date date NOT NULL,
  total_sessions integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  total_time_seconds bigint DEFAULT 0,
  avg_time_seconds numeric DEFAULT 0,
  bounce_sessions integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_sessions_summary_page_date 
  ON page_sessions_summary (page_path, date);

CREATE INDEX IF NOT EXISTS idx_page_sessions_summary_date 
  ON page_sessions_summary (date);

CREATE INDEX IF NOT EXISTS idx_page_sessions_summary_page_path 
  ON page_sessions_summary (page_path);

-- Enable RLS
ALTER TABLE page_sessions_summary ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read summary data
CREATE POLICY "Allow authenticated users to read summary data"
  ON page_sessions_summary
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for admins to manage summary data
CREATE POLICY "Allow admins to manage summary data"
  ON page_sessions_summary
  FOR ALL
  TO authenticated
  USING (
    ((jwt() -> 'user_metadata'::text) ->> 'provider_id'::text) = ANY (
      ARRAY['154388953053659137'::text, '344637470908088322'::text, '487476487386038292'::text, '492053410967846933'::text]
    )
  )
  WITH CHECK (
    ((jwt() -> 'user_metadata'::text) ->> 'provider_id'::text) = ANY (
      ARRAY['154388953053659137'::text, '344637470908088322'::text, '487476487386038292'::text, '492053410967846933'::text]
    )
  );

-- Function to refresh daily page session summaries
CREATE OR REPLACE FUNCTION refresh_page_sessions_summary(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing summary for the target date
  DELETE FROM page_sessions_summary WHERE date = target_date;
  
  -- Insert new summary data
  INSERT INTO page_sessions_summary (
    page_path,
    date,
    total_sessions,
    unique_users,
    total_time_seconds,
    avg_time_seconds,
    bounce_sessions
  )
  SELECT 
    page_path,
    target_date,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT discord_id) as unique_users,
    COALESCE(SUM(time_spent_seconds), 0) as total_time_seconds,
    COALESCE(AVG(time_spent_seconds), 0) as avg_time_seconds,
    COUNT(*) FILTER (WHERE time_spent_seconds < 10 OR time_spent_seconds IS NULL) as bounce_sessions
  FROM page_sessions
  WHERE DATE(enter_time) = target_date
    AND time_spent_seconds IS NOT NULL
  GROUP BY page_path;
  
  -- Update the updated_at timestamp
  UPDATE page_sessions_summary 
  SET updated_at = now() 
  WHERE date = target_date;
END;
$$;

-- Function to get top pages by total time for a date range
CREATE OR REPLACE FUNCTION get_top_pages_by_time(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '7 days',
  end_date date DEFAULT CURRENT_DATE,
  page_limit integer DEFAULT 10
)
RETURNS TABLE (
  page_path text,
  total_sessions bigint,
  unique_users bigint,
  total_time_seconds bigint,
  avg_time_seconds numeric,
  bounce_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pss.page_path,
    SUM(pss.total_sessions) as total_sessions,
    SUM(pss.unique_users) as unique_users,
    SUM(pss.total_time_seconds) as total_time_seconds,
    AVG(pss.avg_time_seconds) as avg_time_seconds,
    CASE 
      WHEN SUM(pss.total_sessions) > 0 
      THEN (SUM(pss.bounce_sessions)::numeric / SUM(pss.total_sessions)::numeric) * 100
      ELSE 0
    END as bounce_rate
  FROM page_sessions_summary pss
  WHERE pss.date BETWEEN start_date AND end_date
  GROUP BY pss.page_path
  ORDER BY SUM(pss.total_time_seconds) DESC
  LIMIT page_limit;
END;
$$;

-- Function to get user activity summary for a specific user
CREATE OR REPLACE FUNCTION get_user_activity_summary(
  user_discord_id text,
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  page_path text,
  total_sessions bigint,
  total_time_seconds bigint,
  avg_time_seconds numeric,
  last_visit timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.page_path,
    COUNT(*) as total_sessions,
    COALESCE(SUM(ps.time_spent_seconds), 0) as total_time_seconds,
    COALESCE(AVG(ps.time_spent_seconds), 0) as avg_time_seconds,
    MAX(ps.enter_time) as last_visit
  FROM page_sessions ps
  WHERE ps.discord_id = user_discord_id
    AND DATE(ps.enter_time) BETWEEN start_date AND end_date
    AND ps.time_spent_seconds IS NOT NULL
  GROUP BY ps.page_path
  ORDER BY SUM(ps.time_spent_seconds) DESC;
END;
$$;

-- Create a function to automatically refresh yesterday's summary
CREATE OR REPLACE FUNCTION auto_refresh_daily_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh summary for yesterday (data should be complete by now)
  PERFORM refresh_page_sessions_summary(CURRENT_DATE - INTERVAL '1 day');
  
  -- Also refresh today's summary for real-time updates
  PERFORM refresh_page_sessions_summary(CURRENT_DATE);
END;
$$;

-- Initial population of summary data for the last 30 days
DO $$
DECLARE
  current_date_iter date;
BEGIN
  -- Loop through the last 30 days and create summaries
  FOR current_date_iter IN 
    SELECT generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day'::interval)::date
  LOOP
    PERFORM refresh_page_sessions_summary(current_date_iter);
  END LOOP;
END;
$$;