import React, { useMemo } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, ClipboardList, Clock, CheckSquare, Calendar, History, FileEdit } from 'lucide-react';

const StudentDashboard: React.FC = () => {
    const { user, t, lang, settings } = useApp();

    const data = useMemo(() => {
        return {
            courses: storage.getCourses(),
            enrollments: storage.getEnrollments().filter(e => e.studentId === user?.id),
            assignments: storage.getAssignments(),
            attendances: storage.getAttendance()
        };
    }, [user?.id]);

    const activeSemesterId = settings.activeSemesterId;
    const currentEnrollments = data.enrollments.filter(e => !activeSemesterId || e.semesterId === activeSemesterId);

    const myCourses = data.courses.filter(c => currentEnrollments.some(e => e.courseId === c.id));
    const totalCredits = myCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

    const activeAssignments = data.assignments.filter(a => myCourses.some(mc => mc.id === a.courseId));

    const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
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

    const QuickLink = ({ title, to, icon: Icon, colorClass }: any) => (
        <Link to={to} className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className={`w-16 h-16 rounded-[20px] ${colorClass} bg-opacity-10 text-[var(--primary)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={32} />
            </div>
            <h3 className="text-sm font-black text-gray-800 text-center">{title}</h3>
        </Link>
    );

    const statsCards = [
        { title: lang === 'AR' ? 'المواد الحالية' : 'Current Courses', value: myCourses.length, icon: BookOpen, color: 'bg-blue-500' },
        { title: lang === 'AR' ? 'اجمالي الساعات' : 'Total Credits', value: totalCredits, icon: GraduationCap, color: 'bg-indigo-500' },
        { title: lang === 'AR' ? 'الواجبات' : 'Assignments', value: activeAssignments.length, icon: ClipboardList, color: 'bg-emerald-500' },
    ];

    const quickLinks = [
        { title: t.registration, to: '/student/registration', icon: GraduationCap, color: 'bg-blue-50' },
        { title: t.myCourses, to: '/student/my-courses', icon: BookOpen, color: 'bg-amber-50' },
        { title: t.assignments, to: '/student/assignments', icon: ClipboardList, color: 'bg-emerald-50' },
        { title: lang === 'AR' ? 'سجل الحضور' : 'Attendance', to: '/student/attendance', icon: History, color: 'bg-pink-50' },
        { title: t.myTimetable, to: '/student/timetable', icon: Calendar, color: 'bg-purple-50' },
        { title: lang === 'AR' ? 'الامتحانات' : 'Exams', to: '/student/exams', icon: FileEdit, color: 'bg-orange-50' }
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{lang === 'AR' ? 'لوحة المعلومات' : 'Dashboard'}</h1>
                    <p className="font-medium text-[var(--text-secondary)] mt-1">{lang === 'AR' ? 'مرحباً بك في بوابتك الأكاديمية' : 'Welcome to your academic portal'}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-black text-gray-800">{lang === 'AR' ? 'نظرة عامة' : 'Overview'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {statsCards.map((stat, idx) => (
                        <StatCard key={idx} {...stat} />
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-black text-gray-800">{lang === 'AR' ? 'الوصول السريع' : 'Quick Access'}</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    {quickLinks.map((link, idx) => (
                        <QuickLink key={idx} {...link} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
