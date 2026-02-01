
import { User, Course, Enrollment, SiteSettings, Semester, Assignment, Submission, AttendanceRecord } from './types';
import { supabaseService } from './supabaseService';
import { DEFAULT_SETTINGS } from './constants';

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
      const [users, courses, enrollments, settings, semesters, assignments, submissions] = await Promise.all([
        supabaseService.getUsers(),
        supabaseService.getCourses(),
        supabaseService.getEnrollments(),
        supabaseService.getSettings(),
        supabaseService.getSemesters(),
        supabaseService.getAssignments(),
        supabaseService.getSubmissions()
      ]);

      if (users && users.length > 0) {
        const localUsers = storage.getUsers();
        const merged = [...users];
        localUsers.forEach(lu => {
          if (!merged.find(ru => ru.universityId === lu.universityId)) {
            merged.push(lu);
          }
        });
        localStorage.setItem(KEYS.USERS, JSON.stringify(merged));
      }
      if (courses && courses.length > 0) localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
      if (enrollments && enrollments.length > 0) localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
      if (settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      if (semesters && semesters.length > 0) localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters));
      if (assignments && assignments.length > 0) localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
      if (submissions && submissions.length > 0) localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions));

      return settings || storage.getSettings();
    } catch (err) {
      console.warn('Silent sync failure:', err);
      return storage.getSettings();
    }
  },

  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  setUsers: async (users: User[], sync = true) => {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    if (sync) {
      try { await Promise.all(users.map(u => supabaseService.upsertUser(u))); } catch (e) { }
    }
  },
  saveUser: async (user: User) => {
    let users = storage.getUsers();
    // Safety: ensure this user has a valid UUID before saving
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      user.id = crypto.randomUUID();
    }
    const index = users.findIndex(u => u.universityId === user.universityId);
    if (index > -1) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    await supabaseService.upsertUser(user).catch(() => { });
    return users;
  },

  getCourses: (): Course[] => JSON.parse(localStorage.getItem(KEYS.COURSES) || '[]'),
  setCourses: (courses: Course[], sync = true) => {
    localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
    if (sync) {
      courses.forEach(c => supabaseService.upsertCourse(c).catch(() => { }));
    }
  },

  getEnrollments: (): Enrollment[] => JSON.parse(localStorage.getItem(KEYS.ENROLLMENTS) || '[]'),
  setEnrollments: (enrollments: Enrollment[]) => {
    localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
    enrollments.forEach(e => supabaseService.upsertEnrollment(e).catch(() => { }));
  },

  getSettings: (): SiteSettings => {
    const stored = localStorage.getItem(KEYS.SETTINGS);
    if (!stored) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(stored);
      // Ensure critical fields exist
      if (!parsed.theme || !parsed.branding) return DEFAULT_SETTINGS;
      return parsed;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },
  setSettings: (settings: SiteSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    supabaseService.updateSettings(settings).catch(() => { });
  },

  getAuthUser: (): User | null => JSON.parse(localStorage.getItem(KEYS.AUTH_USER) || 'null'),
  setAuthUser: (user: User | null) => localStorage.setItem(KEYS.AUTH_USER, JSON.stringify(user)),
  clearAuth: () => localStorage.removeItem(KEYS.AUTH_USER),

  getLanguage: (): 'AR' | 'EN' => (localStorage.getItem(KEYS.LANGUAGE) as 'AR' | 'EN') || 'AR',
  setLanguage: (lang: 'AR' | 'EN') => {
    localStorage.setItem(KEYS.LANGUAGE, lang);
    document.documentElement.lang = lang.toLowerCase();
  },

  getAttendance: (): AttendanceRecord[] => JSON.parse(localStorage.getItem(KEYS.ATTENDANCE) || '[]'),
  setAttendance: (records: AttendanceRecord[]) => localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records)),

  getSemesters: (): Semester[] => JSON.parse(localStorage.getItem(KEYS.SEMESTERS) || '[]'),
  setSemesters: (semesters: Semester[]) => {
    localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters));
    semesters.forEach(s => supabaseService.upsertSemester(s).catch(() => { }));
  },

  getAssignments: (): Assignment[] => JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS) || '[]'),
  setAssignments: (assignments: Assignment[]) => localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments)),

  getSubmissions: (): Submission[] => JSON.parse(localStorage.getItem(KEYS.SUBMISSIONS) || '[]'),
  setSubmissions: (submissions: Submission[]) => localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions)),

  seed: () => {
    let semesters = storage.getSemesters();
    let settings = storage.getSettings();

    if (semesters.length === 0) {
      const defaultSem = { id: '00000000-0000-0000-0000-000000000010', name: 'FALL 2024', createdAt: new Date().toISOString() };
      semesters = [defaultSem];
      storage.setSemesters(semesters);
      settings.activeSemesterId = defaultSem.id;
      storage.setSettings(settings);
    }

    const admin = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'aouadmin@aou.edu',
      password: 'Aou@676',
      fullName: 'AOU Administrator',
      role: 'admin' as const,
      universityId: 'aouadmin',
      createdAt: '2026-02-01T00:00:00.000Z'
    };

    let users = storage.getUsers();
    if (!users.find(u => u.universityId === admin.universityId)) {
      users.push(admin);
      storage.setUsers(users);
    }
  }
};
