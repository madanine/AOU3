
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { storage } from '../../storage';
import { useApp } from '../../App';
import { Language } from '../../types';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileSpreadsheet,
  Settings,
  LogOut,
  User as UserIcon,
  Library,
  GraduationCap,
  Menu,
  X,
  Calendar,
  ShieldCheck,
  CheckSquare,
  History,
  Lock,
  Key,
  ClipboardList,
  GraduationCap as GradIcon,
  Sun,
  Moon,
  Globe
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, setUser, lang, setLang, t, settings, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isRtl = lang === 'AR';

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await storage.clearAuth();
    setUser(null);
    navigate('/auth/login');
  };

  const getMenuItems = () => {
    if (user?.role === 'admin') {
      const isSubAdmin = !!(user as any).permissions;
      const perms = (user as any).permissions || {};
      const fullAccess = (user as any).fullAccess !== false;

      const items = [
        { label: t.dashboard, path: '/admin/dashboard', icon: LayoutDashboard, key: 'dashboard' },
        { label: t.courses, path: '/admin/courses', icon: BookOpen, key: 'courses' },
        { label: t.assignments, path: '/admin/assignments', icon: ClipboardList, key: 'assignments' },
        { label: t.grading, path: '/admin/grading', icon: GradIcon, key: 'grading' },
        { label: lang === 'AR' ? 'التحضير' : 'Attendance', path: '/admin/attendance', icon: CheckSquare, key: 'attendance' },
        { label: lang === 'AR' ? 'المشرفين' : 'Supervisors', path: '/admin/supervisors', icon: ShieldCheck, key: 'supervisors' },
        { label: t.students, path: '/admin/students', icon: Users, key: 'students' },
        { label: t.enrollments, path: '/admin/enrollments', icon: Library, key: 'enrollments' },
        { label: t.export, path: '/admin/export', icon: FileSpreadsheet, key: 'exportData' },
        { label: t.settings, path: '/admin/site-settings', icon: Settings, key: 'siteSettings' },
      ];

      const filtered = items.filter(item => fullAccess || perms[item.key] || ['assignments', 'grading'].includes(item.key));

      if (!isSubAdmin) {
        filtered.push({ label: lang === 'AR' ? 'إدارة المسؤولين' : 'Admin Management', path: '/admin/admins', icon: Lock, key: 'adminManagement' });
      } else {
        filtered.push({ label: lang === 'AR' ? 'تغيير كلمة المرور' : 'Change Password', path: '/admin/change-password', icon: Key, key: 'changePassword' });
      }

      return filtered;
    }
    if (user?.role === 'supervisor') {
      const perms = user.supervisorPermissions || { attendance: true, assignments: false, grading: false };
      const items = [];

      if (perms.attendance) {
        items.push({ label: lang === 'AR' ? 'التحضير' : 'Attendance', path: '/supervisor/attendance', icon: CheckSquare, key: 'attendance' });
      }
      if (perms.assignments) {
        items.push({ label: t.assignments, path: '/supervisor/assignments', icon: ClipboardList, key: 'assignments' });
      }
      if (perms.grading) {
        items.push({ label: t.grading, path: '/supervisor/grading', icon: GradIcon, key: 'grading' });
      }

      return items;
    }
    return [
      { label: t.registration, path: '/student/registration', icon: GraduationCap, key: 'registration' },
      { label: t.myCourses, path: '/student/my-courses', icon: BookOpen, key: 'myCourses' },
      { label: t.assignments, path: '/student/assignments', icon: ClipboardList, key: 'assignments' },
      { label: lang === 'AR' ? 'سجل الحضور' : 'Attendance History', path: '/student/attendance', icon: History, key: 'attendance' },
      { label: t.myTimetable, path: '/student/timetable', icon: Calendar, key: 'timetable' },
      { label: t.profile, path: '/student/profile', icon: UserIcon, key: 'profile' },
    ];
  };

  const menuItems = getMenuItems();

  const isAuthorized = () => {
    if (user?.role !== 'admin') return true;
    const isSubAdmin = !!(user as any).permissions;
    if (!isSubAdmin) return true;

    const perms = (user as any).permissions;
    const fullAccess = (user as any).fullAccess !== false;
    if (fullAccess) return true;

    if (location.pathname === '/admin/change-password') return true;
    if (location.pathname.startsWith('/admin/assignments')) return true;
    if (location.pathname.startsWith('/admin/grading')) return true;

    const currentKey = menuItems.find(m => m.path === location.pathname)?.key;
    if (!currentKey && location.pathname !== '/admin/dashboard') return false;
    return true;
  };

  if (!isAuthorized()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative" style={{ backgroundColor: 'var(--background)' }}>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b sticky top-0 z-50 shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          {(settings.branding.logo || settings.branding.logoBase64) ? (
            <img src={settings.branding.logo || settings.branding.logoBase64} alt="Logo" className="h-10 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: 'var(--primary)' }}>A</div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-[10px] tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
              {isRtl ? settings.branding.siteNameAr : settings.branding.siteNameEn}
            </span>
            <span className="text-[8px] font-bold opacity-70" style={{ color: 'var(--text-primary)' }}>{t.regionalCenter}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 z-50 w-72 border-r border-[var(--border-color)] transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto md:flex md:w-64
        ${isRtl ? 'right-0' : 'left-0'}
        ${isRtl ? (sidebarOpen ? 'translate-x-0' : 'translate-x-full') : (sidebarOpen ? 'translate-x-0' : '-translate-x-full')}
      `} style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <div className="h-full flex flex-col p-6 w-full">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              {(settings.branding.logo || settings.branding.logoBase64) ? (
                <img src={settings.branding.logo || settings.branding.logoBase64} alt="Logo" className="h-12 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg" style={{ backgroundColor: 'var(--primary)' }}>A</div>
              )}
              <div className="flex flex-col">
                <h1 className="font-bold text-sm leading-tight max-w-[140px]" style={{ color: 'var(--text-primary)' }}>
                  {isRtl ? settings.branding.siteNameAr : settings.branding.siteNameEn}
                </h1>
                <p className="text-[9px] font-bold opacity-60" style={{ color: 'var(--text-primary)' }}>{t.regionalCenter}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${isActive ? 'shadow-lg' : ''
                    }`}
                  style={{
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  <Icon size={20} />
                  <span className="text-xs uppercase tracking-widest">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-[var(--border-color)] space-y-4">
            {/* Language Switcher Inside App */}
            <div className="flex justify-center gap-4 py-4 border-b border-[var(--border-color)] items-center">
              {(['AR', 'EN', 'FR', 'RU'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`text-[10px] font-black tracking-widest transition-all p-1 rounded-md hover:bg-black/5`}
                  style={{ color: lang === l ? 'var(--primary)' : 'var(--text-secondary)' }}
                >
                  {l}
                </button>
              ))}
              <div className="w-px h-4 bg-[var(--border-color)] mx-1"></div>
              <button
                onClick={toggleDarkMode}
                className="p-1 rounded-lg transition-colors hover:bg-black/5"
                style={{ color: 'var(--text-secondary)' }}
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                  <UserIcon size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-[var(--text-primary)] truncate max-w-[100px]">{user?.fullName}</span>
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{user?.role}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title={t.logout}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar h-screen">
        <div className="flex-1 p-6 md:p-10">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="mt-auto py-6 px-6 md:px-10 border-t" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
          <div className="max-w-6xl mx-auto text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest">
              {settings.branding.footerText}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
              BY ABDULLAH
            </p>
          </div>
        </footer>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}
    </div>
  );
};

export default MainLayout;
