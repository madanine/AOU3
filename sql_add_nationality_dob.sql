-- SQL to add nationality and date_of_birth columns to profiles table
-- Run this in Supabase SQL Editor
-- Add nationality column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS nationality TEXT;
-- Add date_of_birth column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE;
-- Create index for faster queries on DOB (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON profiles(date_of_birth);
-- Verify columns were added
SELECT column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
    AND column_name IN ('nationality', 'date_of_birth');