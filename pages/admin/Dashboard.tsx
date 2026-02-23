import React, { useMemo } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Library, CheckSquare, ShieldCheck, Settings, Lock, FileEdit, ClipboardList, GraduationCap, Calendar, BarChart, HardDrive } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user, t, lang, settings } = useApp();

  const [data, setData] = React.useState({
    users: storage.getUsers(),
    courses: storage.getCourses(),
    semesters: storage.getSemesters(),
    attendances: storage.getAttendance()
  });

  const [exams, setExams] = React.useState<any[]>([]);

  React.useEffect(() => {
    // async fetch exams
    const fetchExams = async () => {
      try {
        const exms = await import('../../supabaseService').then(m => m.supabaseService.getExams());
        setExams(exms);
      } catch (e) { }
    };
    fetchExams();

    const handleUpdate = () => {
      setData({
        users: storage.getUsers(),
        courses: storage.getCourses(),
        semesters: storage.getSemesters(),
        attendances: storage.getAttendance()
      });
    };
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, []);

  const isPrimaryAdmin = user?.universityId === 'aouadmin';
  const role = user?.role;
  const perms = user?.permissions || {};
  const fullAccess = user?.fullAccess !== false;

  // Compute common stats
  const students = data.users.filter(u => u.role === 'student');
  const adminsCount = data.users.filter(u => u.role === 'admin' && u.universityId !== 'aouadmin').length;
  const supervisorsCount = data.users.filter(u => u.role === 'supervisor').length;

  // Filter courses by active semester
  const activeCourses = data.courses.filter(c => !settings.activeSemesterId || c.semesterId === settings.activeSemesterId);
  const activeExams = exams.filter(e => !settings.activeSemesterId || e.semesterId === settings.activeSemesterId);

  // Determine cards and links based on role
  let statsCards = [];
  let quickLinks = [];

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-xl">
      <div className={`w-14 h-14 rounded-2xl ${colorClass} flex items-center justify-center text-white shadow-lg`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">{title}</p>
        <p className="text-3xl font-black text-gray-800 leading-none mt-1">{value}</p>
      </div>
    </div>
  );

  const QuickLink = ({ title, to, icon: Icon, colorClass }) => (
    <Link to={to} className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
      <div className={`w-16 h-16 rounded-[20px] ${colorClass} bg-opacity-10 text-[var(--primary)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon size={32} />
      </div>
      <h3 className="text-sm font-black text-gray-800 text-center">{title}</h3>
    </Link>
  );

  if (role === 'admin') {
    if (isPrimaryAdmin || fullAccess) {
      // Super Admin
      statsCards = [
        { title: lang === 'AR' ? 'إجمالي الطلاب' : 'Total Students', value: students.length, icon: Users, color: 'bg-blue-500' },
        { title: lang === 'AR' ? 'مسؤولي النظام' : 'Total Admins', value: adminsCount, icon: ShieldCheck, color: 'bg-indigo-500' },
        { title: lang === 'AR' ? 'المشرفين' : 'Supervisors', value: supervisorsCount, icon: CheckSquare, color: 'bg-emerald-500' },
        { title: lang === 'AR' ? 'المواد الدراسية' : 'Courses', value: activeCourses.length, icon: BookOpen, color: 'bg-amber-500' },
        { title: lang === 'AR' ? 'الفصول الدراسية' : 'Semesters', value: data.semesters.length, icon: Calendar, color: 'bg-purple-500' },
        { title: lang === 'AR' ? 'الامتحانات' : 'Total Exams', value: activeExams.length, icon: FileEdit, color: 'bg-pink-500' },
      ];

      quickLinks = [
        { title: t.students, to: '/admin/students', icon: Users, color: 'bg-blue-50' },
        { title: t.courses, to: '/admin/courses', icon: BookOpen, color: 'bg-amber-50' },
        { title: t.enrollments, to: '/admin/enrollments', icon: Library, color: 'bg-emerald-50' },
        { title: lang === 'AR' ? 'الامتحانات' : 'Exams', to: '/admin/exams', icon: FileEdit, color: 'bg-pink-50' },
        { title: t.settings, to: '/admin/site-settings', icon: Settings, color: 'bg-gray-50' },
        { title: lang === 'AR' ? 'إدارة المسؤولين' : 'Admin Management', to: '/admin/admins', icon: Lock, color: 'bg-rose-50' },
      ];
    } else {
      // Regular Admin
      if (perms.students) statsCards.push({ title: lang === 'AR' ? 'الطلاب' : 'Total Students', value: students.length, icon: Users, color: 'bg-blue-500' });
      if (perms.courses) statsCards.push({ title: lang === 'AR' ? 'المواد الدراسية' : 'Courses', value: activeCourses.length, icon: BookOpen, color: 'bg-amber-500' });
      if (perms.exams) statsCards.push({ title: lang === 'AR' ? 'الامتحانات' : 'Exams', value: activeExams.length, icon: FileEdit, color: 'bg-pink-500' });
      if (perms.attendance) {
        const attendanceRecords = Object.values(data.attendances).flatMap(courseRec => Object.values(courseRec).flatMap(studentRec => studentRec.filter(v => v === true))).length;
        statsCards.push({ title: lang === 'AR' ? 'إجمالي الحضور' : 'Total Attendance', value: attendanceRecords, icon: CheckSquare, color: 'bg-emerald-500' });
      }

      if (perms.students) quickLinks.push({ title: t.students, to: '/admin/students', icon: Users, color: 'bg-blue-50' });
      if (perms.courses) quickLinks.push({ title: t.courses, to: '/admin/courses', icon: BookOpen, color: 'bg-amber-50' });
      if (perms.enrollments) quickLinks.push({ title: t.enrollments, to: '/admin/enrollments', icon: Library, color: 'bg-emerald-50' });
      if (perms.exams) quickLinks.push({ title: lang === 'AR' ? 'الامتحانات' : 'Exams', to: '/admin/exams', icon: FileEdit, color: 'bg-pink-50' });
      if (user?.canAccessRegistry) quickLinks.push({ title: t.universityIdRegistry, to: '/admin/registry', icon: HardDrive, color: 'bg-gray-50' });
      if (perms.exportData) quickLinks.push({ title: t.export, to: '/admin/export', icon: BarChart, color: 'bg-indigo-50' });
    }
  } else if (role === 'supervisor') {
    // Supervisor Dashboard
    const assignedCourses = user?.assignedCourses || [];
    const supervisorCourses = activeCourses.filter(c => assignedCourses.includes(c.id));

    statsCards = [
      { title: lang === 'AR' ? 'المواد المسندة' : 'Assigned Courses', value: supervisorCourses.length, icon: BookOpen, color: 'bg-amber-500' }
    ];

    const supPerms = user?.supervisorPermissions || { attendance: true, assignments: false, grading: false };
    if (supPerms.attendance) quickLinks.push({ title: lang === 'AR' ? 'الحضور والمشاركة' : 'Attendance', to: '/supervisor/attendance', icon: CheckSquare, color: 'bg-emerald-50' });
    if (supPerms.assignments) quickLinks.push({ title: t.assignments, to: '/supervisor/assignments', icon: ClipboardList, color: 'bg-blue-50' });
    if (supPerms.grading) quickLinks.push({ title: t.grading, to: '/supervisor/grading', icon: GraduationCap, color: 'bg-purple-50' });
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{lang === 'AR' ? 'لوحة المعلومات' : 'Dashboard'}</h1>
          <p className="font-medium text-[var(--text-secondary)] mt-1">{lang === 'AR' ? 'مرحباً بك في لوحة المعلومات المخصصة لك' : 'Welcome to your tailored information overview'}</p>
        </div>
      </div>

      {statsCards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-gray-800">{lang === 'AR' ? 'نظرة عامة' : 'Overview Statistics'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {statsCards.map((stat, idx) => (
              <StatCard key={idx} {...stat} />
            ))}
          </div>
        </div>
      )}

      {quickLinks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-gray-800">{lang === 'AR' ? 'الوصول السريع' : 'Quick Access'}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {quickLinks.map((link, idx) => (
              <QuickLink key={idx} {...link} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
