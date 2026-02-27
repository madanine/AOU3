
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Download, Calendar, Loader2, Clock, User, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ─────────────────────────────────────────────────────────────────────────────
// Static A4 Export Layout — rendered into a portal attached to <body>.
// Completely isolated from the main component tree.
// No responsive classes. No conditional stacking. Pure inline styles.
// ─────────────────────────────────────────────────────────────────────────────
interface ExportRow {
  day: string;
  code: string;
  subject: string;
  time: string;
  notes: string;
  doctor: string;
}

interface ExportLayoutProps {
  containerRef: React.RefObject<HTMLDivElement>;
  rows: ExportRow[];
  fullName: string;
  universityId: string;
  printDate: string;
  isRtl: boolean;
}

const ExportLayout: React.FC<ExportLayoutProps> = ({
  containerRef, rows, fullName, universityId, printDate, isRtl,
}) => {
  const col = {
    day: isRtl ? 'اليوم' : 'Day',
    subject: isRtl ? 'المادة' : 'Subject',
    time: isRtl ? 'الوقت' : 'Time',
    notes: isRtl ? 'ملاحظات' : 'Notes',
    title: isRtl ? 'جدولي الدراسي' : 'My Timetable',
    printed: isRtl ? `طُبع في: ${printDate}` : `Printed: ${printDate}`,
  };

  const container: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: '-9999px',
    width: '794px',
    minHeight: '1123px',
    background: '#ffffff',
    fontFamily: '"Cairo", "Segoe UI", sans-serif',
    padding: '52px 56px',
    boxSizing: 'border-box',
    color: '#111111',
    zIndex: -1,
    pointerEvents: 'none',
    overflow: 'hidden',
  };

  const headerWrapper: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '36px',
    paddingBottom: '28px',
    borderBottom: '2px solid rgba(212,175,55,0.3)',
  };

  const iconBox: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: 'rgba(212,175,55,0.12)',
    marginBottom: '14px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '30px',
    fontWeight: 900,
    color: '#111111',
    margin: '0 0 12px 0',
    letterSpacing: '-0.02em',
    fontFamily: '"Cairo", "Segoe UI", sans-serif',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(212,175,55,0.07)',
    border: '1px solid rgba(212,175,55,0.22)',
    borderRadius: '50px',
    padding: '7px 20px',
  };

  const table: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: '"Cairo", "Segoe UI", sans-serif',
    tableLayout: 'fixed',
  };

  const th = (extra?: React.CSSProperties): React.CSSProperties => ({
    borderTop: '3px solid #D4AF37',
    borderBottom: '2px solid rgba(212,175,55,0.3)',
    background: 'rgba(212,175,55,0.07)',
    padding: '13px 14px',
    fontSize: '11px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    textAlign: 'center',
    color: '#555555',
    fontFamily: '"Cairo", "Segoe UI", sans-serif',
    ...extra,
  });

  const td = (even: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '14px 14px',
    borderBottom: '1px solid rgba(212,175,55,0.18)',
    background: even ? '#ffffff' : 'rgba(212,175,55,0.025)',
    verticalAlign: 'middle',
    fontFamily: '"Cairo", "Segoe UI", sans-serif',
    ...extra,
  });

  return createPortal(
    <div ref={containerRef} style={container} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div style={headerWrapper}>
        <div style={iconBox}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div style={titleStyle}>{col.title}</div>
        <div style={badgeStyle}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#111111' }}>{fullName}</span>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(212,175,55,0.6)', display: 'inline-block' }} />
          <span style={{ fontWeight: 800, fontSize: '13px', color: '#D4AF37', letterSpacing: '.1em' }}>{universityId}</span>
        </div>
      </div>

      {/* Table — single pass, fixed layout, no responsive logic */}
      <table style={table} dir={isRtl ? 'rtl' : 'ltr'}>
        <colgroup>
          <col style={{ width: '14%' }} />
          <col style={{ width: '36%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '33%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={th()}>{col.day}</th>
            <th style={th({ textAlign: isRtl ? 'right' : 'left', paddingRight: '16px', paddingLeft: '16px' })}>{col.subject}</th>
            <th style={th()}>{col.time}</th>
            <th style={th()}>{col.notes}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`export-row-${i}`}>
              {/* Day */}
              <td style={td(i % 2 === 0, { textAlign: 'center', fontWeight: 800, fontSize: '13px' })}>
                {row.day}
              </td>
              {/* Subject */}
              <td style={td(i % 2 === 0, { textAlign: isRtl ? 'right' : 'left', paddingRight: '16px', paddingLeft: '16px' })}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#D4AF37', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '3px' }}>
                  {row.code}
                </div>
                <div style={{ fontWeight: 900, fontSize: '14px', color: '#111111', lineHeight: 1.35 }}>
                  {row.subject}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginTop: '3px' }}>
                  {row.doctor}
                </div>
              </td>
              {/* Time */}
              <td style={td(i % 2 === 0, { textAlign: 'center' })}>
                <span style={{
                  display: 'inline-block', fontWeight: 800, fontSize: '12px',
                  color: '#D4AF37', background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.28)',
                  borderRadius: '50px', padding: '4px 13px',
                }}>
                  {row.time}
                </span>
              </td>
              {/* Notes */}
              <td style={td(i % 2 === 0, { textAlign: 'center', fontSize: '12px', color: '#6b7280' })}>
                {row.notes || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{
        marginTop: '36px', paddingTop: '14px',
        borderTop: '1px solid rgba(212,175,55,0.2)',
        textAlign: 'end', fontSize: '11px', color: '#9ca3af', fontWeight: 600,
      }}>
        {col.printed}
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Timetable Component
// ─────────────────────────────────────────────────────────────────────────────
const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang, settings } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  // Stable export container ref — attached to document.body via portal
  const exportContainerRef = React.useRef<HTMLDivElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const activeSemId = settings.activeSemesterId;

  const scheduleRows = useMemo(() => {
    const enrollments = storage.getEnrollments().filter(e =>
      e.studentId === user?.id &&
      (!activeSemId || e.semesterId === activeSemId)
    );
    const allCourses = storage.getCourses();
    return enrollments
      .map(e => allCourses.find(c => c.id === e.courseId)!)
      .filter(Boolean)
      .map(course => ({
        day: t.days[course.day as keyof typeof t.days],
        code: course.code,
        subject: translate(course, 'title'),
        time: course.time,
        notes: course.notes || '',
        doctor: translate(course, 'doctor'),
      }));
  }, [user?.id, activeSemId, t, translate]);

  const isRtl = lang === 'AR';
  const printDate = new Date().toLocaleDateString('ar-SA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  // ── PDF Export ────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    const el = exportContainerRef.current;
    if (!el || isExporting) return;

    setIsExporting(true);
    try {
      await document.fonts.ready; // ensure Cairo is loaded

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Capture the exact element only — no context outside it
        width: el.offsetWidth,
        height: el.scrollHeight,
        windowWidth: el.offsetWidth,
        windowHeight: el.scrollHeight,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const a4W = pdf.internal.pageSize.getWidth();   // 210mm
      const a4H = pdf.internal.pageSize.getHeight();  // 297mm
      const pxToMm = 25.4 / 96;

      const imgWmm = canvas.width / 2 * pxToMm;
      const imgHmm = canvas.height / 2 * pxToMm;

      // Scale to fit A4 with 8mm margin
      const margin = 8;
      const maxW = a4W - margin * 2;
      const maxH = a4H - margin * 2;
      const scale = Math.min(maxW / imgWmm, maxH / imgHmm, 1);
      const finalW = imgWmm * scale;
      const finalH = imgHmm * scale;
      const offsetX = (a4W - finalW) / 2;
      const offsetY = (a4H - finalH) / 2;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', offsetX, offsetY, finalW, finalH);
      pdf.save(`Timetable_${user?.universityId || 'student'}.pdf`);
    } catch (err) {
      console.error('[PDF Export]', err);
      alert(isRtl ? 'فشل التصدير. حاول مرة أخرى.' : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Hidden static export layout injected into <body> ─────────────── */}
      <ExportLayout
        containerRef={exportContainerRef}
        rows={scheduleRows}
        fullName={user?.fullName || ''}
        universityId={user?.universityId || ''}
        printDate={printDate}
        isRtl={isRtl}
      />

      {/* ── Visible Page ─────────────────────────────────────────────────── */}
      <div
        className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24"
        style={{ fontFamily: '"Cairo", sans-serif' }}
      >
        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-text-primary">
              {isRtl ? 'جدولي الدراسي' : 'My Timetable'}
            </h1>
            <p className="text-sm font-semibold mt-1.5 text-text-secondary">
              {isRtl ? 'استعرض جدول محاضراتك الأسبوعي' : 'View your weekly lecture schedule'}
            </p>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={isExporting || scheduleRows.length === 0}
            className="flex items-center gap-2.5 px-6 py-3 bg-gold-gradient text-white rounded-xl shadow-premium hover:shadow-premium-hover font-black text-xs uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
          >
            {isExporting
              ? <Loader2 size={16} className="animate-spin" />
              : <FileText size={16} />}
            {isRtl ? 'تصدير PDF' : 'Export PDF'}
          </button>
        </div>

        {/* Main visible timetable card */}
        <div
          className="relative overflow-hidden rounded-3xl border border-border shadow-premium bg-card"
          style={{ fontFamily: '"Cairo", sans-serif' }}
        >
          {/* Radial glow */}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background: `radial-gradient(ellipse at 15% 10%, rgba(212,175,55,0.07) 0%, transparent 55%),
                           radial-gradient(ellipse at 85% 90%, rgba(212,175,55,0.04) 0%, transparent 45%)`,
            }}
          />
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }}
          />

          <div className="relative p-8 md:p-12">
            {/* Card header */}
            <div className="text-center mb-10 pb-8 border-b border-border/40">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
                <Calendar className="text-primary" size={28} />
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-text-primary leading-tight">
                {isRtl ? 'جدولي الدراسي' : 'My Timetable'}
              </h2>
              <div className="inline-flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-full px-5 py-2">
                <span className="font-bold text-base text-text-primary">{user?.fullName}</span>
                <span className="w-1 h-1 rounded-full bg-primary/50 inline-block" />
                <span className="font-bold text-sm tracking-widest text-primary">{user?.universityId}</span>
              </div>
            </div>

            {scheduleRows.length > 0 ? (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-2xl">
                  <table className="w-full border-collapse" dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: '"Cairo", sans-serif' }}>
                    <thead>
                      <tr>
                        {[
                          { label: isRtl ? 'اليوم' : 'Day', width: '14%' },
                          { label: isRtl ? 'المادة' : 'Subject', width: '36%' },
                          { label: isRtl ? 'الوقت' : 'Time', width: '17%' },
                          { label: isRtl ? 'ملاحظات' : 'Notes', width: '33%' },
                        ].map(h => (
                          <th
                            key={h.label}
                            style={{ width: h.width, borderTop: '3px solid #D4AF37', borderBottom: '2px solid rgba(212,175,55,0.25)' }}
                            className="px-5 py-4 text-xs font-black uppercase tracking-wider text-center text-text-secondary bg-primary/5"
                          >
                            {h.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleRows.map((row, i) => (
                        <tr
                          key={`row-${i}`}
                          className={`transition-colors hover:bg-primary/5 ${i % 2 === 0 ? 'bg-transparent' : 'bg-surface/20 dark:bg-white/[0.02]'}`}
                          style={{ borderBottom: '1px solid rgba(212,175,55,0.15)' }}
                        >
                          <td className="px-5 py-5 text-center">
                            <span className="font-black text-sm text-text-primary">{row.day}</span>
                          </td>
                          <td className="px-5 py-5" dir={isRtl ? 'rtl' : 'ltr'}>
                            <div className="text-[11px] font-bold text-primary/70 tracking-widest uppercase mb-0.5">{row.code}</div>
                            <div className="font-black text-base text-text-primary leading-snug">{row.subject}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <User size={11} className="text-text-secondary opacity-60 shrink-0" />
                              <span className="text-xs font-semibold text-text-secondary">{row.doctor}</span>
                            </div>
                          </td>
                          <td className="px-5 py-5 text-center">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                              <Clock size={11} />{row.time}
                            </span>
                          </td>
                          <td className="px-5 py-5 text-center text-xs font-semibold text-text-secondary">
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
                    <div key={`mobile-${i}`} className="relative rounded-2xl border border-border/60 bg-surface/40 dark:bg-white/[0.03] p-4 overflow-hidden">
                      <div className="absolute top-0 bottom-0 start-0 w-[3px] rounded-full bg-gold-gradient" />
                      <div className="ps-3">
                        <div className="flex items-start justify-between gap-3 mb-2.5" dir={isRtl ? 'rtl' : 'ltr'}>
                          <span className="text-xs font-black text-primary tracking-widest uppercase">{row.day}</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shrink-0">
                            <Clock size={10} />{row.time}
                          </span>
                        </div>
                        <div dir={isRtl ? 'rtl' : 'ltr'}>
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
                  {isRtl
                    ? 'لم تقم بتسجيل أي مواد بعد لهذا الفصل الدراسي'
                    : "You haven't registered for any courses this semester yet."}
                </p>
              </div>
            )}

            {scheduleRows.length > 0 && (
              <div className="mt-10 pt-6 border-t border-border/30 flex items-center justify-end">
                <p className="text-xs font-bold text-text-secondary opacity-70">{`طُبع في: ${printDate}`}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentTimetable;
