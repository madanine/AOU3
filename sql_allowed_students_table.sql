-- ============================================
-- University ID Registry Table
-- Cloud-Only, Single Source of Truth
-- ============================================
-- Create allowed_students table
CREATE TABLE IF NOT EXISTS allowed_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES profiles(id) ON DELETE
    SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_allowed_students_university_id ON allowed_students(university_id);
CREATE INDEX IF NOT EXISTS idx_allowed_students_is_used ON allowed_students(is_used);
CREATE INDEX IF NOT EXISTS idx_allowed_students_created_at ON allowed_students(created_at);
CREATE INDEX IF NOT EXISTS idx_allowed_students_used_by ON allowed_students(used_by);
-- Create search index for name (for partial matching)
CREATE INDEX IF NOT EXISTS idx_allowed_students_name_trgm ON allowed_students USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_allowed_students_id_trgm ON allowed_students USING gin(university_id gin_trgm_ops);
-- Enable RLS (Row Level Security)
ALTER TABLE allowed_students ENABLE ROW LEVEL SECURITY;
-- Policy: Super admins can do everything
CREATE POLICY "Super admins have full access to allowed_students" ON allowed_students FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
    )
);
-- Policy: Admins with registry permission can read/write
CREATE POLICY "Admins with registry permission can manage allowed_students" ON allowed_students FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.can_access_registry = true
    )
);
-- Policy: Allow students to check if their ID exists during signup (read-only)
CREATE POLICY "Students can check their own university ID" ON allowed_students FOR
SELECT TO authenticated USING (true);
-- Add permission column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS can_access_registry BOOLEAN DEFAULT FALSE;
-- Create index for the new permission column
CREATE INDEX IF NOT EXISTS idx_profiles_can_access_registry ON profiles(can_access_registry);
-- Verify the table was created
SELECT column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'allowed_students'
ORDER BY ordinal_position;