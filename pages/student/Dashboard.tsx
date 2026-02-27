
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { supabaseService } from '../../supabaseService';
import { Link } from 'react-router-dom';
import {
    BookOpen, GraduationCap, ClipboardList, Calendar,
    History, FileEdit, CheckCircle, XCircle
} from 'lucide-react';
import { StatCard } from '../../components/dashboard/StatCard';
import { ChartBlock } from '../../components/dashboard/ChartBlock';
import StudentIDCard from '../../components/dashboard/StudentIDCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const StudentDashboard: React.FC = () => {
    const { user, t, lang, settings } = useApp();

    const [data, setData] = useState({
        courses: storage.getCourses(),
        enrollments: storage.getEnrollments().filter(e => e.studentId === user?.id),
        assignments: storage.getAssignments(),
        attendances: storage.getAttendance(),
        submissions: storage.getSubmissions().filter(s => s.studentId === user?.id),
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleUpdate = () => {
            setData({
                courses: storage.getCourses(),
                enrollments: storage.getEnrollments().filter(e => e.studentId === user?.id),
                assignments: storage.getAssignments(),
                attendances: storage.getAttendance(),
                submissions: storage.getSubmissions().filter(s => s.studentId === user?.id),
            });
        };
        window.addEventListener('storage-update', handleUpdate);
        return () => window.removeEventListener('storage-update', handleUpdate);
    }, [user?.id]);

    const activeSemesterId = settings.activeSemesterId;
    const currentEnrollments = data.enrollments.filter(
        e => !activeSemesterId || e.semesterId === activeSemesterId
    );
    const myCourses = data.courses.filter(c =>
        currentEnrollments.some(e => e.courseId === c.id)
    );

    // ── Charts data ──────────────────────────────────────────────────────────
    const attendanceData = useMemo(() => {
        let present = 0;
        let absent = 0;
        myCourses.forEach(course => {
            const rec = (data.attendances[course.id] || {})[user?.id || ''] || [];
            rec.forEach((s: boolean | null) => {
                if (s === true) present++;
                else if (s === false) absent++;
            });
        });
        if (present === 0 && absent === 0) return [];
        return [
            { name: lang === 'AR' ? 'حاضر' : 'Present', value: present, color: '#3F6F4E' },
            { name: lang === 'AR' ? 'غائب' : 'Absent', value: absent, color: '#f43f5e' },
        ];
    }, [data.attendances, myCourses, user?.id, lang]);

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
                    maxGrade: (assignment as any)?.maxScore || 100,
                };
            })
            .slice(-5);
    }, [data.submissions, data.assignments, data.courses, lang]);

    // ── Quick links ──────────────────────────────────────────────────────────
    const QuickLink = ({ title, to, icon: Icon, colorClass }: any) => (
        <Link
            to={to}
            className="flex flex-col items-center justify-center bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-premium-hover hover:-translate-y-1 transition-all group"
        >
            <div className={`w-16 h-16 rounded-[20px] ${colorClass} text-white shadow-premium flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={32} />
            </div>
            <h3 className="text-sm font-black text-text-primary text-center">{title}</h3>
        </Link>
    );

    const quickLinks = [
        { title: t.registration, to: '/student/registration', icon: GraduationCap, colorClass: 'bg-gold-gradient' },
        { title: t.myCourses, to: '/student/my-courses', icon: BookOpen, colorClass: 'bg-gold-gradient' },
        { title: t.assignments, to: '/student/assignments', icon: ClipboardList, colorClass: 'bg-card border border-border !text-text-primary' },
        { title: lang === 'AR' ? 'سجل الحضور' : 'Attendance', to: '/student/attendance', icon: History, colorClass: 'bg-success' },
        { title: t.myTimetable, to: '/student/timetable', icon: Calendar, colorClass: 'bg-card border border-border !text-text-primary' },
        { title: lang === 'AR' ? 'الامتحانات' : 'Exams', to: '/student/exams', icon: FileEdit, colorClass: 'bg-gold-gradient' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-10">

            {/* ── Welcome banner ─────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-premium-radial blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-title">{lang === 'AR' ? 'لوحة المعلومات' : 'Dashboard'}</h1>
                    <p className="font-medium text-text-secondary mt-2 flex items-center gap-2">
                        <span>{lang === 'AR' ? 'مرحباً،' : 'Hello,'}</span>
                        <span className="text-primary font-bold">{user?.fullName}</span>
                    </p>
                </div>
            </div>

            {/* ── Single stat card (المواد الحالية) + ID Card ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Stat: Current courses */}
                <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both">
                    <StatCard
                        isLoading={loading}
                        title={lang === 'AR' ? 'المواد الحالية' : 'Current Courses'}
                        value={myCourses.length}
                        icon={BookOpen}
                        colorClass="bg-gold-gradient"
                    />
                </div>

                {/* University ID Card — spans 2 cols on large screens */}
                <div className="lg:col-span-2 flex justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-4 delay-100 fill-mode-both">
                    <div className="w-full max-w-sm lg:max-w-md xl:max-w-lg">
                        <h2 className="text-xs font-black uppercase tracking-widest text-text-secondary mb-3" style={{ fontFamily: '"Cairo", sans-serif' }}>
                            {lang === 'AR' ? 'بطاقتي الجامعية' : 'University ID Card'}
                        </h2>
                        <StudentIDCard />
                    </div>
                </div>

            </div>

            {/* ── Analytics charts ───────────────────────────────────────────────── */}
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
                            cx="50%" cy="50%"
                            innerRadius={60} outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {attendanceData.map((entry, i) => (
                                <Cell key={`cell-${i}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                            itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: 'var(--text-secondary)' }} />
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                        <Tooltip
                            cursor={{ fill: 'var(--surface-bg)' }}
                            contentStyle={{ borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                            formatter={(value: any, _name: any, props: any) => [`${value} / ${props.payload.maxGrade}`, lang === 'AR' ? 'الدرجة' : 'Score']}
                            labelFormatter={(label) => <span className="font-bold">{label}</span>}
                        />
                        <Bar dataKey="grade" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40}>
                            {gradesData.map((entry, i) => (
                                <Cell key={`cell-${i}`} fill={entry.grade / entry.maxGrade >= 0.5 ? 'var(--success)' : '#f43f5e'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartBlock>

            </div>

            {/* ── Quick links ────────────────────────────────────────────────────── */}
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                <h2 className="text-section mb-6 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-surface text-primary border border-border flex items-center justify-center">
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
