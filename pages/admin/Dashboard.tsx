import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { supabaseService } from '../../supabaseService';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Library, CheckSquare, ShieldCheck, Settings, Lock, FileEdit, ClipboardList, GraduationCap, Calendar, BarChart as BarChartIcon, HardDrive, Clock, Activity, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { ChartBlock } from '../../components/dashboard/ChartBlock';
import { EmptyState } from '../../components/dashboard/EmptyState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const { user, t, lang, settings } = useApp();

  const [data, setData] = useState({
    users: storage.getUsers(),
    courses: storage.getCourses(),
    semesters: storage.getSemesters(),
    attendances: storage.getAttendance(),
    enrollments: storage.getEnrollments(),
    assignments: storage.getAssignments()
  });

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const exms = await supabaseService.getExams();
        setExams(exms);
      } catch (e) {
        console.error("Failed to fetch exams", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const handleUpdate = () => {
      setData({
        users: storage.getUsers(),
        courses: storage.getCourses(),
        semesters: storage.getSemesters(),
        attendances: storage.getAttendance(),
        enrollments: storage.getEnrollments(),
        assignments: storage.getAssignments()
      });
    };
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, []);

  const isPrimaryAdmin = user?.universityId === 'aouadmin';
  const role = user?.role;
  const perms = user?.permissions || {};
  const fullAccess = user?.fullAccess !== false;

  // Active Semester Filtering
  // Super Admins usually want to see across the board, but we'll apply settings for consistency if available
  const activeSemesterId = settings.activeSemesterId;

  // Data Aggregation
  const students = data.users.filter(u => u.role === 'student');
  const admins = data.users.filter(u => u.role === 'admin' && u.universityId !== 'aouadmin');
  const supervisors = data.users.filter(u => u.role === 'supervisor');

  const activeCourses = data.courses.filter(c => !activeSemesterId || c.semesterId === activeSemesterId);
  const activeExams = exams.filter(e => !activeSemesterId || e.semesterId === activeSemesterId);
  const activeEnrollments = data.enrollments.filter(e => !activeSemesterId || e.semesterId === activeSemesterId);

  // --- CHART DATA (SUPER ADMIN / ADMIN) ---
  const userDistributionData = [
    { name: lang === 'AR' ? 'الطلاب' : 'Students', value: students.length, color: '#3b82f6' },
    { name: lang === 'AR' ? 'المشرفين' : 'Supervisors', value: supervisors.length, color: '#10b981' },
    { name: lang === 'AR' ? 'المسؤولين' : 'Admins', value: admins.length, color: '#6366f1' }
  ].filter(d => d.value > 0);

  // Top 5 Enrollments per Course
  const enrollmentsByCourse = useMemo(() => {
    const counts: Record<string, number> = {};
    activeEnrollments.forEach(e => {
      counts[e.courseId] = (counts[e.courseId] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([courseId, count]) => {
        const course = data.courses.find(c => c.id === courseId);
        return {
          name: course ? (lang === 'AR' ? course.title_ar : course.title) : courseId,
          students: count
        };
      })
      .sort((a, b) => b.students - a.students)
      .slice(0, 5); // top 5
  }, [activeEnrollments, data.courses, lang]);


  // --- CHART DATA (SUPERVISOR) ---
  const assignedCoursesIds = user?.assignedCourses || [];
  const supervisorCourses = activeCourses.filter(c => assignedCoursesIds.includes(c.id));

  const supervisorAssignmentsData = useMemo(() => {
    return supervisorCourses.map(course => {
      const courseAssignments = data.assignments.filter(a => a.courseId === course.id);
      return {
        name: lang === 'AR' ? course.title_ar : course.title,
        assignments: courseAssignments.length
      };
    }).filter(d => d.assignments > 0);
  }, [supervisorCourses, data.assignments, lang]);


  // --- UI RENDER HELPERS ---
  const QuickLink = ({ title, to, icon: Icon, colorClass }: any) => (
    <Link to={to} className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
      <div className={`w-16 h-16 rounded-[20px] ${colorClass} bg-opacity-10 shadow-inner flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon size={32} className={colorClass.replace('bg-', 'text-').replace('-500', '-600').replace('-50', '-600')} />
      </div>
      <h3 className="text-sm font-black text-gray-800 text-center">{title}</h3>
    </Link>
  );

  let statsCards: any[] = [];
  let quickLinks: any[] = [];

  // RENDER BLOCKS
  if (role === 'admin') {
    if (isPrimaryAdmin || fullAccess) {
      statsCards = [
        { title: lang === 'AR' ? 'إجمالي الطلاب' : 'Total Students', value: students.length, icon: Users, colorClass: 'bg-blue-500' },
        { title: lang === 'AR' ? 'مسؤولي النظام' : 'Total Admins', value: admins.length, icon: ShieldCheck, colorClass: 'bg-indigo-500' },
        { title: lang === 'AR' ? 'المشرفين' : 'Supervisors', value: supervisors.length, icon: CheckSquare, colorClass: 'bg-emerald-500' },
        { title: lang === 'AR' ? 'المواد الدراسية' : 'Courses', value: activeCourses.length, icon: BookOpen, colorClass: 'bg-amber-500' },
        { title: lang === 'AR' ? 'الفصول الدراسية' : 'Semesters', value: data.semesters.length, icon: Calendar, colorClass: 'bg-purple-500' },
        { title: lang === 'AR' ? 'الامتحانات' : 'Total Exams', value: activeExams.length, icon: FileEdit, colorClass: 'bg-pink-500' },
      ];

      quickLinks = [
        { title: t.students, to: '/admin/students', icon: Users, colorClass: 'bg-blue-500' },
        { title: t.courses, to: '/admin/courses', icon: BookOpen, colorClass: 'bg-amber-500' },
        { title: t.enrollments, to: '/admin/enrollments', icon: Library, colorClass: 'bg-emerald-500' },
        { title: lang === 'AR' ? 'الامتحانات' : 'Exams', to: '/admin/exams', icon: FileEdit, colorClass: 'bg-pink-500' },
        { title: t.settings, to: '/admin/site-settings', icon: Settings, colorClass: 'bg-gray-500' },
        { title: lang === 'AR' ? 'إدارة المسؤولين' : 'Admin Management', to: '/admin/admins', icon: Lock, colorClass: 'bg-rose-500' },
      ];
    } else {
      if (perms.students) statsCards.push({ title: lang === 'AR' ? 'الطلاب' : 'Total Students', value: students.length, icon: Users, colorClass: 'bg-blue-500' });
      if (perms.courses) statsCards.push({ title: lang === 'AR' ? 'المواد الدراسية' : 'Courses', value: activeCourses.length, icon: BookOpen, colorClass: 'bg-amber-500' });
      if (perms.exams) statsCards.push({ title: lang === 'AR' ? 'الامتحانات' : 'Exams', value: activeExams.length, icon: FileEdit, colorClass: 'bg-pink-500' });
      if (perms.attendance) {
        const attendanceRecords = Object.values(data.attendances).flatMap(courseRec => Object.values(courseRec).flatMap(studentRec => studentRec.filter(v => v === true))).length;
        statsCards.push({ title: lang === 'AR' ? 'إجمالي الحضور' : 'Total Attendance', value: attendanceRecords, icon: CheckSquare, colorClass: 'bg-emerald-500' });
      }

      if (perms.students) quickLinks.push({ title: t.students, to: '/admin/students', icon: Users, colorClass: 'bg-blue-500' });
      if (perms.courses) quickLinks.push({ title: t.courses, to: '/admin/courses', icon: BookOpen, colorClass: 'bg-amber-500' });
      if (perms.enrollments) quickLinks.push({ title: t.enrollments, to: '/admin/enrollments', icon: Library, colorClass: 'bg-emerald-500' });
      if (perms.exams) quickLinks.push({ title: lang === 'AR' ? 'الامتحانات' : 'Exams', to: '/admin/exams', icon: FileEdit, colorClass: 'bg-pink-500' });
      if (user?.canAccessRegistry) quickLinks.push({ title: t.universityIdRegistry, to: '/admin/registry', icon: HardDrive, colorClass: 'bg-gray-500' });
      if (perms.exportData) quickLinks.push({ title: t.export, to: '/admin/export', icon: BarChartIcon, colorClass: 'bg-indigo-500' });
    }
  } else if (role === 'supervisor') {
    statsCards = [
      {
        title: lang === 'AR' ? 'المواد المسندة' : 'Assigned Courses',
        value: supervisorCourses.length,
        icon: BookOpen,
        colorClass: 'bg-amber-500'
      }
    ];

    const supPerms = user?.supervisorPermissions || { attendance: true, assignments: false, grading: false };
    if (supPerms.attendance) quickLinks.push({ title: lang === 'AR' ? 'الحضور والمشاركة' : 'Attendance', to: '/supervisor/attendance', icon: CheckSquare, colorClass: 'bg-emerald-500' });
    if (supPerms.assignments) quickLinks.push({ title: t.assignments, to: '/supervisor/assignments', icon: ClipboardList, colorClass: 'bg-blue-500' });
    if (supPerms.grading) quickLinks.push({ title: t.grading, to: '/supervisor/grading', icon: GraduationCap, colorClass: 'bg-purple-500' });
  }

  // Common Header
  const activeSemName = data.semesters.find(s => s.id === activeSemesterId)?.name || (lang === 'AR' ? 'كل الفصول' : 'All Semesters');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-10">

      {/* Header & Filter Indicator */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight text-gray-800">
            {lang === 'AR' ? 'لوحة المعلومات' : 'Dashboard'}
          </h1>
          <p className="font-medium text-gray-500 mt-2 flex items-center gap-2">
            <span>{lang === 'AR' ? 'مرحباً بك،' : 'Welcome back,'}</span>
            <span className="text-[var(--primary)] font-bold">{user?.fullName}</span>
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 shadow-inner">
          <Calendar size={18} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700">{activeSemName}</span>
        </div>
      </div>

      {/* KPIs Grid */}
      {statsCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {statsCards.map((stat, idx) => (
            <div key={idx} style={{ animationDelay: `${idx * 50}ms` }} className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both">
              <StatCard isLoading={loading} {...stat} />
            </div>
          ))}
        </div>
      )}

      {/* Admin Analytics Section */}
      {role === 'admin' && (isPrimaryAdmin || fullAccess) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
          {/* User Distribution Pie Chart */}
          <ChartBlock
            title={lang === 'AR' ? 'توزيع المستخدمين' : 'User Distribution'}
            subtitle={lang === 'AR' ? 'الطلاب، المشرفين، والمسؤولين' : 'Students, Supervisors, and Admins'}
            icon={PieChartIcon}
            isLoading={loading}
            isEmpty={userDistributionData.length === 0}
          >
            <PieChart>
              <Pie
                data={userDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {userDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ChartBlock>

          {/* Enrollments Bar Chart */}
          <ChartBlock
            title={lang === 'AR' ? 'أعلى المواد تسجيلاً' : 'Top Enrolled Courses'}
            subtitle={lang === 'AR' ? 'بناءً على الفصل الدراسي الحالي' : 'Based on currently active semester'}
            icon={TrendingUp}
            isLoading={loading}
            isEmpty={enrollmentsByCourse.length === 0}
            emptyMessage={lang === 'AR' ? 'لا توجد تسجيلات' : 'No enrollments found'}
          >
            <BarChart data={enrollmentsByCourse} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
              <Tooltip
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar dataKey="students" fill="#8b5cf6" radius={[6, 6, 0, 0]} name={lang === 'AR' ? 'الطلاب' : 'Students'} barSize={40} />
            </BarChart>
          </ChartBlock>
        </div>
      )}

      {/* Supervisor Analytics Section */}
      {role === 'supervisor' && (
        <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
          <ChartBlock
            title={lang === 'AR' ? 'الواجبات حسب المادة' : 'Assignments per Course'}
            subtitle={lang === 'AR' ? 'مقارنة لعدد الواجبات' : 'Comparing assignment counts'}
            icon={Activity}
            isLoading={loading}
            isEmpty={supervisorAssignmentsData.length === 0}
            emptyMessage={lang === 'AR' ? 'لا توجد بيانات ليتم عرضها' : 'No chart data available'}
          >
            <BarChart data={supervisorAssignmentsData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
              <Tooltip
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar dataKey="assignments" fill="#f59e0b" radius={[6, 6, 0, 0]} name={lang === 'AR' ? 'الواجبات' : 'Assignments'} barSize={40} />
            </BarChart>
          </ChartBlock>
        </div>
      )}

      {/* Quick Access Links */}
      {quickLinks.length > 0 && (
        <div className="pt-4">
          <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
              <Activity size={16} />
            </div>
            {lang === 'AR' ? 'إجراءات سريعة' : 'Quick Actions'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickLinks.map((link, idx) => (
              <div key={idx} style={{ animationDelay: `${idx * 40}ms` }} className="animate-in zoom-in-95 duration-500 fill-mode-both">
                <QuickLink {...link} />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
