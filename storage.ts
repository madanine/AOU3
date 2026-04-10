
import { User, Course, Enrollment, SiteSettings, Semester, Assignment, Submission, AttendanceRecord, AttendanceRow, ParticipationRecord, ParticipationRow, Language } from './types';
import { supabaseService } from './supabaseService';
import { supabase } from './supabase';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from './constants';

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
  isInitialized: false,

  // Sync logic
  async syncFromSupabase() {
    try {
      const currentUser = storage.getAuthUser();
      const isStudent = currentUser?.role === 'student';

      const [users, courses, enrollments, settings, semesters, assignments, submissions, attendance, participation] = await Promise.all([
        supabaseService.getUsers(),
        supabaseService.getCourses(),
        supabaseService.getEnrollments(),
        supabaseService.getSettings(),
        supabaseService.getSemesters(),
        supabaseService.getAssignments(),
        isStudent ? supabaseService.getSubmissions(currentUser.id) : Promise.resolve([]),
        supabaseService.getAttendance(),
        supabaseService.getParticipation()
      ]);

      if (users) {
        // STRICT SYNC: Overwrite local with remote. Deletions in DB must reflect locally.
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      }
      if (courses) localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
      if (enrollments) localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
      if (settings) {
        const stampedSettings = { ...settings, settingsVersion: SETTINGS_VERSION };
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(stampedSettings));
        // ── activeSemesterId preservation ──────────────────────────────────────
        // The version gate in getSettings() may reset settings to DEFAULT_SETTINGS
        // which has no activeSemesterId, discarding what we just wrote from the DB.
        // Re-read and patch so activeSemesterId is never lost through a gate reset.
        const verified = storage.getSettings();
        if (settings.activeSemesterId && !verified.activeSemesterId) {
          const patched = {
            ...verified,
            activeSemesterId: settings.activeSemesterId,
            defaultSemesterId: settings.defaultSemesterId ?? verified.defaultSemesterId,
          };
          localStorage.setItem(KEYS.SETTINGS, JSON.stringify(patched));
        }
      }

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

      storage.isInitialized = true;
      notify();
      return settings || storage.getSettings();
    } catch (e: any) {
      console.error('Failed to sync initial data:', e);
      alert('Sync Error details: ' + (e?.message || JSON.stringify(e)));
      storage.isInitialized = true;
      notify();
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
    await supabaseService.upsertUser(user);
    return users;
  },
  deleteUser: async (userId: string) => {
    // Cloud-first: Delete from DB first
    await supabaseService.deleteUser(userId);

    // Then update local
    let users = storage.getUsers();
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

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
    // Cloud-first: Delete from DB first
    await supabaseService.deleteEnrollment(id);

    // Then update local
    let enrollments = storage.getEnrollments();
    enrollments = enrollments.filter(e => e.id !== id);
    localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));

    return enrollments;
  },

  getSettings: (): SiteSettings => {
    const stored = localStorage.getItem(KEYS.SETTINGS);
    if (!stored) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(stored);

      // ── Version Gate ───────────────────────────────────────────────────────
      // If the stored settings predate the current design system version,
      // discard them entirely and fall back to DEFAULT_SETTINGS.
      // This is the only migration mechanism — no per-field color inspection.
      if (!parsed.settingsVersion || parsed.settingsVersion !== SETTINGS_VERSION) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      // ── End Version Gate ───────────────────────────────────────────────────

      if (!parsed.theme || !parsed.branding) return DEFAULT_SETTINGS;
      return parsed;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },
  setSettings: (settings: SiteSettings) => {
    // Always stamp the current version so the version-gate never resets valid settings.
    const versioned: SiteSettings = { ...settings, settingsVersion: SETTINGS_VERSION };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(versioned));
    supabaseService.updateSettings(versioned).catch(() => { });
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

  setAttendance: async (recordMap: AttendanceRecord): Promise<void> => {
    // 1. Get current state to calculate diff
    const previous = storage.getAttendance();
    
    // 2. Update local storage and notify UI immediately (optimistic update)
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(recordMap));
    notify();

    // Guard: Prevent saving to server if initialization/sync isn't finished.
    if (!storage.isInitialized) return;

    // 3. Identify changes and group them
    const allUpserts: AttendanceRow[] = [];
    // FIX: Store studentId in the object directly — never split a UUID string.
    const deletionsByStudent: Record<string, { courseId: string, studentId: string, indices: number[] }> = {};

    Object.entries(recordMap).forEach(([cId, students]) => {
      Object.entries(students).forEach(([sId, attendanceArr]) => {
        attendanceArr.forEach((status, idx) => {
          const prevStatus = previous[cId]?.[sId]?.[idx] ?? null;
          
          if (status !== prevStatus) {
            if (status !== null) {
              allUpserts.push({ courseId: cId, studentId: sId, lectureIndex: idx, status });
            } else {
              const key = `${cId}:::${sId}`;
              if (!deletionsByStudent[key]) deletionsByStudent[key] = { courseId: cId, studentId: sId, indices: [] };
              deletionsByStudent[key].indices.push(idx);
            }
          }
        });
      });
    });

    // 4 & 5. Await all Supabase operations so errors propagate to the caller.
    // This is critical — previously these were fire-and-forget which caused
    // silent failures where the toast showed "Saved" but nothing reached the DB.
    await Promise.all([
      ...Object.values(deletionsByStudent).map(data =>
        supabaseService.bulkDeleteAttendance(data.courseId, data.studentId, data.indices)
      ),
      ...(allUpserts.length > 0 ? [supabaseService.bulkUpsertAttendance(allUpserts)] : [])
    ]);
  },

  // Note: syncFromSupabase handles the reverse conversion (Row -> Map)

  getParticipation: (): ParticipationRecord => JSON.parse(localStorage.getItem(KEYS.PARTICIPATION) || '{}'),

  setParticipation: async (recordMap: ParticipationRecord): Promise<void> => {
    // 1. Get current state for diff
    const previous = storage.getParticipation();

    // 2. Update local storage and notify (optimistic update)
    localStorage.setItem(KEYS.PARTICIPATION, JSON.stringify(recordMap));
    notify();

    // Guard: Prevent saving to server if initialization/sync isn't finished.
    if (!storage.isInitialized) return;

    // 3. Identify changes
    const allUpserts: ParticipationRow[] = [];
    // FIX: Store studentId in the object directly — never split a UUID string.
    const deletionsByStudent: Record<string, { courseId: string, studentId: string, indices: number[] }> = {};

    Object.entries(recordMap).forEach(([cId, students]) => {
      Object.entries(students).forEach(([sId, participationArr]) => {
        participationArr.forEach((status, idx) => {
          const prevStatus = previous[cId]?.[sId]?.[idx] ?? null;

          if (status !== prevStatus) {
            if (status !== null) {
              allUpserts.push({ courseId: cId, studentId: sId, lectureIndex: idx, status });
            } else {
              const key = `${cId}:::${sId}`;
              if (!deletionsByStudent[key]) deletionsByStudent[key] = { courseId: cId, studentId: sId, indices: [] };
              deletionsByStudent[key].indices.push(idx);
            }
          }
        });
      });
    });

    // 4 & 5. Await all Supabase operations — errors now propagate to the caller.
    await Promise.all([
      ...Object.values(deletionsByStudent).map(data =>
        supabaseService.bulkDeleteParticipation(data.courseId, data.studentId, data.indices)
      ),
      ...(allUpserts.length > 0 ? [supabaseService.bulkUpsertParticipation(allUpserts)] : [])
    ]);
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
    // We only listen to site_settings changes globally to avoid massive Disk IO
    // and infinite data-fetching loops when other tables (like submissions) are updated.
    supabase.channel('public_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, async () => {
        const settings = await supabaseService.getSettings();
        if (settings) {
          storage.setSettings(settings);
          notify();
        }
      })
      .subscribe();
  }
};

// Cross-tab synchronization for instant updates on the same browser device
window.addEventListener('storage', (e) => {
  if (e.key && Object.values(KEYS).includes(e.key)) {
    notify();
  }
});
