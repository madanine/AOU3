-- ============================================================
-- Database Performance Indexes
-- هذا الملف للحفظ فقط - لا تنفذه تلقائياً
-- نفّذه يدوياً في Supabase SQL Editor عند الحاجة
-- ============================================================

-- Index on profiles(email) — تسريع تسجيل الدخول والبحث بالإيميل
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Index on profiles(role) — تسريع استعلامات حسب الدور
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Index on profiles(university_id) — تسريع البحث بالرقم الجامعي
CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON profiles(university_id);

-- Index on enrollments(student_id) — تسريع جلب تسجيلات طالب معين
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);

-- Index on enrollments(course_id) — تسريع جلب طلاب مادة معينة
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

-- Index on attendance(student_id) — تسريع جلب حضور طالب
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);

-- Index on attendance(course_id) — تسريع جلب حضور مادة
CREATE INDEX IF NOT EXISTS idx_attendance_course_id ON attendance(course_id);

-- Composite index on attendance(student_id, course_id) — الأسرع للاستعلامات المركبة
CREATE INDEX IF NOT EXISTS idx_attendance_student_course ON attendance(student_id, course_id);

-- Index on participation(student_id)
CREATE INDEX IF NOT EXISTS idx_participation_student_id ON participation(student_id);

-- Index on participation(course_id)
CREATE INDEX IF NOT EXISTS idx_participation_course_id ON participation(course_id);

-- Index on submissions(student_id)
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);

-- Index on submissions(assignment_id)
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);

-- Index on assignments(course_id)
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);

-- Index on allowed_students(university_id)
CREATE INDEX IF NOT EXISTS idx_allowed_students_university_id ON allowed_students(university_id);

-- Index on allowed_students(is_used) — تسريع الفلترة حسب الحالة
CREATE INDEX IF NOT EXISTS idx_allowed_students_is_used ON allowed_students(is_used);

-- ============================================================
-- ⚡ Composite Indexes (حرجة لأداء 91+ طالب متزامن)
-- ============================================================

-- يُسرّع جلب تسليمات طالب معين في تكليف معين
CREATE INDEX IF NOT EXISTS idx_submissions_student_assignment 
  ON submissions(student_id, assignment_id);

-- يُسرّع جلب تسليمات طالب معين في مادة معينة
CREATE INDEX IF NOT EXISTS idx_submissions_student_course 
  ON submissions(student_id, course_id);

-- يُسرّع جلب تكاليف مادة معينة في فصل معين
CREATE INDEX IF NOT EXISTS idx_assignments_course_semester 
  ON assignments(course_id, semester_id);

-- يُسرّع جلب تسجيلات طالب معين في فصل معين
CREATE INDEX IF NOT EXISTS idx_enrollments_student_semester 
  ON enrollments(student_id, semester_id);
