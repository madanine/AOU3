
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
      courses.forEach(c => supabaseService.upsertCourse(c).catch(() => { }));
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
    await supabaseService.upsertCourse(course).catch(() => { });
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
    enrollments.forEach(e => supabaseService.upsertEnrollment(e).catch(() => { }));
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
  saveSemester: async (semester: Semester) => {
    let semesters = storage.getSemesters();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(semester.id)) {
      semester.id = crypto.randomUUID();
    }
    const index = semesters.findIndex(s => s.id === semester.id);
    if (index > -1) semesters[index] = semester;
    else semesters.push(semester);
    localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(semesters));
    await supabaseService.upsertSemester(semester).catch(() => { });
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
  setAssignments: (assignments: Assignment[]) => localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments)),
  saveAssignment: async (assignment: Assignment) => {
    let assignments = storage.getAssignments();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignment.id)) {
      assignment.id = crypto.randomUUID();
    }
    const index = assignments.findIndex(a => a.id === assignment.id);
    if (index > -1) assignments[index] = assignment;
    else assignments.push(assignment);
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    await supabaseService.upsertAssignment(assignment).catch(() => { });
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
  setSubmissions: (submissions: Submission[]) => localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions)),
  saveSubmission: async (submission: Submission) => {
    let submissions = storage.getSubmissions();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submission.id)) {
      submission.id = crypto.randomUUID();
    }
    const index = submissions.findIndex(s => s.id === submission.id);
    if (index > -1) submissions[index] = submission;
    else submissions.push(submission);
    localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(submissions));
    await supabaseService.upsertSubmission(submission).catch(() => { });
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
      const defaultSem = { id: '00000000-0000-0000-0000-000000000010', name: 'FALL 2024', createdAt: new Date().toISOString() };
      semesters = [defaultSem];
      storage.setSemesters(semesters);
      settings.activeSemesterId = defaultSem.id;
      storage.setSettings(settings);
    }

    const activeSemId = settings.activeSemesterId || '00000000-0000-0000-0000-000000000010';

    const allCoursesData = [
      { code: "BUS101", ar: "إدارة الأعمال الدولية", en: "Intl Business Admin" },
      { code: "RSK101", ar: "إدارة الخطر والتأمين", en: "Risk & Insurance" },
      { code: "HSE101", ar: "إدارة الصحة والسلامة المهنية", en: "Health & Safety" },
      { code: "OPR101", ar: "إدارة العمليات والإنتاج", en: "Ops & Production" },
      { code: "PR101", ar: "إدارة العلاقات العامة", en: "Public Relations" },
      { code: "FAC101", ar: "إدارة المنشآت المتخصصة", en: "Facility Mgmt" },
      { code: "HRM101", ar: "إدارة الموارد البشرية", en: "HR Mgmt" },
      { code: "SCM101", ar: "إدارة سلسلة الإمداد", en: "Supply Chain Mgmt" },
      { code: "CRM101", ar: "إدارة النزاعات والأزمات", en: "Conflict & Crisis" },
      { code: "STR101", ar: "إدارة مشتريات ومخازن", en: "Procurement Mgmt" },
      { code: "MGT401", ar: "الإدارة الاستراتيجية", en: "Strategic Mgmt" },
      { code: "LAW101", ar: "البيئة القانونية للأعمال", en: "Legal Env" },
      { code: "OD101", ar: "التغيير والتطوير التنظيمي", en: "Org Dev" },
      { code: "ISL101", ar: "الثقافة الإسلامية 1", en: "Islamic Culture 1" },
      { code: "ISL102", ar: "الثقافة الإسلامية 2", en: "Islamic Culture 2" },
      { code: "MKT201", ar: "التسويق الإلكتروني", en: "E-Marketing" },
      { code: "GOV101", ar: "حوكمة الشركات والمنظمات", en: "Corp Governance" },
      { code: "FEAS101", ar: "دراسة الجدوى وتقييم المشاريع", en: "Feasibility Study" },
      { code: "ENT101", ar: "ريادة الأعمال والمشاريع الصغيرة", en: "Entrepreneurship" },
      { code: "OB101", ar: "السلوك التنظيمي", en: "Org Behavior" },
      { code: "ENG101", ar: "اللغة الإنجليزية 1", en: "English 1" },
      { code: "ENG102", ar: "اللغة الإنجليزية 2", en: "English 2" },
      { code: "ARA101", ar: "اللغة العربية 1", en: "Arabic 1" },
      { code: "ARA102", ar: "اللغة العربية 2", en: "Arabic 2" },
      { code: "ACC201", ar: "المحاسبة الإدارية", en: "Managerial Acc" },
      { code: "BNK201", ar: "المصارف الإسلامية المعاصرة", en: "Islamic Banking" },
      { code: "SKL101", ar: "المهارات الإدارية", en: "Mgmt Skills" },
      { code: "ACC301", ar: "محاسبة مالية متقدمة", en: "Adv Financial Acc" },
      { code: "STAT101", ar: "مبادئ الإحصاء", en: "Stats Principles" },
      { code: "MGT101", ar: "مبادئ إدارة الأعمال", en: "Business Principles" },
      { code: "ECO101", ar: "مبادئ الاقتصاد الإسلامي", en: "Islamic Eco" },
      { code: "ECO102", ar: "مبادئ الاقتصاد الكلي", en: "Macro Eco" },
      { code: "ECO103", ar: "مبادئ اقتصاد جزئي", en: "Micro Eco" },
      { code: "MKT101", ar: "مبادئ التسويق", en: "Marketing Principles" },
      { code: "FIN101", ar: "مبادئ التمويل والاستثمار", en: "Finance & Invest" },
      { code: "ACC101", ar: "مبادئ محاسبة مالية", en: "Financial Acc" },
      { code: "MIS101", ar: "مبادئ نظم المعلومات الإدارية", en: "MIS Principles" },
      { code: "FIS101", ar: "نظم المعلومات المالية", en: "FIS" },
      { code: "MON101", ar: "نقود وبنوك", en: "Money & Banking" },
      { code: "CS101", ar: "مهارات الحاسب الآلي", en: "Computer Skills" }
    ];

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const times = ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 02:00', '02:00 - 04:00', '04:00 - 06:00', '06:00 - 08:00'];
    const doctors = ['Dr. Mohamed Ahmed', 'Dr. Sarah Ali', 'Dr. Khalid Omar', 'Dr. Fatima Hassan', 'Dr. John Smith', 'Dr. Layla Mahmoud', 'Dr. Omar Farouk'];
    const doctorsAr = ['د. محمد أحمد', 'د. سارة علي', 'د. خالد عمر', 'د. فاطمة حسن', 'د. جون سميث', 'د. ليلى محمود', 'د. عمر فاروق'];

    let currentCourses = storage.getCourses();
    let madeChanges = false;

    // Add missing courses OR update semesterId for existing ones
    allCoursesData.forEach((input, index) => {
      const existingIndex = currentCourses.findIndex(c => c.code === input.code);

      if (existingIndex === -1) {
        // Add new
        const randomDay = days[Math.floor(Math.random() * days.length)];
        const randomTime = times[Math.floor(Math.random() * times.length)];
        const randomDocIdx = Math.floor(Math.random() * doctors.length);

        const newCourse: Course = {
          id: crypto.randomUUID(),
          code: input.code,
          title: input.en,
          title_ar: input.ar,
          credits: 3,
          doctor: doctors[randomDocIdx],
          doctor_ar: doctorsAr[randomDocIdx],
          day: randomDay,
          time: randomTime,
          isRegistrationEnabled: true,
          semesterId: activeSemId
        };
        currentCourses.push(newCourse);
        madeChanges = true;
      } else {
        // Update existing to current semester if different
        if (currentCourses[existingIndex].semesterId !== activeSemId) {
          currentCourses[existingIndex].semesterId = activeSemId;
          madeChanges = true;
        }
      }
    });

    // Save only if we added/modified something
    if (madeChanges) {
      storage.setCourses(currentCourses, true);
    }

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
  }
};
