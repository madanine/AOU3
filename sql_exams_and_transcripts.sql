-- ============================================================
-- EXAM SYSTEM + TRANSCRIPT SYSTEM - Database Migration
-- ============================================================
-- This migration creates all tables needed for:
-- 1. Exam Management (exams, questions, options, attempts, answers, exceptions)
-- 2. Academic Transcript (semester_transcripts, transcript_courses)
-- ============================================================
-- 1) EXAMS TABLE
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    total_marks INT NOT NULL DEFAULT 50,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_results_released BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 2) EXAM QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'essay', 'matrix')),
    question_text TEXT NOT NULL,
    marks INT NOT NULL DEFAULT 1,
    order_index INT NOT NULL DEFAULT 0,
    -- For matrix questions: rows stored as JSONB array of strings
    matrix_rows JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 3) EXAM OPTIONS TABLE (for MCQ, True/False, and Matrix column headers)
CREATE TABLE IF NOT EXISTS exam_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL DEFAULT 0
);
-- For matrix questions: correct answers stored as JSONB
-- Format: { "row_index": "correct_option_id", ... }
ALTER TABLE exam_questions
ADD COLUMN IF NOT EXISTS matrix_answers JSONB DEFAULT NULL;
-- 4) EXAM ATTEMPTS TABLE (one attempt per student per exam)
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    total_score INT,
    is_submitted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(exam_id, student_id)
);
-- 5) EXAM ANSWERS TABLE
CREATE TABLE IF NOT EXISTS exam_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES exam_options(id) ON DELETE
    SET NULL,
        essay_answer TEXT,
        -- For matrix questions: JSONB mapping row_index -> selected_option_id
        matrix_selections JSONB DEFAULT NULL,
        is_correct BOOLEAN,
        awarded_marks INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 6) EXAM EXCEPTIONS TABLE (time extensions for specific students)
CREATE TABLE IF NOT EXISTS exam_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    extended_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(exam_id, student_id)
);
-- 7) SEMESTER TRANSCRIPTS TABLE (frozen snapshot per student per semester)
CREATE TABLE IF NOT EXISTS semester_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    semester_name_snapshot TEXT NOT NULL,
    semester_average NUMERIC(5, 2),
    released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, semester_id)
);
-- 8) TRANSCRIPT COURSES TABLE (frozen course scores)
CREATE TABLE IF NOT EXISTS transcript_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES semester_transcripts(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id),
    course_name_snapshot TEXT NOT NULL,
    course_code_snapshot TEXT,
    attendance_score INT NOT NULL DEFAULT 0,
    participation_score INT NOT NULL DEFAULT 0,
    assignments_score INT NOT NULL DEFAULT 0,
    exam_score INT,
    final_score INT NOT NULL DEFAULT 0,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================================
-- INDEXES (Performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_exams_course_id ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_semester_id ON exams(semester_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_options_question_id ON exam_options(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_exam ON exam_attempts(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_exceptions_exam_student ON exam_exceptions(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_semester_transcripts_student_semester ON semester_transcripts(student_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_transcript_courses_transcript_id ON transcript_courses(transcript_id);
CREATE INDEX IF NOT EXISTS idx_transcript_courses_course_id ON transcript_courses(course_id);
-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all new tables
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_courses ENABLE ROW LEVEL SECURITY;
-- EXAMS: Admin full access, students read published only
CREATE POLICY "Admin full access on exams" ON exams FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
    )
);
CREATE POLICY "Students read published exams" ON exams FOR
SELECT USING (is_published = true);
-- EXAM QUESTIONS: Admin full access, students read via published exam
CREATE POLICY "Admin full access on exam_questions" ON exam_questions FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
    )
);
CREATE POLICY "Students read exam questions" ON exam_questions FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM exams
            WHERE exams.id = exam_questions.exam_id
                AND exams.is_published = true
        )
    );
-- EXAM OPTIONS: Admin full access, students read via published exam
CREATE POLICY "Admin full access on exam_options" ON exam_options FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
    )
);
CREATE POLICY "Students read exam options" ON exam_options FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM exam_questions eq
                JOIN exams e ON e.id = eq.exam_id
            WHERE eq.id = exam_options.question_id
                AND e.is_published = true
        )
    );
-- EXAM ATTEMPTS: Admin full access, students manage own
CREATE POLICY "Admin full access on exam_attempts" ON exam_attempts FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
    )
);
CREATE POLICY "Students manage own attempts" ON exam_attempts FOR ALL USING (student_id = auth.uid());
-- EXAM ANSWERS: Admin full access, students manage own
CREATE POLICY "Admin full access on exam_answers" ON exam_answers FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
    )
);
CREATE POLICY "Students manage own answers" ON exam_answers FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM exam_attempts
        WHERE exam_attempts.id = exam_answers.attempt_id
            AND exam_attempts.student_id = auth.uid()
    )
);
-- EXAM EXCEPTIONS: Admin full access, students read own
CREATE POLICY "Admin full access on exam_exceptions" ON exam_exceptions FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
    )
);
CREATE POLICY "Students read own exceptions" ON exam_exceptions FOR
SELECT USING (student_id = auth.uid());
-- SEMESTER TRANSCRIPTS: Admin full access, students read own
CREATE POLICY "Admin full access on semester_transcripts" ON semester_transcripts FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
    )
);
CREATE POLICY "Students read own transcripts" ON semester_transcripts FOR
SELECT USING (student_id = auth.uid());
-- TRANSCRIPT COURSES: Admin full access, students read own
CREATE POLICY "Admin full access on transcript_courses" ON transcript_courses FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
    )
);
CREATE POLICY "Students read own transcript courses" ON transcript_courses FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM semester_transcripts
            WHERE semester_transcripts.id = transcript_courses.transcript_id
                AND semester_transcripts.student_id = auth.uid()
        )
    );