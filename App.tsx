
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { storage } from './storage';
import { supabase } from './supabase';
import { supabaseService } from './supabaseService';
import { User, Language, SiteSettings } from './types';
import { TRANSLATIONS } from './constants';
import './src/print-styles.css';

// Pages
import LoginPage from './pages/auth/Login';
import SignupPage from './pages/auth/Signup';
import StudentDashboard from './pages/student/Dashboard';
import StudentRegistration from './pages/student/Registration';
import StudentMyCourses from './pages/student/MyCourses';
import StudentTimetable from './pages/student/Timetable';
import StudentProfile from './pages/student/Profile';
import StudentAttendance from './pages/student/Attendance';
import StudentAssignments from './pages/student/Assignments';
import StudentAssignmentSubmission from './pages/student/AssignmentSubmission';
import StudentExams from './pages/student/Exams';
import StudentTranscript from './pages/student/Transcript';

import AdminDashboard from './pages/admin/Dashboard';
import AdminCourses from './pages/admin/Courses';
import AdminStudents from './pages/admin/Students';
import AdminEnrollments from './pages/admin/Enrollments';
import AdminExport from './pages/admin/Export';
import AdminSiteSettings from './pages/admin/SiteSettings';
import AdminAttendance from './pages/admin/Attendance';
import AdminSupervisors from './pages/admin/Supervisors';
import AdminAssignments from './pages/admin/Assignments';
import AdminGrading from './pages/admin/Grading';
import AdminManagement from './pages/admin/AdminManagement';
import ChangePassword from './pages/admin/ChangePassword';
import UniversityIdRegistry from './pages/admin/UniversityIdRegistry';
import AdminExams from './pages/admin/Exams';
import AdminTranscripts from './pages/admin/Transcripts';

import MainLayout from './components/layout/MainLayout';

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

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('aou_dark_mode');
    return stored === 'true';
  });

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const init = async () => {
      // 1. Always sync settings from Supabase (Publicly accessible branding)
      const syncedSettings = await storage.syncFromSupabase();
      if (syncedSettings) {
        setSettings(syncedSettings);
      }

      // 2. Check current session for user profile
      const session = await supabaseService.getSession();
      if (session) {
        try {
          const profile = await supabaseService.getProfile(session.user.id);
          setUserState(profile);
          storage.setAuthUser(profile);
        } catch (e) {
          console.error('Failed to fetch profile on init', e);
        }
      }
      // Await full sync first, then seed, then update settings
      await storage.syncFromSupabase(); // Await full sync first
      storage.seed();

      // Update local state with latest settings from storage (synced from Cloud)
      const freshSettings = storage.getSettings();
      setSettings(freshSettings);

      setIsLoading(false);
    };
    init();

    // Initialize Realtime
    try {
      storage.initRealtime();
    } catch (e) {
      console.error('Realtime init failed', e);
    }

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
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

    return () => subscription.unsubscribe();
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
        <div className="flex flex-col items-center gap-6">
          {(settings.branding.logo || settings.branding.logoBase64) ? (
            <img src={settings.branding.logo || settings.branding.logoBase64} alt="Logo" className="h-16 w-auto object-contain animate-pulse" />
          ) : (
            <div className="w-16 h-16 bg-[var(--primary)] rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-xl animate-pulse">
              A
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-[var(--primary)] rounded-full animate-[loading_1.5s_infinite_linear]"></div>
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

  return (
    <AppContext.Provider value={{
      user, setUser, lang, setLang, t, settings, updateSettings, translate,
      isDarkMode, toggleDarkMode
    }}>
      <Router>
        <Routes>
          <Route path="/auth/login" element={!user ? <LoginPage /> : <Navigate to={user.role === 'admin' ? "/admin/dashboard" : (user.role === 'supervisor' ? "/supervisor/dashboard" : "/student/dashboard")} />} />
          <Route path="/auth/signup" element={!user ? <SignupPage /> : <Navigate to="/student/dashboard" />} />

          <Route element={user ? <MainLayout /> : <Navigate to="/auth/login" />}>
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
            <Route path="/supervisor/dashboard" element={<AdminDashboard />} />
            <Route path="/supervisor/attendance" element={<AdminAttendance />} />
            <Route path="/supervisor/assignments" element={<AdminAssignments />} />
            <Route path="/supervisor/grading" element={<AdminGrading />} />
          </Route>

          <Route path="*" element={<Navigate to="/auth/login" />} />
        </Routes>
      </Router>
    </AppContext.Provider>
  );
};

export default App;
