import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { supabaseService } from '../../supabaseService';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, ClipboardList, Calendar, History, FileEdit, Clock, CheckCircle, XCircle } from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { ChartBlock } from '../../components/dashboard/ChartBlock';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const StudentDashboard: React.FC = () => {
    const { user, t, lang, settings } = useApp();

    const [data, setData] = useState({
        courses: storage.getCourses(),
        enrollments: storage.getEnrollments().filter(e => e.studentId === user?.id),
        assignments: storage.getAssignments(),
        attendances: storage.getAttendance(),
        submissions: storage.getSubmissions().filter(s => s.studentId === user?.id)
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
                courses: storage.getCourses(),
                enrollments: storage.getEnrollments().filter(e => e.studentId === user?.id),
                assignments: storage.getAssignments(),
                attendances: storage.getAttendance(),
                submissions: storage.getSubmissions().filter(s => s.studentId === user?.id)
            });
        };
        window.addEventListener('storage-update', handleUpdate);
        return () => window.removeEventListener('storage-update', handleUpdate);
    }, [user?.id]);

    const activeSemesterId = settings.activeSemesterId;
    const currentEnrollments = data.enrollments.filter(e => !activeSemesterId || e.semesterId === activeSemesterId);
    const myCourses = data.courses.filter(c => currentEnrollments.some(e => e.courseId === c.id));

    // Stats
    const activeAssignments = data.assignments.filter(a => myCourses.some(mc => mc.id === a.courseId));
    const pendingAssignmentsCount = activeAssignments.filter(a => !data.submissions.some(s => s.assignmentId === a.id)).length;

    const upcomingExamsCount = exams.filter(e => {
        if (activeSemesterId && e.semesterId !== activeSemesterId) return false;
        if (!myCourses.some(mc => mc.id === e.courseId)) return false;
        if (!e.endTime) return false;
        return new Date(e.endTime) >= new Date();
    }).length;

    // --- CHARTS DATA ---

    // 1. Attendance Overview (Pie Chart)
    const attendanceData = useMemo(() => {
        let present = 0;
        let absent = 0;

        myCourses.forEach(course => {
            const courseAttendance = data.attendances[course.id] || {};
            const myRecord = courseAttendance[user?.id || ''] || [];
            myRecord.forEach(status => {
                if (status === true) present++;
                else if (status === false) absent++;
            });
        });

        if (present === 0 && absent === 0) return [];

        return [
            { name: lang === 'AR' ? 'حاضر' : 'Present', value: present, color: '#10b981' }, // emerald-500
            { name: lang === 'AR' ? 'غائب' : 'Absent', value: absent, color: '#f43f5e' } // rose-500
        ];
    }, [data.attendances, myCourses, user?.id, lang]);

    // 2. Assignment Grades (Bar Chart)
    const gradesData = useMemo(() => {
        return data.submissions
            .filter(s => s.status === 'graded' && s.grade !== undefined && s.grade !== null)
            .map(s => {
                const assignment = data.assignments.find(a => a.id === s.assignmentId);
                const course = data.courses.find(c => c.id === assignment?.courseId);
                return {
                    name: assignment ? assignment.title : 'Unknown',
                    course: course ? (lang === 'AR' ? course.title_ar : course.title) : '',
                    grade: s.grade || 0,
                    maxGrade: assignment?.maxScore || 100
                };
            })
            .slice(-5); // last 5 graded
    }, [data.submissions, data.assignments, data.courses, lang]);


    // --- UI RENDER HELPERS ---
    const QuickLink = ({ title, to, icon: Icon, colorClass }: any) => (
        <Link to={to} className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className={`w-16 h-16 rounded-[20px] ${colorClass} bg-opacity-10 shadow-inner flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={32} className={colorClass.replace('bg-', 'text-').replace('-500', '-600').replace('-50', '-600')} />
            </div>
            <h3 className="text-sm font-black text-gray-800 text-center">{title}</h3>
        </Link>
    );

    const statsCards = [
        { title: lang === 'AR' ? 'المواد الحالية' : 'Current Courses', value: myCourses.length, icon: BookOpen, colorClass: 'bg-blue-500' },
        { title: lang === 'AR' ? 'واجبات معلقة' : 'Pending Assignments', value: pendingAssignmentsCount, icon: Clock, colorClass: 'bg-amber-500' },
        { title: lang === 'AR' ? 'امتحانات قادمة' : 'Upcoming Exams', value: upcomingExamsCount, icon: FileEdit, colorClass: 'bg-rose-500' },
    ];

    const quickLinks = [
        { title: t.registration, to: '/student/registration', icon: GraduationCap, colorClass: 'bg-blue-500' },
        { title: t.myCourses, to: '/student/my-courses', icon: BookOpen, colorClass: 'bg-amber-500' },
        { title: t.assignments, to: '/student/assignments', icon: ClipboardList, colorClass: 'bg-emerald-500' },
        { title: lang === 'AR' ? 'سجل الحضور والمشاركة' : 'Attendance', to: '/student/attendance', icon: History, colorClass: 'bg-pink-500' },
        { title: t.myTimetable, to: '/student/timetable', icon: Calendar, colorClass: 'bg-purple-500' },
        { title: lang === 'AR' ? 'الامتحانات' : 'Exams', to: '/student/exams', icon: FileEdit, colorClass: 'bg-orange-500' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-10">

            {/* Header Container */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-black tracking-tight text-gray-800">{lang === 'AR' ? 'لوحة المعلومات' : 'Dashboard'}</h1>
                    <p className="font-medium text-gray-500 mt-2 flex items-center gap-2">
                        <span>{lang === 'AR' ? 'مرحباً،' : 'Hello,'}</span>
                        <span className="text-[var(--primary)] font-bold">{user?.fullName}</span>
                    </p>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {statsCards.map((stat, idx) => (
                        <div key={idx} style={{ animationDelay: `${idx * 50}ms` }} className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both">
                            <StatCard isLoading={loading} {...stat} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">

                {/* Attendance Pie Chart */}
                <ChartBlock
                    title={lang === 'AR' ? 'إحصاءات الحضور' : 'Attendance Overview'}
                    subtitle={lang === 'AR' ? 'لجميع المواد الحالية' : 'Across all current courses'}
                    icon={CheckCircle}
                    isLoading={loading}
                    isEmpty={attendanceData.length === 0}
                    emptyMessage={lang === 'AR' ? 'لا توجد بيانات حضور مسجلة' : 'No attendance data recorded yet'}
                >
                    <PieChart>
                        <Pie
                            data={attendanceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {attendanceData.map((entry, index) => (
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

                {/* Grades Bar Chart */}
                <ChartBlock
                    title={lang === 'AR' ? 'أحدث الدرجات' : 'Recent Grades'}
                    subtitle={lang === 'AR' ? 'درجات آخر 5 واجبات تم تصحيحها' : 'Scores for last 5 graded assignments'}
                    icon={GraduationCap}
                    isLoading={loading}
                    isEmpty={gradesData.length === 0}
                    emptyMessage={lang === 'AR' ? 'لا توجد واجبات مصححة' : 'No graded assignments yet'}
                >
                    <BarChart data={gradesData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                        <Tooltip
                            cursor={{ fill: '#F3F4F6' }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value, name, props) => [`${value} / ${props.payload.maxGrade}`, lang === 'AR' ? 'الدرجة' : 'Score']}
                            labelFormatter={(label) => <span className="font-bold text-gray-800">{label}</span>}
                        />
                        <Bar dataKey="grade" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40}>
                            {gradesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.grade / entry.maxGrade >= 0.5 ? '#10b981' : '#f43f5e'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartBlock>

            </div>

            {/* Quick Links */}
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                        <History size={16} />
                    </div>
                    {lang === 'AR' ? 'الوصول السريع' : 'Quick Access'}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    {quickLinks.map((link, idx) => (
                        <div key={idx} style={{ animationDelay: `${idx * 40 + 300}ms` }} className="animate-in zoom-in-95 duration-500 fill-mode-both">
                            <QuickLink {...link} />
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default StudentDashboard;
