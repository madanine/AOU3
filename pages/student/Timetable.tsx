
import React, { useRef, useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Download, Calendar, Loader2, Clock, User, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang, settings } = useApp();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ── Data (logic unchanged) ────────────────────────────────────────────────
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

  const printDate = new Date().toLocaleDateString('ar-SA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  // ── Export PDF ────────────────────────────────────────────────────────────
  // Always captures the off-screen "export" container — A4 desktop layout,
  // never the mobile stacked view.
  const handleExportPDF = async () => {
    const el = exportRef.current;
    if (!el) return;

    setIsExporting(true);
    try {
      // Temporarily make the export container visible for capture
      el.style.visibility = 'visible';
      el.style.position = 'fixed';
      el.style.top = '-9999px';
      el.style.left = '0';
      el.style.zIndex = '-1';

      const canvas = await html2canvas(el, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: el.scrollWidth,
        height: el.scrollHeight,
        onclone: (clonedDoc) => {
          const link = clonedDoc.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap';
          clonedDoc.head.appendChild(link);
        },
      });

      el.style.visibility = 'hidden';
      el.style.position = 'absolute';

      // A4 dimensions in mm
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const a4W = pdf.internal.pageSize.getWidth();
      const a4H = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = Math.min(a4W / (imgW / 2.5), a4H / (imgH / 2.5));
      const finalW = (imgW / 2.5) * ratio;
      const finalH = (imgH / 2.5) * ratio;
      const offsetX = (a4W - finalW) / 2;
      const offsetY = (a4H - finalH) / 2;

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalW, finalH);
      pdf.save(`Timetable_${user?.universityId}.pdf`);
    } catch (err) {
      console.error(err);
      alert(lang === 'AR' ? 'فشل التصدير. حاول مرة أخرى.' : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Shared table header cell style ─────────────────────────────────────────
  const thStyle: React.CSSProperties = {
    borderBottom: '2px solid rgba(212,175,55,0.3)',
    borderTop: '3px solid #D4AF37',
    fontFamily: '"Cairo", sans-serif',
    padding: '14px 18px',
    fontSize: '11px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '.08em',
    textAlign: 'center',
    color: '#78716c',
    background: 'rgba(212,175,55,0.06)',
  };

  const tdStyle: React.CSSProperties = {
    fontFamily: '"Cairo", sans-serif',
    padding: '16px 18px',
    borderBottom: '1px solid rgba(200,190,170,0.35)',
    verticalAlign: 'middle',
  };

  return (
    <div
      className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24"
      style={{ fontFamily: '"Cairo", sans-serif' }}
    >
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary">
            {lang === 'AR' ? 'جدولي الدراسي' : 'My Timetable'}
          </h1>
          <p className="text-sm font-semibold mt-1.5 text-text-secondary">
            {lang === 'AR' ? 'استعرض جدول محاضراتك الأسبوعي' : 'View your weekly lecture schedule'}
          </p>
        </div>

        {/* Export PDF button — replaces Print entirely */}
        <button
          onClick={handleExportPDF}
          disabled={isExporting || myCourses.length === 0}
          className="flex items-center gap-2.5 px-6 py-3 bg-gold-gradient text-white rounded-xl shadow-premium hover:shadow-premium-hover font-black text-xs uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
        >
          {isExporting
            ? <Loader2 size={16} className="animate-spin" />
            : <FileText size={16} />}
          {lang === 'AR' ? 'تصدير PDF' : 'Export PDF'}
        </button>
      </div>

      {/* ── Main Visible Card ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl border border-border shadow-premium bg-card"
        style={{ fontFamily: '"Cairo", sans-serif' }}
      >
        {/* Radial gold shine */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background: `radial-gradient(ellipse at 15% 10%, rgba(212,175,55,0.07) 0%, transparent 55%),
                         radial-gradient(ellipse at 85% 90%, rgba(212,175,55,0.04) 0%, transparent 45%)`,
          }}
        />
        {/* Top shimmer line */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }}
        />

        <div className="relative p-8 md:p-12">
          {/* Card Header */}
          <div className="text-center mb-10 pb-8 border-b border-border/40">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
              <Calendar className="text-primary" size={28} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-text-primary leading-tight">
              {lang === 'AR' ? 'جدولي الدراسي' : 'My Timetable'}
            </h2>
            <div className="inline-flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-full px-5 py-2">
              <span className="font-bold text-base text-text-primary">{user?.fullName}</span>
              <span className="w-1 h-1 rounded-full bg-primary/50 inline-block" />
              <span className="font-bold text-sm tracking-widest text-primary">{user?.universityId}</span>
            </div>
          </div>

          {myCourses.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-2xl">
                <table className="w-full border-collapse" dir={lang === 'AR' ? 'rtl' : 'ltr'} style={{ fontFamily: '"Cairo", sans-serif' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{lang === 'AR' ? 'اليوم' : 'Day'}</th>
                      <th style={thStyle}>{lang === 'AR' ? 'المادة' : 'Subject'}</th>
                      <th style={thStyle}>{lang === 'AR' ? 'الوقت' : 'Time'}</th>
                      <th style={thStyle}>{lang === 'AR' ? 'ملاحظات' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.map((row, i) => (
                      <tr key={i} className={`transition-colors hover:bg-primary/5 ${i % 2 === 0 ? 'bg-transparent' : 'bg-surface/20 dark:bg-white/[0.02]'}`}>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span className="font-black text-sm text-text-primary">{row.day}</span>
                        </td>
                        <td style={tdStyle} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
                          <div className="text-[11px] font-bold text-primary/70 tracking-widest uppercase mb-0.5">{row.code}</div>
                          <div className="font-black text-base text-text-primary leading-snug">{row.subject}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <User size={11} className="text-text-secondary opacity-60 shrink-0" />
                            <span className="text-xs font-semibold text-text-secondary">{row.doctor}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                            <Clock size={11} />
                            {row.time}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {row.notes
                            ? <span className="bg-surface/60 dark:bg-white/5 border border-border/50 rounded-xl px-3 py-1.5 inline-block">{row.notes}</span>
                            : <span className="opacity-30">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {scheduleRows.map((row, i) => (
                  <div key={i} className="relative rounded-2xl border border-border/60 bg-surface/40 dark:bg-white/[0.03] p-4 overflow-hidden">
                    <div className="absolute top-0 bottom-0 start-0 w-[3px] rounded-full bg-gold-gradient" />
                    <div className="ps-3">
                      <div className="flex items-start justify-between gap-3 mb-2.5" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
                        <span className="text-xs font-black text-primary tracking-widest uppercase">{row.day}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shrink-0">
                          <Clock size={10} />{row.time}
                        </span>
                      </div>
                      <div dir={lang === 'AR' ? 'rtl' : 'ltr'}>
                        <div className="text-[10px] font-bold text-primary/60 tracking-widest uppercase mb-0.5">{row.code}</div>
                        <div className="font-black text-base text-text-primary leading-tight">{row.subject}</div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <User size={11} className="text-text-secondary opacity-50 shrink-0" />
                          <span className="text-xs font-semibold text-text-secondary">{row.doctor}</span>
                        </div>
                      </div>
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

          {myCourses.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border/30 flex items-center justify-end">
              <p className="text-xs font-bold text-text-secondary opacity-70">{`طُبع في: ${printDate}`}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Hidden A4 Export Container ────────────────────────────────────────
           This is the element that gets captured for the PDF.
           It always renders as a full desktop A4 table, regardless of screen size.
           It is hidden from the user at all times.
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        ref={exportRef}
        id="timetable-export"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '0',
          visibility: 'hidden',
          width: '794px',          /* A4 width at 96dpi */
          minHeight: '1123px',      /* A4 height at 96dpi */
          background: '#FFFFFF',
          fontFamily: '"Cairo", sans-serif',
          padding: '48px 52px',
          boxSizing: 'border-box',
          color: '#1a1a1a',
        }}
      >
        {/* Export header */}
        <div style={{ textAlign: 'center', marginBottom: '32px', paddingBottom: '24px', borderBottom: '2px solid rgba(212,175,55,0.35)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'rgba(212,175,55,0.12)', marginBottom: '14px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#1a1a1a', marginBottom: '10px', letterSpacing: '-0.02em' }}>
            {lang === 'AR' ? 'جدولي الدراسي' : 'My Timetable'}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: '50px', padding: '6px 18px',
          }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{user?.fullName}</span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(212,175,55,0.6)', display: 'inline-block' }} />
            <span style={{ fontWeight: 800, fontSize: '13px', color: '#D4AF37', letterSpacing: '.1em' }}>{user?.universityId}</span>
          </div>
        </div>

        {/* Export table — always desktop style */}
        {myCourses.length > 0 && (
          <table
            dir={lang === 'AR' ? 'rtl' : 'ltr'}
            style={{ width: '100%', borderCollapse: 'collapse', fontFamily: '"Cairo", sans-serif' }}
          >
            <thead>
              <tr>
                {[
                  lang === 'AR' ? 'اليوم' : 'Day',
                  lang === 'AR' ? 'المادة' : 'Subject',
                  lang === 'AR' ? 'الوقت' : 'Time',
                  lang === 'AR' ? 'ملاحظات' : 'Notes',
                ].map((h, i) => (
                  <th key={i} style={{
                    ...thStyle,
                    background: 'rgba(212,175,55,0.08)',
                    color: '#5a5a5a',
                    padding: '13px 16px',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : 'rgba(212,175,55,0.03)' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, fontSize: '13px', color: '#1a1a1a' }}>
                    {row.day}
                  </td>
                  <td style={{ ...tdStyle }} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#D4AF37', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '2px' }}>{row.code}</div>
                    <div style={{ fontWeight: 900, fontSize: '14px', color: '#1a1a1a', lineHeight: 1.3 }}>{row.subject}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginTop: '3px' }}>{row.doctor}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', fontWeight: 800, fontSize: '12px', color: '#D4AF37',
                      background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)',
                      borderRadius: '50px', padding: '4px 12px',
                    }}>
                      {row.time}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                    {row.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Export footer */}
        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid rgba(212,175,55,0.2)', textAlign: 'end', fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>
          {`طُبع في: ${printDate}`}
        </div>
      </div>

    </div>
  );
};

export default StudentTimetable;
