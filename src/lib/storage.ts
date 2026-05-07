
import { User, Course, Enrollment, SiteSettings, Semester, Assignment, Submission, AttendanceRecord, AttendanceRow, ParticipationRecord, ParticipationRow, Language } from '@/types';
import { supabaseService } from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '@/lib/constants';

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
// Global flag: blocks _syncSecondaryData from overwriting attendance/participation
// during active save operations to prevent race conditions.
let _blockAttendanceSync = false;
const notify = () => listeners.forEach(l => l());


// Promise Deduplication: all concurrent callers share the same in-flight Promise.
// This is immune to notify() re-entry because the reference is captured before any notify fires.
let _syncPromise: Promise<SiteSettings | undefined> | null = null;
let _settingsCache: SiteSettings | null = null;
let _settingsCacheTime: number = 0;

export const storage = {
  isInitialized: false,

  // Sync logic
  syncFromSupabase(): Promise<SiteSettings | undefined> {
    // If a sync is already in-flight, return the same Promise — no duplicate requests.
    if (_syncPromise) return _syncPromise;

    _syncPromise = (async () => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sync timeout: network took > 30s')), 30_000)
      );

      try {
        const currentUser = storage.getAuthUser();
        const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';
        const isStudent = currentUser?.role === 'student';

        if (!isAdmin) {
          const lastSync = localStorage.getItem('last_sync_time');
          const twoMinutes = 2 * 60 * 1000;
          if (lastSync && Date.now() - parseInt(lastSync) < twoMinutes) {
            storage.isInitialized = true;
            notify();
            return storage.getSettings();
          }
        }

        const phase1Promises: Promise<any>[] = [
          supabaseService.getSettings(),
          supabaseService.getCourses(),
          supabaseService.getSemesters(),
        ];

        if (isStudent && currentUser?.id) {
          phase1Promises.push(supabaseService.getEnrollments(currentUser.id));
        }

        const results = await Promise.race([
          Promise.all(phase1Promises),
          timeout,
        ]);

        const settings = results[0];
        const courses = results[1];
        const semesters = results[2];
        const studentEnrollments = isStudent ? results[3] : null;

        if (settings) {
          const stampedSettings = { ...settings, settingsVersion: SETTINGS_VERSION };
          localStorage.setItem(KEYS.SETTINGS, JSON.stringify(stampedSettings));
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
        if (courses) localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
        if (semesters) localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters));
        if (studentEnrollments) localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(studentEnrollments));

        storage.isInitialized = true;
        localStorage.setItem('last_sync_time', Date.now().toString());
        notify();

        storage._syncSecondaryData(currentUser, isAdmin).catch(e =>
          console.error('Secondary sync failed (non-critical):', e)
        );

        return settings || storage.getSettings();
      } catch (e: any) {
        console.error('Failed to sync initial data:', e);
        storage.isInitialized = true;
        notify();
        return storage.getSettings();
      } finally {
        _syncPromise = null;
      }
    })();

    return _syncPromise;
  },

  // Secondary (non-critical) data sync — runs after initial render
  async _syncSecondaryData(currentUser: User | null, isAdmin: boolean) {
    const assignments = await supabaseService.getAssignments();
    if (assignments) localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));

    if (currentUser) {
      const isStudent = currentUser.role === 'student';

      const [users, enrollments, submissions] = await Promise.all([
        isAdmin
          ? supabaseService.getUsers()
          : (currentUser.id ? supabaseService.getProfile(currentUser.id).then(p => p ? [p] : []) : Promise.resolve([])),
        isAdmin ? supabaseService.getEnrollments() : Promise.resolve(null),
        isStudent ? supabaseService.getSubmissions(currentUser.id, undefined, true) : Promise.resolve([]),
      ]);

      if (users) {
        const localUsers = storage.getUsers();
        const merged = users.map(remoteUser => {
          const local = localUsers.find(u => u.id === remoteUser.id);
          if (local && local.password && local.password !== remoteUser.password) {
            return { ...remoteUser, password: local.password };
          }
          return remoteUser;
        });
        localStorage.setItem(KEYS.USERS, JSON.stringify(merged));
      }
      if (isAdmin && enrollments) localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
      if (submissions) localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions));

      // NOTE: attendance/participation are NOT fetched here intentionally.
      // Supabase has a 1000-row server limit per request which corrupts large datasets.
      // attendance/participation are fetched per-course via syncAttendanceForCourse()
      // when the user selects a course — this is the correct and safe approach.

      notify();
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
    await supabaseService.deleteUser(userId);
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
    await supabaseService.deleteEnrollment(id);
    let enrollments = storage.getEnrollments();
    enrollments = enrollments.filter(e => e.id !== id);
    localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
    return enrollments;
  },

  getSettings: (): SiteSettings => {
    if (_settingsCache && Date.now() - _settingsCacheTime < 300000) {
      return _settingsCache;
    }
    const stored = localStorage.getItem(KEYS.SETTINGS);
    if (!stored) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.settingsVersion || parsed.settingsVersion !== SETTINGS_VERSION) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      if (!parsed.theme || !parsed.branding) return DEFAULT_SETTINGS;
      _settingsCache = parsed;
      _settingsCacheTime = Date.now();
      return parsed;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },
  setSettings: (settings: SiteSettings) => {
    const versioned: SiteSettings = { ...settings, settingsVersion: SETTINGS_VERSION };
    const current = localStorage.getItem(KEYS.SETTINGS);
    const currentParsed = current ? JSON.parse(current) : null;
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(versioned));
    _settingsCache = versioned;
    _settingsCacheTime = Date.now();
    if (JSON.stringify(currentParsed) !== JSON.stringify(versioned)) {
      supabaseService.updateSettings(versioned).catch(() => {});
    }
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

  syncAttendanceForCourse: async (courseId: string) => {
    try {
      const rows = await supabaseService.getAttendance(undefined, courseId);
      const current = storage.getAttendance();
      const courseMap: Record<string, (boolean | null)[]> = {};
      rows.forEach(r => {
        if (!courseMap[r.studentId]) courseMap[r.studentId] = Array(12).fill(null);
        if (r.lectureIndex >= 0 && r.lectureIndex < 12) {
          courseMap[r.studentId][r.lectureIndex] = r.status;
        }
      });
      const updated = { ...current, [courseId]: courseMap };
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(updated));
      notify();
      return updated;
    } catch (e) {
      console.error('Failed to sync course attendance:', e);
      return storage.getAttendance();
    }
  },

  setAttendance: async (recordMap: AttendanceRecord): Promise<void> => {
    // 1. Optimistic update
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(recordMap));
    notify();

    if (!storage.isInitialized) return;

    // 2. Block _syncSecondaryData from overwriting during this save
    _blockAttendanceSync = true;

    // 3. FULL-REPLACE strategy: send ALL non-null records to Supabase.
    // This avoids diff bugs where stale localStorage causes 0 calculated changes.
    const allUpserts: AttendanceRow[] = [];
    const allDeletions: Array<{ courseId: string; studentId: string; indices: number[] }> = [];

    Object.entries(recordMap).forEach(([cId, students]) => {
      Object.entries(students).forEach(([sId, attendanceArr]) => {
        const deleteIndices: number[] = [];
        attendanceArr.forEach((status, idx) => {
          if (status !== null) {
            allUpserts.push({ courseId: cId, studentId: sId, lectureIndex: idx, status });
          } else {
            deleteIndices.push(idx);
          }
        });
        if (deleteIndices.length > 0) {
          allDeletions.push({ courseId: cId, studentId: sId, indices: deleteIndices });
        }
      });
    });

    try {
      await Promise.all([
        ...allDeletions.map(data =>
          supabaseService.bulkDeleteAttendance(data.courseId, data.studentId, data.indices)
        ),
        ...(allUpserts.length > 0 ? [supabaseService.bulkUpsertAttendance(allUpserts)] : [])
      ]);
    } finally {
      // Release the block after 6 seconds to outlast the Realtime 3s delayed callback
      setTimeout(() => { _blockAttendanceSync = false; }, 6000);
    }
  },

  getParticipation: (): ParticipationRecord => JSON.parse(localStorage.getItem(KEYS.PARTICIPATION) || '{}'),

  syncParticipationForCourse: async (courseId: string) => {
    try {
      const rows = await supabaseService.getParticipation(undefined, courseId);
      const current = storage.getParticipation();
      const courseMap: Record<string, (boolean | null)[]> = {};
      rows.forEach(r => {
        if (!courseMap[r.studentId]) courseMap[r.studentId] = Array(12).fill(null);
        if (r.lectureIndex >= 0 && r.lectureIndex < 12) {
          courseMap[r.studentId][r.lectureIndex] = r.status;
        }
      });
      const updated = { ...current, [courseId]: courseMap };
      localStorage.setItem(KEYS.PARTICIPATION, JSON.stringify(updated));
      notify();
      return updated;
    } catch (e) {
      console.error('Failed to sync course participation:', e);
      return storage.getParticipation();
    }
  },

  syncStudentAttendance: async (studentId: string) => {
    try {
      const [attRows, partRows] = await Promise.all([
        supabaseService.getAttendance(studentId),
        supabaseService.getParticipation(studentId)
      ]);

      const attMap = storage.getAttendance();
      attRows.forEach(r => {
        if (!attMap[r.courseId]) attMap[r.courseId] = {};
        if (!attMap[r.courseId][r.studentId]) attMap[r.courseId][r.studentId] = Array(12).fill(null);
        if (r.lectureIndex >= 0 && r.lectureIndex < 12) {
          attMap[r.courseId][r.studentId][r.lectureIndex] = r.status;
        }
      });
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attMap));

      const partMap = storage.getParticipation();
      partRows.forEach(r => {
        if (!partMap[r.courseId]) partMap[r.courseId] = {};
        if (!partMap[r.courseId][r.studentId]) partMap[r.courseId][r.studentId] = Array(12).fill(null);
        if (r.lectureIndex >= 0 && r.lectureIndex < 12) {
          partMap[r.courseId][r.studentId][r.lectureIndex] = r.status;
        }
      });
      localStorage.setItem(KEYS.PARTICIPATION, JSON.stringify(partMap));

      notify();
    } catch (e) {
      console.error('Student attendance sync failed:', e);
    }
  },

  setParticipation: async (recordMap: ParticipationRecord): Promise<void> => {
    // 1. Optimistic update
    localStorage.setItem(KEYS.PARTICIPATION, JSON.stringify(recordMap));
    notify();

    if (!storage.isInitialized) return;

    // 2. Block _syncSecondaryData from overwriting during this save
    _blockAttendanceSync = true;

    // 3. FULL-REPLACE strategy
    const allUpserts: ParticipationRow[] = [];
    const allDeletions: Array<{ courseId: string; studentId: string; indices: number[] }> = [];

    Object.entries(recordMap).forEach(([cId, students]) => {
      Object.entries(students).forEach(([sId, participationArr]) => {
        const deleteIndices: number[] = [];
        participationArr.forEach((status, idx) => {
          if (status !== null) {
            allUpserts.push({ courseId: cId, studentId: sId, lectureIndex: idx, status });
          } else {
            deleteIndices.push(idx);
          }
        });
        if (deleteIndices.length > 0) {
          allDeletions.push({ courseId: cId, studentId: sId, indices: deleteIndices });
        }
      });
    });

    try {
      await Promise.all([
        ...allDeletions.map(data =>
          supabaseService.bulkDeleteParticipation(data.courseId, data.studentId, data.indices)
        ),
        ...(allUpserts.length > 0 ? [supabaseService.bulkUpsertParticipation(allUpserts)] : [])
      ]);
    } finally {
      // Release the block after 6 seconds to outlast the Realtime 3s delayed callback
      setTimeout(() => { _blockAttendanceSync = false; }, 6000);
    }
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

    if (semesters.length === 0) { }

    const activeSemId = settings.activeSemesterId || '00000000-0000-0000-0000-000000000010';

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
    const userRole = storage.getAuthUser()?.role;
    if (userRole === 'student') return;

    const existingChannels = supabase.getChannels();
    if (existingChannels.some(ch => ch.topic === 'realtime:public_db_changes')) return;

    let syncTimeout: NodeJS.Timeout;
    supabase.channel('public_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
          // Don't sync if a save is in progress — it would overwrite the new data
          if (!_blockAttendanceSync) {
            await storage.syncFromSupabase();
          }
        }, 3000);
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
