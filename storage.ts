import { User, Course, Enrollment, SiteSettings, AttendanceRecord, Semester, Assignment, Submission } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { supabaseService } from './supabaseService';

const KEYS = {
  USERS: 'aou_users',
  COURSES: 'aou_courses',
  ENROLLMENTS: 'aou_enrollments',
  SETTINGS: 'aou_settings',
  AUTH_USER: 'aou_current_user',
  LANGUAGE: 'aou_lang',
  ATTENDANCE: 'aou_attendance',
  SEMESTERS: 'aou_semesters',
  ASSIGNMENTS: 'aou_assignments',
  SUBMISSIONS: 'aou_submissions'
};

export const storage = {
  // Sync logic
  async syncFromSupabase() {
    try {
      // Fetch everything in parallel
      const [users, courses, enrollments, settings, semesters, assignments, submissions] = await Promise.all([
        supabaseService.getUsers(),
        supabaseService.getCourses(),
        supabaseService.getEnrollments(),
        supabaseService.getSettings(),
        supabaseService.getSemesters(),
        supabaseService.getAssignments(),
        supabaseService.getSubmissions()
      ]);

      // Update LocalStorage directly without triggering re-sync to avoid loops
      if (users.length > 0) localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      if (courses.length > 0) localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
      if (enrollments.length > 0) localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
      if (settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      if (semesters.length > 0) localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters));
      if (assignments.length > 0) localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
      if (submissions.length > 0) localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions));

      console.log('Successfully synced from Supabase (Matte Sync)');
      return settings;
    } catch (e) {
      console.warn('Failed to sync from Supabase, using localStorage:', e);
      return null;
    }
  },

  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  setUsers: (users: User[]) => {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    // Background sync
    users.forEach(u => supabaseService.upsertUser(u).catch(console.error));
  },

  getCourses: (): Course[] => JSON.parse(localStorage.getItem(KEYS.COURSES) || '[]'),
  setCourses: (courses: Course[]) => {
    localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
    courses.forEach(c => supabaseService.upsertCourse(c).catch(console.error));
  },

  getEnrollments: (): Enrollment[] => JSON.parse(localStorage.getItem(KEYS.ENROLLMENTS) || '[]'),
  setEnrollments: (enrollments: Enrollment[]) => {
    localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
    enrollments.forEach(e => supabaseService.upsertEnrollment(e).catch(console.error));
  },

  getSettings: (): SiteSettings => JSON.parse(localStorage.getItem(KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS)),
  setSettings: (settings: SiteSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    supabaseService.updateSettings(settings).catch(console.error);
  },

  getAuthUser: (): User | null => JSON.parse(localStorage.getItem(KEYS.AUTH_USER) || 'null'),
  setAuthUser: (user: User | null) => localStorage.setItem(KEYS.AUTH_USER, JSON.stringify(user)),

  async clearAuth() {
    localStorage.removeItem(KEYS.AUTH_USER);
    await supabaseService.signOut().catch(console.error);
  },

  getLanguage: (): string => localStorage.getItem(KEYS.LANGUAGE) || 'AR',
  setLanguage: (lang: string) => localStorage.setItem(KEYS.LANGUAGE, lang),

  getAttendance: (): AttendanceRecord => JSON.parse(localStorage.getItem(KEYS.ATTENDANCE) || '{}'),
  setAttendance: (record: AttendanceRecord) => localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(record)),

  getSemesters: (): Semester[] => JSON.parse(localStorage.getItem(KEYS.SEMESTERS) || '[]'),
  setSemesters: (semesters: Semester[]) => localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters)),

  getAssignments: (): Assignment[] => JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS) || '[]'),
  setAssignments: (assignments: Assignment[]) => localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments)),

  getSubmissions: (): Submission[] => JSON.parse(localStorage.getItem(KEYS.SUBMISSIONS) || '[]'),
  setSubmissions: (submissions: Submission[]) => localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions)),

  seed: () => {
    // 0. SEED SEMESTERS & MIGRATION
    let semesters = storage.getSemesters();
    let settings = storage.getSettings();

    if (semesters.length === 0) {
      const defaultSem = { id: 'sem-default', name: 'FALL 2024', createdAt: new Date().toISOString() };
      semesters = [defaultSem];
      storage.setSemesters(semesters);
      settings.activeSemesterId = defaultSem.id;
      settings.defaultSemesterId = defaultSem.id;
      storage.setSettings(settings);

      // Migrate legacy courses/enrollments
      const courses = storage.getCourses().map(c => ({ ...c, semesterId: c.semesterId || defaultSem.id }));
      storage.setCourses(courses);
      const enrollments = storage.getEnrollments().map(e => ({ ...e, semesterId: e.semesterId || defaultSem.id }));
      storage.setEnrollments(enrollments);
    }

    // 1. SEED USERS (Additive)
    const existingUsers = storage.getUsers();

    // New Admin Credentials requested by USER
    const admin = {
      id: 'admin-primary',
      email: 'aouadmin@aou.edu',
      password: 'Aou@676',
      fullName: 'AOU Administrator',
      role: 'admin' as const,
      universityId: 'aouadmin', // This is the ID used for login
      createdAt: new Date().toISOString()
    };

    let updatedUsers = [...existingUsers];
    // Add admin if not exists
    if (!updatedUsers.find(u => u.universityId === admin.universityId)) {
      updatedUsers.push(admin);
    }

    localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
    // Also sync to cloud
    supabaseService.upsertUser(admin).catch(console.error);

    // 2. SEED COURSES (Additive)
    const existingCourses = storage.getCourses();
    const activeSemId = settings.activeSemesterId || 'sem-default';
    const newCoursesList = [
      { id: "c1", code: "BUS101", ar: "إدارة الأعمال الدولية", en: "Intl Business Admin" },
      { id: "c2", code: "RSK101", ar: "إدارة الخطر والتأمين", en: "Risk & Insurance" },
      { id: "c3", code: "HSE101", ar: "إدارة الصحة والسلامة المهنية", en: "Health & Safety" },
      { id: "c4", code: "OPR101", ar: "إدارة العمليات والإنتاج", en: "Ops & Production" },
      { id: "c5", code: "PR101", ar: "إدارة العلاقات العامة", en: "Public Relations" },
      { id: "c6", code: "FAC101", ar: "إدارة المنشآت المتخصصة", en: "Facility Mgmt" },
      { id: "c7", code: "HRM101", ar: "إدارة الموارد البشرية", en: "HR Mgmt" },
      { id: "c8", code: "SCM101", ar: "إدارة سلسلة الإمداد", en: "Supply Chain Mgmt" },
      { id: "c9", code: "CRM101", ar: "إدارة النزاعات والأزمات", en: "Conflict & Crisis" },
      { id: "c10", code: "STR101", ar: "إدارة مشتريات ومخازن", en: "Procurement Mgmt" },
      { id: "c11", code: "MGT401", ar: "الإدارة الاستراتيجية", en: "Strategic Mgmt" },
      { id: "c12", code: "LAW101", ar: "البيئة القانونية للأعمال", en: "Legal Env" },
      { id: "c13", code: "OD101", ar: "التغيير والتطوير التنظيمي", en: "Org Dev" },
      { id: "c14", code: "ISL101", ar: "الثقافة الإسلامية 1", en: "Islamic Culture 1" },
      { id: "c15", code: "ISL102", ar: "الثقافة الإسلامية 2", en: "Islamic Culture 2" },
      { id: "c16", code: "MKT201", ar: "التسويق الإلكتروني", en: "E-Marketing" },
      { id: "c17", code: "GOV101", ar: "حوكمة الشركات والمنظمات", en: "Corp Governance" },
      { id: "c18", code: "FEAS101", ar: "دراسة الجدوى وتقييم المشاريع", en: "Feasibility Study" },
      { id: "c19", code: "ENT101", ar: "ريادة الأعمال والمشاريع الصغيرة", en: "Entrepreneurship" },
      { id: "c20", code: "OB101", ar: "السلوك التنظيمي", en: "Org Behavior" },
      { id: "c21", code: "ENG101", ar: "اللغة الإنجليزية 1", en: "English 1" },
      { id: "c22", code: "ENG102", ar: "اللغة الإنجليزية 2", en: "English 2" },
      { id: "c23", code: "ARA101", ar: "اللغة العربية 1", en: "Arabic 1" },
      { id: "c24", code: "ARA102", ar: "اللغة العربية 2", en: "Arabic 2" },
      { id: "c25", code: "ACC201", ar: "المحاسبة الإدارية", en: "Managerial Acc" },
      { id: "c26", code: "BNK201", ar: "المصارف الإسلامية المعاصرة", en: "Islamic Banking" },
      { id: "c27", code: "SKL101", ar: "المهارات الإدارية", en: "Mgmt Skills" },
      { id: "c28", code: "ACC301", ar: "محاسبة مالية متقدمة", en: "Adv Financial Acc" },
      { id: "c29", code: "STAT101", ar: "مبادئ الإحصاء", en: "Stats Principles" },
      { id: "c30", code: "MGT101", ar: "مبادئ إدارة الأعمال", en: "Business Principles" },
      { id: "c31", code: "ECO101", ar: "مبادئ الاقتصاد الإسلامي", en: "Islamic Eco" },
      { id: "c32", code: "ECO102", ar: "مبادئ الاقتصاد الكلي", en: "Macro Eco" },
      { id: "c33", code: "ECO103", ar: "مبادئ اقتصاد جزئي", en: "Micro Eco" },
      { id: "c34", code: "MKT101", ar: "مبادئ التسويق", en: "Marketing Principles" },
      { id: "c35", code: "FIN101", ar: "مبادئ التمويل والاستثمار", en: "Finance & Invest" },
      { id: "c36", code: "ACC101", ar: "مبادئ محاسبة مالية", en: "Financial Acc" },
      { id: "c37", code: "MIS101", ar: "مبادئ نظم المعلومات الإدارية", en: "MIS Principles" },
      { id: "c38", code: "FIS101", ar: "نظم المعلومات المالية", en: "FIS" },
      { id: "c39", code: "MON101", ar: "نقود وبنوك", en: "Money & Banking" }
    ];

    let updatedCourses = [...existingCourses];
    newCoursesList.forEach(nc => {
      if (!updatedCourses.find(c => c.code === nc.code)) {
        updatedCourses.push({
          id: nc.id,
          code: nc.code,
          title: nc.en,
          title_ar: nc.ar,
          credits: 3,
          doctor: "TBD",
          day: "Sunday",
          time: "10:00 - 12:00",
          isRegistrationEnabled: true,
          semesterId: activeSemId
        });
      }
    });
    storage.setCourses(updatedCourses);
  }
};
