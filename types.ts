
export type Role = 'admin' | 'student' | 'supervisor';

export type Major = string;

export interface User {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: Role;
  universityId: string;
  phone?: string;
  major?: Major | string;
  nationality?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  createdAt: string;
  assignedCourses?: string[];
  supervisorPermissions?: {
    attendance: boolean;
    assignments: boolean;
    grading: boolean;
  };
  permissions?: {
    dashboard: boolean;
    courses: boolean;
    attendance: boolean;
    supervisors: boolean;
    students: boolean;
    enrollments: boolean;
    exportData: boolean;
    siteSettings: boolean;
    assignments?: boolean;
    grading?: boolean;
    exams?: boolean;
    manageAdmins?: boolean;
  };
  fullAccess?: boolean;
  isDisabled?: boolean;
  canAccessRegistry?: boolean;  // New: University ID Registry permission
}

// University ID Registry
export interface AllowedStudent {
  id: string;
  universityId: string;
  name: string;
  isUsed: boolean;
  usedAt?: string;
  usedBy?: string;
  createdAt: string;
}

export interface ThemeSettings {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export interface SiteSettings {
  branding: {
    siteNameAr: string;
    siteNameEn: string;
    logoBase64?: string;
    logo?: string;
    footerText: string;
    announcements: string[];
  };
  theme: ThemeSettings;
  darkTheme: ThemeSettings;
  fonts: {
    arabicFont: string;
    latinFont: string;
    baseFontSize: string;
  };
  registrationStatus: 'open' | 'closed';
  activeSemesterId?: string;
  defaultSemesterId?: string;
  isDarkMode?: boolean;
}

export type Language = 'AR' | 'EN' | 'FR' | 'RU';

export interface Course {
  id: string;
  code: string;
  title: string;
  title_ar: string;
  credits: number;
  description?: string;
  description_ar?: string;
  doctor: string;
  doctor_ar?: string;
  day: string;
  time: string;
  isRegistrationEnabled: boolean;
  semesterId?: string;
  lectureLink?: string;
  whatsappLink?: string;
  telegramLink?: string;
  notes?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  semesterId?: string;
}

export interface Semester {
  id: string;
  name: string;
  createdAt: string;
}

export type AssignmentType = 'file' | 'mcq' | 'essay';

export interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  semesterId: string;
  title: string;
  subtitle?: string;
  type: AssignmentType;
  deadline: string;
  questions: Question[];
  showResults: boolean;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  courseId: string;
  submittedAt: string;
  answers?: string[];
  fileBase64?: string;
  fileUrl?: string;
  fileName?: string;
  grade?: string;
}

// Normalized Attendance Row (DB Compatible)
export interface AttendanceRow {
  id?: string;
  courseId: string;
  studentId: string;
  lectureIndex: number;
  status: boolean | null; // true=present, false=absent, null/undefined=not_taken
}

// Deprecated: UI Map Structure (We will convert to/from this)
export type AttendanceRecord = Record<string, Record<string, (boolean | null)[]>>;

// Participation Row (DB Compatible) - mirrors AttendanceRow
export interface ParticipationRow {
  id?: string;
  courseId: string;
  studentId: string;
  lectureIndex: number;
  status: boolean | null; // true=participated, false/null=not_participated
}

// UI Map Structure for Participation
export type ParticipationRecord = Record<string, Record<string, (boolean | null)[]>>;

// ============================================================
// EXAM SYSTEM TYPES
// ============================================================

export type ExamQuestionType = 'mcq' | 'true_false' | 'essay' | 'matrix';

export interface Exam {
  id: string;
  courseId: string;
  semesterId: string;
  title: string;
  startAt: string;
  endAt: string;
  totalMarks: number;
  isPublished: boolean;
  isResultsReleased: boolean;
  createdAt: string;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  type: ExamQuestionType;
  questionText: string;
  marks: number;
  orderIndex: number;
  matrixRows?: string[];      // For matrix: row labels
  matrixAnswers?: Record<string, string[]>; // For matrix: { rowIndex: [correctOptionIds] }
  createdAt: string;
  options?: ExamOption[];      // Populated when fetched with options
}

export interface ExamOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  submittedAt?: string;
  totalScore?: number;
  isSubmitted: boolean;
  createdAt: string;
}

export interface ExamAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId?: string;
  essayAnswer?: string;
  matrixSelections?: Record<string, string[]>; // { rowIndex: [selectedOptionIds] }
  isCorrect?: boolean;
  awardedMarks?: number;
  createdAt: string;
}

export interface ExamException {
  id: string;
  examId: string;
  studentId: string;
  extendedUntil: string;
  createdAt: string;
}

// ============================================================
// TRANSCRIPT SYSTEM TYPES
// ============================================================

export interface SemesterTranscript {
  id: string;
  studentId: string;
  semesterId: string;
  semesterNameSnapshot: string;
  semesterAverage?: number;
  releasedAt: string;
  createdAt: string;
  courses?: TranscriptCourse[]; // Populated when fetched
}

export interface TranscriptCourse {
  id: string;
  transcriptId: string;
  courseId: string;
  courseNameSnapshot: string;
  courseCodeSnapshot?: string;
  attendanceScore: number;
  participationScore: number;
  assignmentsScore: number;
  examScore?: number;
  finalScore: number;
  percentage: number;
  createdAt: string;
}
