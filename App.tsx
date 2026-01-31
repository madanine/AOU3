
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { storage } from './storage';
import { User, Language, SiteSettings } from './types';
import { TRANSLATIONS } from './constants';

// Pages
import LoginPage from './pages/auth/Login';
import SignupPage from './pages/auth/Signup';
import StudentRegistration from './pages/student/Registration';
import StudentMyCourses from './pages/student/MyCourses';
import StudentTimetable from './pages/student/Timetable';
import StudentProfile from './pages/student/Profile';
import StudentAttendance from './pages/student/Attendance';
import StudentAssignments from './pages/student/Assignments';
import StudentAssignmentSubmission from './pages/student/AssignmentSubmission';

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

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('aou_dark_mode');
    return stored === 'true';
  });

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    storage.seed();
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

  return (
    <AppContext.Provider value={{
      user, setUser, lang, setLang, t, settings, updateSettings, translate,
      isDarkMode, toggleDarkMode
    }}>
      <Router>
        <Routes>
          <Route path="/auth/login" element={!user ? <LoginPage /> : <Navigate to={user.role === 'admin' ? "/admin/dashboard" : (user.role === 'supervisor' ? "/supervisor/attendance" : "/student/registration")} />} />
          <Route path="/auth/signup" element={!user ? <SignupPage /> : <Navigate to="/student/registration" />} />

          <Route element={user ? <MainLayout /> : <Navigate to="/auth/login" />}>
            {/* Student Routes */}
            <Route path="/student/registration" element={<StudentRegistration />} />
            <Route path="/student/my-courses" element={<StudentMyCourses />} />
            <Route path="/student/timetable" element={<StudentTimetable />} />
            <Route path="/student/profile" element={<StudentProfile />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/assignments" element={<StudentAssignments />} />
            <Route path="/student/assignments/:courseId" element={<StudentAssignmentSubmission />} />

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
            <Route path="/admin/admins" element={<AdminManagement />} />
            <Route path="/admin/change-password" element={<ChangePassword />} />

            {/* Supervisor Routes */}
            <Route path="/supervisor/attendance" element={<AdminAttendance />} />
          </Route>

          <Route path="*" element={<Navigate to="/auth/login" />} />
        </Routes>
      </Router>
    </AppContext.Provider>
  );
};

export default App;
