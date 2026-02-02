
import React from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Users, BookOpen, Library, GraduationCap, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SemesterControls from '../../components/admin/SemesterControls';

const AdminDashboard: React.FC = () => {
  const { t, settings } = useApp();
  const [data, setData] = React.useState({
    students: storage.getUsers().filter(u => u.role === 'student'),
    courses: storage.getCourses(),
    enrollments: storage.getEnrollments()
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      setData({
        students: storage.getUsers().filter(u => u.role === 'student'),
        courses: storage.getCourses(),
        enrollments: storage.getEnrollments()
      });
    };
    window.addEventListener('storage-update', handleUpdate);
    return () => window.removeEventListener('storage-update', handleUpdate);
  }, []);

  const { students, courses: allCourses, enrollments: allEnrollments } = data;

  // Scoped Data
  const courses = allCourses.filter(c => !settings.activeSemesterId || c.semesterId === settings.activeSemesterId);
  const enrollments = allEnrollments.filter(e => !settings.activeSemesterId || e.semesterId === settings.activeSemesterId);

  const stats = [
    { label: t.students, value: students.length, icon: Users, color: 'bg-blue-500' },
    { label: t.courses, value: courses.length, icon: BookOpen, color: 'bg-indigo-500' },
    { label: t.enrollments, value: enrollments.length, icon: Library, color: 'bg-amber-500' },
    { label: t.credits, value: courses.reduce((acc, c) => acc + c.credits, 0), icon: GraduationCap, color: 'bg-emerald-500' },
  ];

  // Prepare chart data (enrollments per course)
  const chartData = courses.map(course => ({
    name: course.code,
    enrollments: enrollments.filter(e => e.courseId === course.id).length
  })).sort((a, b) => b.enrollments - a.enrollments).slice(0, 5);

  const COLORS = ['#3b82f6', '#6366f1', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t.dashboard}</h1>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{t.systemOverview}</p>
        </div>
        <SemesterControls />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className={`w-14 h-14 rounded-2xl ${stat.color} flex items-center justify-center text-white shadow-lg`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
              <p className="text-2xl font-black leading-none mt-1" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp size={20} className="text-[var(--primary)]" />
              {t.enrollmentDist}
            </h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="enrollments" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <h2 className="text-xl font-black mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <Calendar size={20} className="text-[var(--primary)]" />
            {t.recentActivity}
          </h2>
          <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            {enrollments.slice(-5).reverse().map((e, idx) => {
              const s = students.find(stu => stu.id === e.studentId);
              const c = courses.find(cou => cou.id === e.courseId);
              return (
                <div key={idx} className="flex gap-4 relative">
                  {idx !== 4 && <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-gray-50"></div>}
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex-shrink-0 flex items-center justify-center text-[var(--primary)] font-black text-lg">
                    {s?.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                      <span className="text-[var(--primary)]">{s?.fullName}</span> {t.register.toLowerCase()} {c?.code}
                    </p>
                    <p className="text-[10px] mt-1 uppercase font-black tracking-widest" style={{ color: 'var(--text-secondary)' }}>{new Date(e.enrolledAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
            {enrollments.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Calendar className="text-gray-200 mb-2" size={40} />
                <p className="text-gray-400 text-xs font-black uppercase tracking-widest">{t.noData}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
