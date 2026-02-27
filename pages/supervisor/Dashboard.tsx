
import React, { useMemo } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Link } from 'react-router-dom';
import {
    BookOpen, Users, ClipboardList, CheckCircle,
    ChevronLeft, ChevronRight, LayoutGrid
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SUPERVISOR DASHBOARD
// Operational management view — NO hero card.
// Layout: Summary row → Assigned courses grid → Quick actions
// Student count per course is calculated from live enrollment data.
// ─────────────────────────────────────────────────────────────────────────────

const SupervisorDashboard: React.FC = () => {
    const { user, lang, settings, translate } = useApp();
    const isAr = lang === 'AR';
    const ChevronIcon = isAr ? ChevronLeft : ChevronRight;

    const allCourses = storage.getCourses();
    const allEnrollments = storage.getEnrollments();

    // Courses assigned to this supervisor
    const assignedCourseIds = user?.assignedCourses || [];
    const assignedCourses = allCourses.filter(c => assignedCourseIds.includes(c.id));

    // Per-course student count (unique students enrolled in that course, any semester)
    const studentCountByCourse = useMemo(() => {
        const map: Record<string, number> = {};
        for (const course of assignedCourses) {
            const students = new Set(
                allEnrollments
                    .filter(e => e.courseId === course.id)
                    .map(e => e.studentId)
            );
            map[course.id] = students.size;
        }
        return map;
    }, [assignedCourses, allEnrollments]);

    // Summary totals
    const totalStudents = useMemo(() => {
        const unique = new Set(
            allEnrollments
                .filter(e => assignedCourseIds.includes(e.courseId))
                .map(e => e.studentId)
        );
        return unique.size;
    }, [allEnrollments, assignedCourseIds]);

    const totalSessions = useMemo(() => {
        const att = storage.getAttendance();
        let count = 0;
        for (const cid of assignedCourseIds) {
            const byCourse = att[cid] || {};
            const sessions = Object.values(byCourse)[0]?.length || 0;
            count += sessions;
        }
        return count;
    }, [assignedCourseIds]);

    // Quick action links based on permissions
    const quickActions = [
        ...(user?.supervisorPermissions?.attendance
            ? [{ label: isAr ? 'تسجيل الغياب' : 'Attendance', to: '/supervisor/attendance', icon: CheckCircle, color: 'rgba(63,111,78,0.12)', iconColor: '#3F6F4E' }]
            : []),
        ...(user?.supervisorPermissions?.assignments
            ? [{ label: isAr ? 'الواجبات' : 'Assignments', to: '/supervisor/assignments', icon: ClipboardList, color: 'rgba(212,175,55,0.12)', iconColor: '#C9A84C' }]
            : []),
        ...(user?.supervisorPermissions?.grading
            ? [{ label: isAr ? 'التصحيح' : 'Grading', to: '/supervisor/grading', icon: BookOpen, color: 'rgba(212,175,55,0.12)', iconColor: '#C9A84C' }]
            : []),
    ];

    const logoSrc = settings.branding.logo || settings.branding.logoBase64 || null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-12" dir={isAr ? 'rtl' : 'ltr'}>

            {/* ── Header ───────────────────────────────────────────────────────── */}
            <div className="flex items-start gap-4">
                {logoSrc && (
                    <img src={logoSrc} alt="" className="h-10 w-auto object-contain opacity-80 shrink-0 mt-1" />
                )}
                <div>
                    <p className="text-sm font-semibold text-text-secondary">
                        {isAr ? 'لوحة تحكم المشرف' : 'Supervisor Panel'}
                    </p>
                    <h1 className="text-3xl font-black tracking-tight text-text-primary leading-tight">
                        {user?.fullName}
                    </h1>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════
          SUMMARY ROW — 3 equal operational cards
      ════════════════════════════════════════════════════════════════════ */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex gap-4 items-center shadow-sm">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(212,175,55,0.12)' }}>
                        <BookOpen size={20} style={{ color: '#C9A84C' }} strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-80">
                            {isAr ? 'عدد المواد المكلف بها' : 'Assigned Courses'}
                        </p>
                        <p className="text-3xl font-black text-text-primary leading-none mt-0.5">
                            {assignedCourses.length}
                        </p>
                    </div>
                    <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
                        style={{ background: 'linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)' }} />
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex gap-4 items-center shadow-sm">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(99,102,241,0.10)' }}>
                        <Users size={20} style={{ color: '#6366f1' }} strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-80">
                            {isAr ? 'إجمالي الطلاب' : 'Total Students'}
                        </p>
                        <p className="text-3xl font-black text-text-primary leading-none mt-0.5">
                            {totalStudents}
                        </p>
                    </div>
                    <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
                        style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex gap-4 items-center shadow-sm">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(63,111,78,0.12)' }}>
                        <LayoutGrid size={20} style={{ color: '#3F6F4E' }} strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-80">
                            {isAr ? 'إجمالي الحصص المسجلة' : 'Total Sessions'}
                        </p>
                        <p className="text-3xl font-black text-text-primary leading-none mt-0.5">
                            {totalSessions}
                        </p>
                    </div>
                    <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
                        style={{ background: 'linear-gradient(90deg,transparent,rgba(63,111,78,0.4),transparent)' }} />
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════
          ASSIGNED COURSES SECTION
      ════════════════════════════════════════════════════════════════════ */}
            <section>
                <h2 className="text-xs font-black uppercase tracking-[.15em] text-text-secondary opacity-70 mb-4">
                    {isAr ? 'المواد المكلف بها' : 'Assigned Courses'}
                </h2>

                {assignedCourses.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-12 text-center">
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                            style={{ background: 'rgba(212,175,55,0.10)' }}>
                            <BookOpen size={24} style={{ color: '#C9A84C' }} strokeWidth={1.5} />
                        </div>
                        <p className="font-bold text-text-secondary text-sm">
                            {isAr ? 'لم يتم تكليفك بأي مواد بعد' : 'No courses assigned yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assignedCourses.map(course => {
                            const count = studentCountByCourse[course.id] || 0;
                            return (
                                <div key={course.id}
                                    className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all group">

                                    {/* Gold accent line */}
                                    <div className="absolute top-0 left-0 right-0 h-[2px]"
                                        style={{ background: 'linear-gradient(90deg,rgba(212,175,55,0.6),rgba(212,175,55,0.15),transparent)' }} />

                                    {/* Course code */}
                                    <span className="text-[9px] font-black uppercase tracking-[.18em] opacity-60 text-primary">
                                        {course.code}
                                    </span>

                                    {/* Course name */}
                                    <div>
                                        <h3 className="font-black text-base text-text-primary leading-snug mb-0.5">
                                            {translate(course, 'title')}
                                        </h3>
                                        <p className="text-xs font-semibold text-text-secondary">
                                            {translate(course, 'doctor') || course.doctor}
                                        </p>
                                    </div>

                                    {/* Student count badge */}
                                    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface/40 dark:bg-white/[0.03] px-3 py-2 w-fit">
                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: 'rgba(99,102,241,0.12)' }}>
                                            <Users size={13} style={{ color: '#6366f1' }} strokeWidth={2} />
                                        </div>
                                        <span className="text-xs font-bold text-text-primary">{count}</span>
                                        <span className="text-xs text-text-secondary opacity-70">
                                            {isAr ? 'طالب' : count === 1 ? 'student' : 'students'}
                                        </span>
                                    </div>

                                    {/* Schedule */}
                                    {course.day && (
                                        <p className="text-[10px] font-semibold text-text-secondary opacity-60">
                                            {isAr ? (course as any).day_ar || course.day : course.day}
                                            {course.time ? ` · ${course.time}` : ''}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ════════════════════════════════════════════════════════════════════
          QUICK ACTIONS
      ════════════════════════════════════════════════════════════════════ */}
            {quickActions.length > 0 && (
                <section>
                    <h2 className="text-xs font-black uppercase tracking-[.15em] text-text-secondary opacity-70 mb-4">
                        {isAr ? 'الوصول السريع' : 'Quick Access'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {quickActions.map((a, i) => (
                            <Link key={i} to={a.to}
                                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all group">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: a.color }}>
                                    <a.icon size={18} style={{ color: a.iconColor }} strokeWidth={2} />
                                </div>
                                <span className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors flex-1">
                                    {a.label}
                                </span>
                                <ChevronIcon size={16} className="text-text-secondary opacity-40 group-hover:opacity-80 transition-opacity" />
                            </Link>
                        ))}
                    </div>
                </section>
            )}

        </div>
    );
};

export default SupervisorDashboard;
