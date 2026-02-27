
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Calendar, Loader2, Clock, User, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import TimetableExportView, { type TimetableRow } from '../../components/timetable/TimetableExportView';

// ─────────────────────────────────────────────────────────────────────────────
// Export pipeline:
// 1. Build scheduleRows (memoized, exactly one entry per enrolled course).
// 2. On click: create a hidden div, mount TimetableExportView into it via
//    createRoot (completely outside the visible React tree).
// 3. html2canvas captures ONLY that div — 794px wide, white background.
// 4. jsPDF adds the canvas as an image and saves as PDF download.
// 5. createRoot.unmount() + div removal cleans up.
//
// NO window.print(), NO portal, NO DOM cloning, NO screen capture.
// ─────────────────────────────────────────────────────────────────────────────

const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang, settings } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const isRtl = lang === 'AR';

  // ── Data — built ONCE, shared between visible UI and export ───────────────
  const scheduleRows = useMemo<TimetableRow[]>(() => {
    const activeSemId = settings.activeSemesterId;
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
  }, [user?.id, settings.activeSemesterId, t, translate]);

  const printDate = new Date().toLocaleDateString('ar-SA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const logoSrc = settings.branding.logo || settings.branding.logoBase64 || null;

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (isExporting || scheduleRows.length === 0) return;
    setIsExporting(true);

    // Hidden mount container — off-screen but rendered, invisible to user
    const mountDiv = document.createElement('div');
    mountDiv.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:794px',
      'height:auto',
      'overflow:visible',
      'opacity:0',
      'pointer-events:none',
      'z-index:-9999',
      'background:#ffffff',
    ].join(';');
    document.body.appendChild(mountDiv);

    // Mount the dedicated export component — completely separate React root
    const exportRoot = createRoot(mountDiv);
    exportRoot.render(
      <TimetableExportView
        rows={scheduleRows}
        fullName={user?.fullName || ''}
        universityId={user?.universityId || ''}
        printDate={printDate}
        isRtl={isRtl}
        logoSrc={logoSrc}
      />
    );

    try {
      // Wait for React to flush + Cairo to load
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      await new Promise<void>(resolve => setTimeout(resolve, 600));

      // Target the rendered root element (794px wide, auto height)
      const exportEl = mountDiv.firstElementChild as HTMLElement | null;
      if (!exportEl) throw new Error('Export element not found');

      const canvas = await html2canvas(exportEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Capture exactly this element — no window clipping
        width: exportEl.scrollWidth,
        height: exportEl.scrollHeight,
        windowWidth: exportEl.scrollWidth,
        windowHeight: exportEl.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });

      // Build PDF — fit to A4 with 10mm margins
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();   // 210mm
      const pageH = pdf.internal.pageSize.getHeight();  // 297mm
      const margin = 10;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;

      // canvas is at scale:2, so real px = canvas.width / 2
      const pxPerMm = 96 / 25.4;
      const imgWmm = (canvas.width / 2) / pxPerMm;
      const imgHmm = (canvas.height / 2) / pxPerMm;

      const scale = Math.min(maxW / imgWmm, maxH / imgHmm, 1);
      const finalW = imgWmm * scale;
      const finalH = imgHmm * scale;
      const offsetX = (pageW - finalW) / 2;
      const offsetY = margin;

      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        offsetX, offsetY,
        finalW, finalH,
      );

      pdf.save(`Timetable_${user?.universityId || 'student'}.pdf`);
    } catch (err) {
      console.error('[Timetable PDF]', err);
      alert(isRtl ? 'فشل التصدير. حاول مرة أخرى.' : 'Export failed. Please try again.');
    } finally {
      // Guaranteed cleanup — unmount React root then remove DOM node
      exportRoot.unmount();
      if (document.body.contains(mountDiv)) {
        document.body.removeChild(mountDiv);
      }
      setIsExporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
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
          className="flex items-center gap-2.5 px-6 py-3 bg-gold-gradient text-white rounded-xl shadow-premium hover:shadow-premium-hover font-black text-xs uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting
            ? <Loader2 size={16} className="animate-spin" />
            : <FileText size={16} />}
          {isRtl ? 'تصدير PDF' : 'Export PDF'}
        </button>
      </div>

      {/* Main card */}
      <div
        className="relative overflow-hidden rounded-3xl border border-border shadow-premium bg-card"
        style={{ fontFamily: '"Cairo", sans-serif' }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              'radial-gradient(ellipse at 15% 10%, rgba(212,175,55,0.07) 0%, transparent 55%),' +
              'radial-gradient(ellipse at 85% 90%, rgba(212,175,55,0.04) 0%, transparent 45%)',
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
                <table
                  className="w-full border-collapse"
                  dir={isRtl ? 'rtl' : 'ltr'}
                  style={{ fontFamily: '"Cairo", sans-serif', tableLayout: 'fixed' }}
                >
                  <colgroup>
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '34%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {[
                        { label: isRtl ? 'اليوم' : 'Day', align: 'center' },
                        { label: isRtl ? 'المادة' : 'Subject', align: isRtl ? 'right' : 'left' },
                        { label: isRtl ? 'الوقت' : 'Time', align: 'center' },
                        { label: isRtl ? 'ملاحظات' : 'Notes', align: 'center' },
                      ].map(h => (
                        <th
                          key={h.label}
                          style={{
                            borderTop: '3px solid #D4AF37',
                            borderBottom: '2px solid rgba(212,175,55,0.25)',
                            textAlign: h.align as any,
                          }}
                          className="px-5 py-4 text-xs font-black uppercase tracking-wider text-text-secondary bg-primary/5"
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.map((row, i) => (
                      <tr
                        key={`visible-${i}`}
                        className={`transition-colors hover:bg-primary/5 ${i % 2 === 0 ? 'bg-transparent' : 'bg-surface/20 dark:bg-white/[0.02]'}`}
                        style={{ borderBottom: '1px solid rgba(212,175,55,0.12)' }}
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
  );
};

export default StudentTimetable;
