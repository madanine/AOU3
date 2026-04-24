
import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/lib/supabaseService';
import { User, Language, SiteSettings } from '@/types';
import { TRANSLATIONS } from '@/lib/constants';
import './print-styles.css';

// ─── Eagerly loaded (critical path - user sees these immediately) ──────────
import LoginPage from '@/pages/auth/Login';
import SignupPage from '@/pages/auth/Signup';
import MainLayout from '@/components/layout/MainLayout';
import MaintenancePage from '@/components/MaintenancePage';

// ─── Lazy loaded (only downloaded when user navigates to that page) ────────
// Student pages
const StudentDashboard = lazy(() => import('@/pages/student/Dashboard'));
const StudentRegistration = lazy(() => import('@/pages/student/Registration'));
const StudentMyCourses = lazy(() => import('@/pages/student/MyCourses'));
const StudentTimetable = lazy(() => import('@/pages/student/Timetable'));
const StudentProfile = lazy(() => import('@/pages/student/Profile'));
const StudentAttendance = lazy(() => import('@/pages/student/Attendance'));
const StudentAssignments = lazy(() => import('@/pages/student/Assignments'));
const StudentAssignmentSubmission = lazy(() => import('@/pages/student/AssignmentSubmission'));
const StudentExams = lazy(() => import('@/pages/student/Exams'));
const StudentTranscript = lazy(() => import('@/pages/student/Transcript'));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminCourses = lazy(() => import('@/pages/admin/Courses'));
const AdminStudents = lazy(() => import('@/pages/admin/Students'));
const AdminEnrollments = lazy(() => import('@/pages/admin/Enrollments'));
const AdminExport = lazy(() => import('@/pages/admin/Export'));
const AdminSiteSettings = lazy(() => import('@/pages/admin/SiteSettings'));
const AdminAttendance = lazy(() => import('@/pages/admin/Attendance'));
const AdminSupervisors = lazy(() => import('@/pages/admin/Supervisors'));
const AdminAssignments = lazy(() => import('@/pages/admin/Assignments'));
const AdminGrading = lazy(() => import('@/pages/admin/Grading'));
const AdminManagement = lazy(() => import('@/pages/admin/AdminManagement'));
const ChangePassword = lazy(() => import('@/pages/admin/ChangePassword'));
const UniversityIdRegistry = lazy(() => import('@/pages/admin/UniversityIdRegistry'));
const AdminExams = lazy(() => import('@/pages/admin/Exams'));
const AdminTranscripts = lazy(() => import('@/pages/admin/Transcripts'));

// Supervisor pages
const SupervisorDashboard = lazy(() => import('@/pages/supervisor/Dashboard'));

// ─── Suspense fallback spinner (lightweight, no dependencies) ─────────────
const PageLoader: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[var(--background)]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] animate-pulse">
        Loading...
      </p>
    </div>
  </div>
);

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  t: any;
  settings: SiteSettings;
  updateSettings: (settings: SiteSettings) => void;
  translate: (obj: any, field: string) => string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  dataReady: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const App: React.FC = () => {
  const [user, setUserState] = useState<User | null>(storage.getAuthUser());
  const [lang, setLangState] = useState<Language>(storage.getLanguage() as Language);
  const [settings, setSettings] = useState<SiteSettings>(storage.getSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [dataReady, setDataReady] = useState(storage.isInitialized);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('aou_dark_mode');
    return stored === 'true';
  });

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    // ✅ Frontend cache versioning — يحل مشكلة cache القديم على Android/Samsung
    // غيّر APP_VERSION مع كل تحديث مهم لإجبار المستخدمين على تحميل النسخة الجديدة
    const APP_VERSION = "1.0.7";
    const storedVersion = localStorage.getItem("app_version");

    if (!storedVersion) {
      // أول دخول — خزّن الـ version بدون reload
      localStorage.setItem("app_version", APP_VERSION);
    } else if (storedVersion !== APP_VERSION) {
      // نسخة قديمة — امسح الـ cache وأعد التحميل مرة واحدة
      localStorage.removeItem("last_sync_time");
      localStorage.setItem("app_version", APP_VERSION);
      window.location.reload();
      return;
    }

    // ✅ Stuck state detection — لو الـ app علق في تحميل سابق، امسح آخر sync time لإجبار sync جديد نظيف
    const stuck = localStorage.getItem('app_stuck');
    if (stuck === 'true') {
      console.warn('Detected stuck state — clearing sync cache');
      localStorage.removeItem('last_sync_time');
    }
    localStorage.setItem('app_stuck', 'true');

    const init = async () => {
      let didFinish = false;

      // ✅ Fail-safe timeout — لو أي await علق، نفتح الـ UI بعد 6 ثواني بدون انتظار
      const timeout = setTimeout(() => {
        if (!didFinish) {
          console.warn('Init timeout — forcing UI render');
          setIsLoading(false);
        }
      }, 6000);

      try {
        // 1. Always sync settings from Supabase (Publicly accessible branding)
        try {
          const syncedSettings = await storage.syncFromSupabase();
          if (syncedSettings) setSettings(syncedSettings);
        } catch (e) {
          console.error('Sync failed:', e);
        }

        // 2. Check current session for user profile
        // ✅ try-catch ضروري — لو getSession() فشلت بدونه، setIsLoading(false) لن يُنفذ أبداً
        try {
          const session = await supabaseService.getSession();
          if (session) {
            try {
              const profile = await supabaseService.getProfile(session.user.id);
              setUserState(profile);
              storage.setAuthUser(profile);
              // On mobile, localStorage may be wiped so _syncSecondaryData ran with
              // currentUser=null and skipped enrollments. Re-run it now that we know
              // the user identity. Bypasses the cache intentionally (secondary data only).
              const isAdmin = profile.role === 'admin' || profile.role === 'supervisor';
              storage._syncSecondaryData(profile, isAdmin).catch(e => console.error('Re-sync secondary data failed:', e));
            } catch (e) {
              console.error('Failed to fetch profile on init', e);
            }
          }
        } catch (e) {
          console.error('getSession failed:', e);
        }

        // Seed defaults if needed (uses already-synced data from above)
        storage.seed();

        // Update local state with latest settings (already synced above)
        setDataReady(storage.isInitialized);

        // ✅ initRealtime داخل init() بعد معرفة هوية المستخدم — يمنع Realtime للطلاب بالغلط
        try {
          storage.initRealtime();
        } catch (e) {
          console.error('Realtime init failed', e);
        }

      } finally {
        // ✅ هذا أهم شيء — ينفذ دائماً حتى لو فيه error أو timeout
        didFinish = true;
        clearTimeout(timeout);
        setIsLoading(false);
        localStorage.removeItem('app_stuck'); // ✅ الـ init نجح — امسح علامة الـ stuck
      }
    };
    init();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // تم إزالة INITIAL_SESSION لمنع جلب البروفايل مرتين عند بداية فتح الموقع
      if (event === 'SIGNED_IN' && session) {
        try {
          const profile = await supabaseService.getProfile(session.user.id);
          setUserState(profile);
          storage.setAuthUser(profile);
        } catch (e) {
          console.error('Auth change profile fetch failed', e);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserState(null);
        storage.setAuthUser(null);
      }
    });

    const unsubscribeStorage = storage.subscribe(() => {
      setSettings(storage.getSettings());
      setDataReady(storage.isInitialized);
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeStorage();
    };
  }, []);


  useEffect(() => {
    const root = document.documentElement;
    // تحديد أي ثيم نستخدمه بناءً على الوضع الحالي
    const currentTheme = isDarkMode ? (settings.darkTheme || settings.theme) : settings.theme;

    root.style.setProperty('--background', currentTheme.background);
    root.style.setProperty('--card-bg', currentTheme.cardBg);
    root.style.setProperty('--text-primary', currentTheme.textPrimary);
    root.style.setProperty('--text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--border-color', currentTheme.borderColor);
    root.style.setProperty('--primary', currentTheme.primary);
    root.style.setProperty('--secondary', currentTheme.secondary);
    root.style.setProperty('--accent', currentTheme.accent);

    // Add/remove 'dark' class so html.dark CSS rules apply
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('aou_dark_mode', isDarkMode.toString());
  }, [isDarkMode, settings.theme, settings.darkTheme]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const setUser = (u: User | null) => {
    storage.setAuthUser(u);
    setUserState(u);
  };

  const setLang = (l: Language) => {
    storage.setLanguage(l);
    setLangState(l);
    document.documentElement.dir = TRANSLATIONS[l].dir;
    document.documentElement.lang = l.toLowerCase();
  };

  const updateSettings = (newSettings: SiteSettings) => {
    storage.setSettings(newSettings);
    setSettings(newSettings);
  };

  const translate = (obj: any, field: string) => {
    if (!obj) return '';
    const localizedField = `${field}_${lang.toLowerCase()}`;
    return obj[localizedField] || obj[field] || '';
  };

  useEffect(() => {
    document.documentElement.dir = t.dir;
    document.documentElement.lang = lang.toLowerCase();
  }, [lang, t.dir]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--background)] z-[9999]">
        {/* Ambient gold glow behind logo */}
        <div className="absolute w-64 h-64 rounded-full bg-[var(--primary)] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center gap-6 relative">
          {(settings.branding.logo || settings.branding.logoBase64) ? (
            <img src={settings.branding.logo || settings.branding.logoBase64} alt="Logo" className="h-16 w-auto object-contain animate-pulse" />
          ) : (
            <div className="w-16 h-16 bg-gold-gradient rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-glow animate-pulse">
              A
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-[2px] bg-[var(--border-color)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--primary)] rounded-full animate-[loading_1.5s_infinite_linear]"></div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-secondary)] animate-pulse mt-2">
              {lang === 'AR' ? 'جاري التحميل...' : 'Loading Portal...'}
            </p>
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  const isMaintenanceBlocked = settings.isMaintenanceMode && user?.role !== 'admin';
  // Allow only unauthenticated users to see the login page during maintenance
  const isLoginPage = !user && window.location.hash.includes('/auth/login');

  return (
    <AppContext.Provider value={{
      user, setUser, lang, setLang, t, settings, updateSettings, translate,
      isDarkMode, toggleDarkMode, dataReady
    }}>
      {isMaintenanceBlocked && !isLoginPage ? (
        <MaintenancePage settings={settings} lang={lang} />
      ) : (
        <Router>
          <Routes>
            {/* Auth routes — eagerly loaded, no Suspense needed */}
            <Route path="/auth/login" element={!user ? <LoginPage /> : <Navigate to={user.role === 'admin' ? "/admin/dashboard" : (user.role === 'supervisor' ? "/supervisor/dashboard" : "/student/dashboard")} />} />
            <Route path="/auth/signup" element={!user ? <SignupPage /> : <Navigate to="/student/dashboard" />} />

            {/* All authenticated routes — wrapped in Suspense for lazy loading */}
            <Route element={
              <Suspense fallback={<PageLoader />}>
                {user ? <MainLayout /> : <Navigate to="/auth/login" />}
              </Suspense>
            }>
              {/* Student Routes */}
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/registration" element={<StudentRegistration />} />
              <Route path="/student/my-courses" element={<StudentMyCourses />} />
              <Route path="/student/timetable" element={<StudentTimetable />} />
              <Route path="/student/profile" element={<StudentProfile />} />
              <Route path="/student/attendance" element={<StudentAttendance />} />
              <Route path="/student/assignments" element={<StudentAssignments />} />
              <Route path="/student/assignments/:courseId" element={<StudentAssignmentSubmission />} />
              <Route path="/student/exams" element={<StudentExams />} />
              <Route path="/student/transcript" element={<StudentTranscript />} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/students" element={<AdminStudents />} />
              <Route path="/admin/enrollments" element={<AdminEnrollments />} />
              <Route path="/admin/attendance" element={<AdminAttendance />} />
              <Route path="/admin/supervisors" element={<AdminSupervisors />} />
              <Route path="/admin/assignments" element={<AdminAssignments />} />
              <Route path="/admin/grading" element={<AdminGrading />} />
              <Route path="/admin/export" element={<AdminExport />} />
              <Route path="/admin/site-settings" element={<AdminSiteSettings />} />
              <Route path="/admin/exams" element={<AdminExams />} />
              <Route path="/admin/transcripts" element={<AdminTranscripts />} />
              <Route path="/admin/admins" element={<AdminManagement />} />
              <Route path="/admin/change-password" element={<ChangePassword />} />
              <Route path="/admin/registry" element={
                user?.role === 'admin' && (user?.fullAccess || user?.canAccessRegistry) ?
                  <UniversityIdRegistry /> :
                  <Navigate to="/admin/dashboard" />
              } />

              {/* Supervisor Routes */}
              <Route path="/supervisor/dashboard" element={<SupervisorDashboard />} />
              <Route path="/supervisor/attendance" element={<AdminAttendance />} />
              <Route path="/supervisor/assignments" element={<AdminAssignments />} />
              <Route path="/supervisor/grading" element={<AdminGrading />} />
            </Route>

            <Route path="*" element={<Navigate to="/auth/login" />} />
          </Routes>
        </Router>
      )}
    </AppContext.Provider>
  );
};

export default App;
