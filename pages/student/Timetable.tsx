
import React, { useRef, useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Download, Calendar, Printer, Loader2, Clock, User } from 'lucide-react';
import html2canvas from 'html2canvas';

const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang, isDarkMode, settings } = useApp();
  const timetableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ── Data (unchanged) ──────────────────────────────────────────────────────
  const activeSemId = settings.activeSemesterId;
  const enrollments = storage.getEnrollments().filter(e =>
    e.studentId === user?.id &&
    (!activeSemId || e.semesterId === activeSemId)
  );
  const allCourses = storage.getCourses();
  const myCourses = enrollments.map(e => allCourses.find(c => c.id === e.courseId)!).filter(Boolean);

  const scheduleRows = myCourses.map(course => ({
    day: t.days[course.day as keyof typeof t.days],
    code: course.code,
    subject: translate(course, 'title'),
    time: course.time,
    notes: course.notes,
    doctor: translate(course, 'doctor'),
  }));

  // ── Actions (unchanged logic) ─────────────────────────────────────────────
  const handlePrint = () => window.print();

  const downloadAsImage = async () => {
    const el = timetableRef.current;
    if (!el) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: isDarkMode ? '#050505' : '#F5F0E8',
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.querySelector('[data-timetable]') as HTMLElement | null;
          if (clonedEl) {
            clonedEl.style.fontFamily = '"Cairo", sans-serif';
          }
          // Ensure Cairo font is loaded in cloned doc
          const link = clonedDoc.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap';
          clonedDoc.head.appendChild(link);
        }
      });
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `Timetable_${user?.universityId}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error(err);
      alert(lang === 'AR' ? 'فشل التحميل. حاول الطباعة بدلاً من ذلك.' : 'Export failed. Please try printing instead.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Arabic print date ─────────────────────────────────────────────────────
  const printDate = new Date().toLocaleDateString('ar-SA', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  return (
    <div
      className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 print:p-0 print:m-0 print:max-w-none"
      style={{ fontFamily: '"Cairo", sans-serif' }}
    >

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary">
            {lang === 'AR' ? 'جدولي الدراسي' : 'My Timetable'}
          </h1>
          <p className="text-sm font-semibold mt-1.5 text-text-secondary">
            {lang === 'AR' ? 'استعرض جدول محاضراتك الأسبوعي' : 'View your weekly lecture schedule'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-none px-5 py-2.5 bg-card border border-border text-text-primary font-bold rounded-full hover:bg-surface transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-sm"
          >
            <Printer size={16} />
            {lang === 'AR' ? 'طباعة' : 'Print'}
          </button>
          <button
            onClick={downloadAsImage}
            disabled={isExporting}
            className="flex-1 md:flex-none bg-gold-gradient text-white px-5 py-2.5 rounded-full shadow-premium hover:shadow-premium-hover font-bold hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {t.downloadTimetable}
          </button>
        </div>
      </div>

      {/* ── Main Timetable Card ───────────────────────────────────────────── */}
      <div
        ref={timetableRef}
        data-timetable
        className="relative overflow-hidden rounded-3xl border border-border shadow-premium bg-card print:shadow-none print:border-none print:rounded-none print:bg-white"
        style={{ fontFamily: '"Cairo", sans-serif' }}
      >

        {/* Glossy radial shine — applied only to this card */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl print:hidden"
          style={{
            background: `radial-gradient(ellipse at 15% 10%, rgba(212,175,55,0.07) 0%, transparent 55%),
                         radial-gradient(ellipse at 85% 90%, rgba(212,175,55,0.04) 0%, transparent 45%)`,
          }}
        />
        {/* Subtle top-edge shimmer line */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-px print:hidden"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }}
        />

        <div className="relative p-8 md:p-12 print:p-6">

          {/* ── Card Header ──────────────────────────────────────────────── */}
          <div className="text-center mb-10 pb-8 border-b border-border/40">
            {/* Icon circle */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
              <Calendar className="text-primary" size={28} />
            </div>

            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-text-primary leading-tight">
              {lang === 'AR' ? 'جدولي الدراسي' : 'My Timetable'}
            </h2>

            {/* Student identity line */}
            <div className="inline-flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-full px-5 py-2">
              <span className="font-bold text-base text-text-primary">{user?.fullName}</span>
              <span className="w-1 h-1 rounded-full bg-primary/50 inline-block" />
              <span className="font-bold text-sm tracking-widest text-primary">{user?.universityId}</span>
            </div>
          </div>

          {/* ── Content ──────────────────────────────────────────────────── */}
          {myCourses.length > 0 ? (
            <>
              {/* Desktop Table — hidden on mobile */}
              <div className="hidden md:block overflow-x-auto rounded-2xl print:block">
                <table
                  className="w-full border-collapse"
                  dir={lang === 'AR' ? 'rtl' : 'ltr'}
                  style={{ fontFamily: '"Cairo", sans-serif' }}
                >
                  <thead>
                    <tr className="text-text-secondary">
                      {/* Gold top-border accent on each header cell */}
                      <th
                        className="px-5 py-4 w-[14%] text-xs font-black uppercase tracking-wider text-center bg-primary/5"
                        style={{ borderBottom: '2px solid rgba(212,175,55,0.25)', borderTop: '3px solid #D4AF37' }}
                      >
                        {lang === 'AR' ? 'اليوم' : 'Day'}
                      </th>
                      <th
                        className="px-5 py-4 w-[35%] text-xs font-black uppercase tracking-wider text-center bg-primary/5"
                        style={{ borderBottom: '2px solid rgba(212,175,55,0.25)', borderTop: '3px solid rgba(212,175,55,0.7)' }}
                      >
                        {lang === 'AR' ? 'المادة' : 'Subject'}
                      </th>
                      <th
                        className="px-5 py-4 w-[16%] text-xs font-black uppercase tracking-wider text-center bg-primary/5"
                        style={{ borderBottom: '2px solid rgba(212,175,55,0.25)', borderTop: '3px solid rgba(212,175,55,0.5)' }}
                      >
                        {lang === 'AR' ? 'الوقت' : 'Time'}
                      </th>
                      <th
                        className="px-5 py-4 text-xs font-black uppercase tracking-wider text-center bg-primary/5"
                        style={{ borderBottom: '2px solid rgba(212,175,55,0.25)', borderTop: '3px solid rgba(212,175,55,0.3)' }}
                      >
                        {lang === 'AR' ? 'ملاحظات' : 'Notes'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.map((row, index) => (
                      <tr
                        key={index}
                        className={`transition-colors hover:bg-primary/5 ${index % 2 === 0 ? 'bg-transparent' : 'bg-surface/30 dark:bg-white/[0.02]'
                          }`}
                        style={{ borderBottom: '1px solid rgba(var(--border-color-rgb, 232,220,200), 0.5)' }}
                      >
                        {/* Day */}
                        <td className="px-5 py-5 text-center">
                          <span className="font-black text-sm text-text-primary">{row.day}</span>
                        </td>

                        {/* Course — 3-line hierarchy */}
                        <td className="px-5 py-5" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
                          <div className="text-[11px] font-bold text-primary/70 tracking-widest mb-0.5 uppercase">
                            {row.code}
                          </div>
                          <div className="font-black text-base text-text-primary leading-snug">
                            {row.subject}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <User size={11} className="text-text-secondary opacity-60 shrink-0" />
                            <span className="text-xs font-semibold text-text-secondary">{row.doctor}</span>
                          </div>
                        </td>

                        {/* Time pill */}
                        <td className="px-5 py-5 text-center">
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                            <Clock size={11} />
                            {row.time}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="px-5 py-5 text-xs font-semibold text-text-secondary leading-relaxed text-center">
                          {row.notes ? (
                            <span className="bg-surface/60 dark:bg-white/5 border border-border/50 rounded-xl px-3 py-1.5 inline-block">
                              {row.notes}
                            </span>
                          ) : (
                            <span className="opacity-30">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Rows — visible only on mobile */}
              <div className="md:hidden print:hidden space-y-3">
                {scheduleRows.map((row, index) => (
                  <div
                    key={index}
                    className="relative rounded-2xl border border-border/60 bg-surface/40 dark:bg-white/[0.03] p-4 overflow-hidden"
                  >
                    {/* Subtle left gold bar */}
                    <div className="absolute top-0 bottom-0 start-0 w-[3px] rounded-full bg-gold-gradient" />

                    <div className="ps-3">
                      {/* Top row: day + time pill */}
                      <div className="flex items-start justify-between gap-3 mb-2.5" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
                        <span className="text-xs font-black text-primary tracking-widest uppercase">
                          {row.day}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shrink-0">
                          <Clock size={10} />
                          {row.time}
                        </span>
                      </div>

                      {/* Course info */}
                      <div dir={lang === 'AR' ? 'rtl' : 'ltr'}>
                        <div className="text-[10px] font-bold text-primary/60 tracking-widest uppercase mb-0.5">
                          {row.code}
                        </div>
                        <div className="font-black text-base text-text-primary leading-tight">
                          {row.subject}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <User size={11} className="text-text-secondary opacity-50 shrink-0" />
                          <span className="text-xs font-semibold text-text-secondary">{row.doctor}</span>
                        </div>
                      </div>

                      {/* Notes */}
                      {row.notes && (
                        <div className="mt-2.5 text-xs font-semibold text-text-secondary bg-card/60 border border-border/40 rounded-xl px-3 py-1.5">
                          {row.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/5 border border-primary/15 rounded-full mb-6">
                <Calendar className="text-primary opacity-40" size={40} />
              </div>
              <h3 className="text-2xl font-black mb-2 text-text-primary">{t.noData}</h3>
              <p className="text-sm font-semibold text-text-secondary max-w-xs mx-auto">
                {lang === 'AR'
                  ? 'لم تقم بتسجيل أي مواد بعد لهذا الفصل الدراسي'
                  : "You haven't registered for any courses this semester yet."}
              </p>
            </div>
          )}

          {/* ── Footer — Arabic print date only, no AOU REGISTRY ─────────── */}
          {myCourses.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border/30 flex items-center justify-end">
              <p className="text-xs font-bold text-text-secondary opacity-70">
                {`طُبع في: ${printDate}`}
              </p>
            </div>
          )}

        </div>{/* /relative padding wrapper */}
      </div>{/* /main card */}

    </div>
  );
};

export default StudentTimetable;
