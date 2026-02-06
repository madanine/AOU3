
import { User, Course, Enrollment, SiteSettings, Semester, Assignment, Submission, AttendanceRecord, AttendanceRow, ParticipationRecord, ParticipationRow, Language } from './types';
import { supabaseService } from './supabaseService';
import { supabase } from './supabase';
import { DEFAULT_SETTINGS } from './constants';

const KEYS = {
  USERS: 'aou_users',
  COURSES: 'aou_courses',
  ENROLLMENTS: 'aou_enrollments',
  SETTINGS: 'aou_settings',
  AUTH_USER: 'aou_current_user',
  LANGUAGE: 'aou_lang',
  ATTENDANCE: 'aou_attendance',
  PARTICIPATION: 'aou_participation',
  SEMESTERS: 'aou_semesters',
  ASSIGNMENTS: 'aou_assignments',
  SUBMISSIONS: 'aou_submissions'
};

type Listener = () => void;
const listeners: Listener[] = [];
const notify = () => listeners.forEach(l => l());


export const storage = {
  // Sync logic
  async syncFromSupabase() {
    try {
      const [users, courses, enrollments, settings, semesters, assignments, submissions, attendance, participation] = await Promise.all([
        supabaseService.getUsers(),
        supabaseService.getCourses(),
        supabaseService.getEnrollments(),
        supabaseService.getSettings(),
        supabaseService.getSemesters(),
        supabaseService.getAssignments(),
        supabaseService.getSubmissions(),
        supabaseService.getAttendance(),
        supabaseService.getParticipation()
      ]);

      if (users) {
        const localUsers = storage.getUsers();
        // Merge strategy for users can stay or be strict. For now, let's keep merge to be safe for current user.
        const merged = [...users];
        localUsers.forEach(lu => {
          if (!merged.find(ru => ru.universityId === lu.universityId)) {
            merged.push(lu);
          }
        });
        localStorage.setItem(KEYS.USERS, JSON.stringify(merged));
      }
      if (courses) localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
      if (enrollments) localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
      if (settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      if (semesters) localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters));
      if (assignments) localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
      if (submissions) localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions));

      if (attendance) {
        // Convert Row[] to Map
        const map: AttendanceRecord = {};
        attendance.forEach((r: AttendanceRow) => {
          if (!map[r.courseId]) map[r.courseId] = {};
          if (!map[r.courseId][r.studentId]) map[r.courseId][r.studentId] = Array(12).fill(null);
          if (r.lectureIndex >= 0 && r.lectureIndex < 12) {
            map[r.courseId][r.studentId][r.lectureIndex] = r.status;
          }
        });
        localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(map));
      }

      if (participation) {
        // Convert Row[] to Map
        const map: ParticipationRecord = {};
        participation.forEach((r: ParticipationRow) => {
          if (!map[r.courseId]) map[r.courseId] = {};
          if (!map[r.courseId][r.studentId]) map[r.courseId][r.studentId] = Array(12).fill(null);
          if (r.lectureIndex >= 0 && r.lectureIndex < 12) {
            map[r.courseId][r.studentId][r.lectureIndex] = r.status;
          }
        });
        localStorage.setItem(KEYS.PARTICIPATION, JSON.stringify(map));
      }

      notify();
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
  deleteUser: async (userId: string) => {
    let users = storage.getUsers();
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    await supabaseService.deleteUser(userId).catch(() => { });
    return users;
  },

  getCourses: (): Course[] => JSON.parse(localStorage.getItem(KEYS.COURSES) || '[]'),
  setCourses: (courses: Course[], sync = true) => {
    localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
    if (sync) {
      courses.forEach(c => supabaseService.upsertCourse(c).catch(err => console.error('Sync Course Error:', err)));
    }
  },
  saveCourse: async (course: Course) => {
    let courses = storage.getCourses();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id)) {
      course.id = crypto.randomUUID();
    }
    const index = courses.findIndex(c => c.code === course.code);
    if (index > -1) {
      courses[index] = course;
    } else {
      courses.push(course);
    }
    localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
    await supabaseService.upsertCourse(course).catch(err => console.error('Save Course Error:', err));
    return courses;
  },
  deleteCourse: async (courseId: string) => {
    let courses = storage.getCourses();
    courses = courses.filter(c => c.id !== courseId);
    localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
    await supabaseService.deleteCourse(courseId).catch(() => { });
    return courses;
  },

  getEnrollments: (): Enrollment[] => JSON.parse(localStorage.getItem(KEYS.ENROLLMENTS) || '[]'),
  setEnrollments: (enrollments: Enrollment[]) => {
    localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
    enrollments.forEach(e => supabaseService.upsertEnrollment(e).catch(err => {
      console.error('Failed to save enrollment to Supabase:', err);
    }));
  },
  saveEnrollment: async (enrollment: Enrollment) => {
    let enrollments = storage.getEnrollments();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enrollment.id)) {
      enrollment.id = crypto.randomUUID();
    }
    enrollments.push(enrollment);
    localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
    await supabaseService.upsertEnrollment(enrollment).catch(() => { });
    return enrollments;
  },
  deleteEnrollment: async (id: string) => {
    let enrollments = storage.getEnrollments();
    enrollments = enrollments.filter(e => e.id !== id);
    localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
    await supabaseService.deleteEnrollment(id).catch(() => { });
    return enrollments;
  },

  getSettings: (): SiteSettings => {
    const stored = localStorage.getItem(KEYS.SETTINGS);
    if (!stored) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(stored);
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

  getLanguage: (): Language => (localStorage.getItem(KEYS.LANGUAGE) as Language) || 'AR',
  setLanguage: (lang: Language) => {
    localStorage.setItem(KEYS.LANGUAGE, lang);
    document.documentElement.lang = lang.toLowerCase();
  },

  getAttendance: (): AttendanceRecord => JSON.parse(localStorage.getItem(KEYS.ATTENDANCE) || '{}'),

  setAttendance: (recordMap: AttendanceRecord) => {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(recordMap));
    notify();

    // Convert Map to Rows for Supabase
    const rows: { courseId: string; studentId: string; lectureIndex: number; status: boolean; }[] = [];
    const deletions: { courseId: string; studentId: string; lectureIndex: number; }[] = [];

    Object.entries(recordMap).forEach(([cId, students]) => {
      Object.entries(students).forEach(([sId, attendanceArr]) => {
        attendanceArr.forEach((status, idx) => {
          if (status !== null) {
            rows.push({ courseId: cId, studentId: sId, lectureIndex: idx, status });
          } else {
            // Track nulls for deletion
            deletions.push({ courseId: cId, studentId: sId, lectureIndex: idx });
          }
        });
      });
    });

    // Upsert non-null values
    rows.forEach(r => supabaseService.upsertAttendance(r).catch(() => { }));
    // Delete null values
    deletions.forEach(d => supabaseService.deleteAttendance(d.courseId, d.studentId, d.lectureIndex).catch(() => { }));
  },

  // Note: syncFromSupabase handles the reverse conversion (Row -> Map)

  getParticipation: (): ParticipationRecord => JSON.parse(localStorage.getItem(KEYS.PARTICIPATION) || '{}'),

  setParticipation: (recordMap: ParticipationRecord) => {
    localStorage.setItem(KEYS.PARTICIPATION, JSON.stringify(recordMap));
    notify();

    // Convert Map to Rows for Supabase
    const rows: { courseId: string; studentId: string; lectureIndex: number; status: boolean; }[] = [];
    const deletions: { courseId: string; studentId: string; lectureIndex: number; }[] = [];

    Object.entries(recordMap).forEach(([cId, students]) => {
      Object.entries(students).forEach(([sId, participationArr]) => {
        participationArr.forEach((status, idx) => {
          if (status !== null) {
            rows.push({ courseId: cId, studentId: sId, lectureIndex: idx, status });
          } else {
            // Track nulls for deletion
            deletions.push({ courseId: cId, studentId: sId, lectureIndex: idx });
          }
        });
      });
    });

    // Upsert non-null values
    rows.forEach(r => supabaseService.upsertParticipation(r).catch(() => { }));
    // Delete null values
    deletions.forEach(d => supabaseService.deleteParticipation(d.courseId, d.studentId, d.lectureIndex).catch(() => { }));
  },

  getSemesters: (): Semester[] => JSON.parse(localStorage.getItem(KEYS.SEMESTERS) || '[]'),
  setSemesters: (semesters: Semester[]) => {
    localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters));
    semesters.forEach(s => supabaseService.upsertSemester(s).catch(err => console.error('Set Semesters Error:', err)));
  },
  saveSemester: async (semester: Semester) => {
    let semesters = storage.getSemesters();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(semester.id)) {
      semester.id = crypto.randomUUID();
    }
    const index = semesters.findIndex(s => s.id === semester.id);
    if (index > -1) semesters[index] = semester;
    else semesters.push(semester);
    localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters));
    await supabaseService.upsertSemester(semester).catch(err => console.error('Save Semester Error:', err));
    return semesters;
  },
  deleteSemester: async (id: string) => {
    let semesters = storage.getSemesters();
    semesters = semesters.filter(s => s.id !== id);
    localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters));
    await supabaseService.deleteSemester(id).catch(() => { });
    return semesters;
  },

  getAssignments: (): Assignment[] => JSON.parse(localStorage.getItem(KEYS.ASSIGNMENTS) || '[]'),
  setAssignments: (assignments: Assignment[]) => {
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    // Sync each assignment to Supabase
    assignments.forEach(a => supabaseService.upsertAssignment(a).catch(err => {
      console.error('Failed to save assignment to Supabase:', err);
    }));
  },
  saveAssignment: async (assignment: Assignment) => {
    let assignments = storage.getAssignments();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignment.id)) {
      assignment.id = crypto.randomUUID();
    }
    const index = assignments.findIndex(a => a.id === assignment.id);
    if (index > -1) assignments[index] = assignment;
    else assignments.push(assignment);
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    await supabaseService.upsertAssignment(assignment).catch(err => {
      console.error('Failed to save assignment to Supabase:', err);
    });
    return assignments;
  },
  deleteAssignment: async (id: string) => {
    let assignments = storage.getAssignments();
    assignments = assignments.filter(a => a.id !== id);
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    await supabaseService.deleteAssignment(id).catch(() => { });
    return assignments;
  },

  getSubmissions: (): Submission[] => JSON.parse(localStorage.getItem(KEYS.SUBMISSIONS) || '[]'),
  setSubmissions: (submissions: Submission[]) => {
    localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions));
    // Sync each submission to Supabase
    submissions.forEach(s => supabaseService.upsertSubmission(s).catch(err => {
      console.error('Failed to save submission to Supabase:', err);
    }));
  },
  saveSubmission: async (submission: Submission) => {
    let submissions = storage.getSubmissions();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submission.id)) {
      submission.id = crypto.randomUUID();
    }
    const index = submissions.findIndex(s => s.id === submission.id);
    if (index > -1) submissions[index] = submission;
    else submissions.push(submission);
    localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions));
    await supabaseService.upsertSubmission(submission).catch(err => {
      console.error('Failed to save submission to Supabase:', err);
    });
    return submissions;
  },
  deleteSubmission: async (id: string) => {
    let submissions = storage.getSubmissions();
    submissions = submissions.filter(s => s.id !== id);
    localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions));
    await supabaseService.deleteSubmission(id).catch(() => { });
    return submissions;
  },

  seed: () => {
    let semesters = storage.getSemesters();
    let settings = storage.getSettings();

    if (semesters.length === 0) {
      // Do not create default semester locally if empty. 
      // Admin must create one, or we fetch from Supabase.
      // Keeping this empty allows "No Semester" state until admin acts or sync happens.
    }

    const activeSemId = settings.activeSemesterId || '00000000-0000-0000-0000-000000000010';

    // Purge requests: Remove all courses initially to allow manual entry
    // Seed admin if not exists
    const admin = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'aouadmin@aou.edu',
      password: 'Aou@676',
      fullName: 'AOU Administrator',
      role: 'admin' as const,
      universityId: 'aouadmin',
      fullAccess: true,
      createdAt: '2026-02-01T00:00:00.000Z'
    };

    let users = storage.getUsers();
    if (!users.find(u => u.universityId === admin.universityId)) {
      users.push(admin);
      storage.setUsers(users);
    }
  },

  subscribe: (listener: Listener) => {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    }
  },

  initRealtime: () => {
    supabase.channel('public_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, async () => {
        // Simple strategy: refetch all on any change. 
        // Can be optimized to fetch only changed table.
        // For now, full sync ensures consistency.
        console.log('Realtime change detected, syncing...');
        await storage.syncFromSupabase();
        notify();
      })
      .subscribe();
  }
};
