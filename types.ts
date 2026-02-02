
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
  createdAt: string;
  assignedCourses?: string[]; // IDs of courses for supervisors
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
  };
  fullAccess?: boolean;
  isDisabled?: boolean; // خاصية لتعطيل الحساب
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
    logo?: string; // Path to logo file
    footerText: string;
    announcements: string[]; // base64 images
  };
  theme: ThemeSettings;
  darkTheme: ThemeSettings; // ألوان الوضع الليلي القابلة للتخصيص
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

// Added missing types below

/**
 * Represents a course in the system.
 */
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
}

/**
 * Represents a student enrollment in a course.
 */
export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  semesterId?: string;
}

/**
 * Represents an academic semester.
 */
export interface Semester {
  id: string;
  name: string;
  createdAt: string;
}

export type AssignmentType = 'file' | 'mcq' | 'essay';

/**
 * Represents a question in an assignment or quiz.
 */
export interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
}

/**
 * Represents an assignment or test created for a course.
 */
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

/**
 * Represents a student's submission for an assignment.
 */
export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  courseId: string;
  submittedAt: string;
  answers?: string[];
  fileBase64?: string;
  fileName?: string;
  grade?: string;
}

/**
 * Mapping of course ID to (student ID to attendance array).
 */
export type AttendanceRecord = Record<string, Record<string, (boolean | null)[]>>;
