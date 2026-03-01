import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Link } from 'react-router-dom';
import {
    BookOpen, GraduationCap, ClipboardList, Calendar,
    History, FileEdit, CheckCircle, AlertCircle
} from 'lucide-react';
import StudentIDCard from '../../components/dashboard/StudentIDCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT DASHBOARD — Layout: Hero Card → Stats Row → Charts → Quick Links
// ─────────────────────────────────────────────────────────────────────────────

const StudentDashboard: React.FC = () => {
    const { user, t, lang, settings, translate } = useApp();
    const isAr = lang === 'AR';

    const [data, setData] = useState({
        courses: storage.getCourses(),
        enrollments: storage.getEnrollments().filter(e => e.studentId === user?.id),
        assignments: storage.getAssignments(),
        attendances: storage.getAttendance(),
        submissions: storage.getSubmissions().filter(s => s.studentId === user?.id),
    });

    useEffect(() => {
        const refresh = () => setData({
            courses: storage.getCourses(),
            enrollments: storage.getEnrollments().filter(e => e.studentId === user?.id),
            assignments: storage.getAssignments(),
            attendances: storage.getAttendance(),
            submissions: storage.getSubmissions().filter(s => s.studentId === user?.id),
        });
        window.addEventListener('storage-update', refresh);
        return () => window.removeEventListener('storage-update', refresh);
    }, [user?.id]);

    const currentEnrollments = data.enrollments.filter(
        e => !settings.activeSemesterId || e.semesterId === settings.activeSemesterId
    );
    // Deduplicated enrolled courses
    const seen = new Set<string>();
    const myCourses = data.courses.filter(c =>
        currentEnrollments.some(e => e.courseId === c.id) && !seen.has(c.id) && seen.add(c.id)
    );

    // ── Attendance stats ──────────────────────────────────────────────────────
    const { presentCount, totalSessions } = useMemo(() => {
        let present = 0, total = 0;
        myCourses.forEach(course => {
            const rec = (data.attendances[course.id] || {})[user?.id || ''] || [];
            rec.forEach((s: boolean | null) => { if (s === true) present++; if (s !== null) total++; });
        });
        return { presentCount: present, totalSessions: total };
    }, [data.attendances, myCourses, user?.id]);

    // ── Unsubmitted assignments (B2) ─────────────────────────────────────────
    // All assignments for the student's current semester courses that have no
    // matching submission and are still before or on deadline.
    const activeAssignments = data.assignments.filter(a =>
        myCourses.some(c => c.id === a.courseId) &&
        (!settings.activeSemesterId || a.semesterId === settings.activeSemesterId)
    );
    const unsubmittedCount = activeAssignments.filter(
        a => !data.submissions.some(s => s.assignmentId === a.id)
    ).length;

    // ── Pie chart data ────────────────────────────────────────────────────────
    const attendanceData = useMemo(() => {
        const absent = totalSessions - presentCount;
        if (presentCount === 0 && absent === 0) return [];
        return [
            { name: isAr ? 'حاضر' : 'Present', value: presentCount, color: '#3F6F4E' },
            { name: isAr ? 'غائب' : 'Absent', value: absent, color: '#f43f5e' },
        ];
    }, [presentCount, totalSessions, isAr]);

    // ── Grades data ──────────────────────────────────────────────────────────
    const gradesData = useMemo(() =>
        data.submissions
            .filter(s => s.status === 'graded' && s.grade !== undefined && s.grade !== null)
            .map(s => {
                const asgn = data.assignments.find(a => a.id === s.assignmentId);
                const course = data.courses.find(c => c.id === asgn?.courseId);
                return {
                    name: asgn ? asgn.title : '—',
                    course: course ? course.title : '', // Assuming course.title is directly available
                    grade: s.grade || 0,
                    maxGrade: (asgn as any)?.maxScore || 100,
                };
            })
            .slice(-5),
        [data.submissions, data.assignments, data.courses]);

    // ── Quick links ───────────────────────────────────────────────────────────
    const quickLinks = [
        { title: t.registration, to: '/student/registration', icon: GraduationCap },
        { title: t.myCourses, to: '/student/my-courses', icon: BookOpen },
        { title: t.assignments, to: '/student/assignments', icon: ClipboardList },
        { title: isAr ? 'سجل الحضور' : 'Attendance', to: '/student/attendance', icon: History },
        { title: t.myTimetable, to: '/student/timetable', icon: Calendar },
        { title: isAr ? 'الامتحانات' : 'Exams', to: '/student/exams', icon: FileEdit },
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-12" dir={isAr ? 'rtl' : 'ltr'}>

            {/* ── Welcome header ───────────────────────────────────────────────── */}
            <div>
                <p className="text-sm font-semibold text-text-secondary mb-1">
                    {isAr ? 'مرحباً،' : 'Welcome back,'}
                </p>
                <h1 className="text-3xl font-black tracking-tight text-text-primary">
                    {user?.fullName}
                </h1>
            </div>

            {/* ════════════════════════════════════════════════════════════════════
          HERO SECTION — VIP Student Card centered, 75% width
      ════════════════════════════════════════════════════════════════════ */}
            <section className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-text-secondary opacity-70">
                    {isAr ? 'بطاقتي الجامعية' : 'University ID Card'}
                </p>
                <div style={{ width: 'min(75%, 420px)', maxWidth: '420px', minWidth: '280px' }}>
                    <StudentIDCard />
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════
          STATS ROW — 3 equal cards below the VIP card
      ════════════════════════════════════════════════════════════════════ */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Card 1 — المواد الحالية */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex gap-4 items-center shadow-sm">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(212,175,55,0.12)' }}>
                        <BookOpen size={20} style={{ color: '#C9A84C' }} strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-80">
                            {isAr ? 'المواد الحالية' : 'Current Courses'}
                        </p>
                        <p className="text-3xl font-black text-text-primary leading-none mt-0.5">
                            {myCourses.length}
                        </p>
                    </div>
                    <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
                        style={{ background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)' }} />
                </div>

                {/* Card 2 — B2: Unsubmitted Assignments (real dynamic count) */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex gap-4 items-center shadow-sm">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: unsubmittedCount > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(63,111,78,0.10)' }}>
                        <AlertCircle size={20} style={{ color: unsubmittedCount > 0 ? '#ef4444' : '#3F6F4E' }} strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-80">
                            {isAr ? 'واجبات غير مسلَّمة' : 'Unsubmitted Assignments'}
                        </p>
                        <p className="text-3xl font-black leading-none mt-0.5" style={{ color: unsubmittedCount > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                            {unsubmittedCount}
                        </p>
                    </div>
                    <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
                        style={{ background: unsubmittedCount > 0 ? 'linear-gradient(90deg,transparent,rgba(239,68,68,0.4),transparent)' : 'linear-gradient(90deg,transparent,rgba(63,111,78,0.4),transparent)' }} />
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════
          CHARTS — Attendance + Grades
      ════════════════════════════════════════════════════════════════════ */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Attendance Pie */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(63,111,78,0.12)' }}>
                            <CheckCircle size={16} style={{ color: '#3F6F4E' }} strokeWidth={2} />
                        </div>
                        <div>
                            <p className="font-black text-sm text-text-primary">{isAr ? 'إحصاءات الحضور' : 'Attendance Overview'}</p>
                            <p className="text-[10px] text-text-secondary opacity-70">{isAr ? 'لجميع المواد الحالية' : 'Across all current courses'}</p>
                        </div>
                    </div>
                    {attendanceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                {/* B3: No inline labels to prevent mobile overlap — legend only */}
                                <Pie data={attendanceData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                    paddingAngle={5} dataKey="value" stroke="none">
                                    {attendanceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                                    formatter={(v: any, name: any) => [`${v} ${isAr ? 'جلسة' : 'sessions'}`, name]} />
                                <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ color: 'var(--text-secondary)', fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-sm text-text-secondary opacity-60">
                            {isAr ? 'لا توجد بيانات حضور مسجلة' : 'No attendance data yet'}
                        </div>
                    )}
                </div>

                {/* Grades Bar */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)' }}>
                            <GraduationCap size={16} style={{ color: '#C9A84C' }} strokeWidth={2} />
                        </div>
                        <div>
                            <p className="font-black text-sm text-text-primary">{isAr ? 'أحدث الدرجات' : 'Recent Grades'}</p>
                            <p className="text-[10px] text-text-secondary opacity-70">{isAr ? 'آخر 5 واجبات مصححة' : 'Last 5 graded assignments'}</p>
                        </div>
                    </div>
                    {gradesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={gradesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                                <Tooltip cursor={{ fill: 'var(--surface-bg)' }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                                    formatter={(v: any, _, p: any) => [`${v} / ${p.payload.maxGrade}`, isAr ? 'الدرجة' : 'Score']} />
                                <Bar dataKey="grade" radius={[6, 6, 0, 0]} barSize={32}>
                                    {gradesData.map((e, i) => <Cell key={i} fill={e.grade / e.maxGrade >= 0.5 ? '#3F6F4E' : '#f43f5e'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-sm text-text-secondary opacity-60">
                            {isAr ? 'لا توجد واجبات مصححة' : 'No graded assignments yet'}
                        </div>
                    )}
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════
          QUICK ACCESS LINKS
      ════════════════════════════════════════════════════════════════════ */}
            <section>
                <h2 className="text-xs font-black uppercase tracking-[.15em] text-text-secondary opacity-70 mb-4">
                    {isAr ? 'الوصول السريع' : 'Quick Access'}
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {quickLinks.map((link, i) => (
                        <Link key={i} to={link.to}
                            className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: 'rgba(212,175,55,0.10)' }}>
                                <link.icon size={18} style={{ color: '#C9A84C' }} strokeWidth={2} />
                            </div>
                            <span className="text-[10px] font-bold text-text-secondary text-center leading-tight group-hover:text-primary transition-colors">
                                {link.title}
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

        </div>
    );
};

export default StudentDashboard;
