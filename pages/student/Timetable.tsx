
import React, { useMemo, useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Calendar, Loader2, Clock, User, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT STRATEGY
// ─────────────────────────────────────────────────────────────────────────────
// We do NOT use ReactDOM.createRoot (StrictMode renders twice → duplicate rows).
// We do NOT use window.print() (browser print dialog, uncontrolled layout).
//
// Instead:
//  1. Build `exportRows` array (deduped by courseId) in useMemo.
//  2. On click: create a plain <div>, set innerHTML from buildHTML() directly.
//  3. Append to body at opacity:0.
//  4. Force Cairo font load via document.fonts.load().
//  5. html2canvas captures ONLY that div (794px wide, white bg).
//  6. jsPDF downloads the PDF.
//  7. div is removed.
//
// No React rendering, no print dialog, no screen capture.
// ─────────────────────────────────────────────────────────────────────────────

// ── Build the A4 HTML string ──────────────────────────────────────────────────
function buildExportHTML(opts: {
  rows: { day: string; code: string; subject: string; time: string; notes: string; doctor: string }[];
  fullName: string;
  universityId: string;
  printDate: string;
  isRtl: boolean;
  logoSrc: string | null;
}): string {
  const { rows, fullName, universityId, printDate, isRtl, logoSrc } = opts;

  const L = {
    title: isRtl ? 'جدولي الدراسي' : 'My Timetable',
    day: isRtl ? 'اليوم' : 'Day',
    subject: isRtl ? 'المادة' : 'Subject',
    time: isRtl ? 'الوقت' : 'Time',
    notes: isRtl ? 'ملاحظات' : 'Notes',
    footer: isRtl ? `طُبع في: ${printDate}` : `Printed: ${printDate}`,
  };

  const logoHTML = logoSrc
    ? `<img src="${logoSrc}" style="height:44px;width:auto;object-fit:contain;display:block;margin:0 auto 14px;" />`
    : `<div style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:rgba(212,175,55,0.14);margin:0 auto 14px;"><span style="font-size:12px;font-weight:900;color:#D4AF37;font-family:Cairo,sans-serif;">AOU</span></div>`;

  // Build table rows — single map, no loops outside this
  const trs = rows.map((row, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : 'rgba(212,175,55,0.03)'};">
      <td style="padding:13px 14px;border-bottom:1px solid rgba(212,175,55,0.15);text-align:center;font-weight:800;font-size:13px;color:#111111;font-family:Cairo,sans-serif;unicode-bidi:isolate;">
        ${row.day}
      </td>
      <td style="padding:13px 14px;border-bottom:1px solid rgba(212,175,55,0.15);${isRtl ? 'text-align:right;' : 'text-align:left;'}unicode-bidi:isolate;">
        <div style="font-size:9px;font-weight:800;color:#D4AF37;letter-spacing:.09em;text-transform:uppercase;margin-bottom:3px;font-family:Cairo,sans-serif;">${row.code}</div>
        <div style="font-size:14px;font-weight:900;color:#111111;line-height:1.3;font-family:Cairo,sans-serif;">${row.subject}</div>
        <div style="font-size:11px;font-weight:600;color:#6b7280;margin-top:3px;font-family:Cairo,sans-serif;">${row.doctor}</div>
      </td>
      <td style="padding:13px 14px;border-bottom:1px solid rgba(212,175,55,0.15);text-align:center;">
        <span style="display:inline-block;font-size:12px;font-weight:800;color:#D4AF37;background:rgba(212,175,55,0.10);border:1px solid rgba(212,175,55,0.28);border-radius:50px;padding:4px 13px;font-family:Cairo,sans-serif;">
          ${row.time}
        </span>
      </td>
      <td style="padding:13px 14px;border-bottom:1px solid rgba(212,175,55,0.15);text-align:center;font-size:12px;color:#6b7280;font-family:Cairo,sans-serif;">
        ${row.notes || '—'}
      </td>
    </tr>`).join('');

  return `
    <div style="
      width:794px;
      min-height:200px;
      background:#ffffff;
      font-family:Cairo,sans-serif;
      padding:52px 58px 44px;
      box-sizing:border-box;
      direction:${isRtl ? 'rtl' : 'ltr'};
      color:#111111;
    ">
      <!-- HEADER -->
      <div style="text-align:center;margin-bottom:30px;padding-bottom:24px;border-bottom:2px solid rgba(212,175,55,0.28);">
        ${logoHTML}
        <div style="font-size:26px;font-weight:900;color:#111111;letter-spacing:-0.02em;margin-bottom:12px;font-family:Cairo,sans-serif;">
          ${L.title}
        </div>
        <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.22);border-radius:50px;padding:7px 22px;">
          <span style="font-weight:700;font-size:14px;color:#111111;font-family:Cairo,sans-serif;">${fullName}</span>
          <span style="width:4px;height:4px;border-radius:50%;background:#D4AF37;display:inline-block;"></span>
          <span style="font-weight:900;font-size:13px;color:#D4AF37;letter-spacing:.1em;font-family:Cairo,sans-serif;">${universityId}</span>
        </div>
      </div>

      <!-- TABLE -->
      <table dir="${isRtl ? 'rtl' : 'ltr'}" style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;table-layout:fixed;">
        <colgroup>
          <col style="width:14%;"/>
          <col style="width:36%;"/>
          <col style="width:16%;"/>
          <col style="width:34%;"/>
        </colgroup>
        <thead>
          <tr>
            <th style="border-top:3px solid #D4AF37;border-bottom:2px solid rgba(212,175,55,0.28);background:rgba(212,175,55,0.07);padding:13px 14px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;text-align:center;color:#555555;font-family:Cairo,sans-serif;">
              ${L.day}
            </th>
            <th style="border-top:3px solid #D4AF37;border-bottom:2px solid rgba(212,175,55,0.28);background:rgba(212,175,55,0.07);padding:13px 14px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;${isRtl ? 'text-align:right;' : 'text-align:left;'}color:#555555;font-family:Cairo,sans-serif;">
              ${L.subject}
            </th>
            <th style="border-top:3px solid #D4AF37;border-bottom:2px solid rgba(212,175,55,0.28);background:rgba(212,175,55,0.07);padding:13px 14px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;text-align:center;color:#555555;font-family:Cairo,sans-serif;">
              ${L.time}
            </th>
            <th style="border-top:3px solid #D4AF37;border-bottom:2px solid rgba(212,175,55,0.28);background:rgba(212,175,55,0.07);padding:13px 14px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;text-align:center;color:#555555;font-family:Cairo,sans-serif;">
              ${L.notes}
            </th>
          </tr>
        </thead>
        <tbody>
          ${trs}
        </tbody>
      </table>

      <!-- FOOTER -->
      <div style="margin-top:28px;padding-top:12px;border-top:1px solid rgba(212,175,55,0.2);${isRtl ? 'text-align:left;' : 'text-align:right;'}font-size:10px;color:#aaaaaa;font-weight:600;font-family:Cairo,sans-serif;">
        ${L.footer}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang, settings } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const isRtl = lang === 'AR';

  // ── Course rows — deduped by courseId ──────────────────────────────────────
  const scheduleRows = useMemo(() => {
    const activeSemId = settings.activeSemesterId;
    const allEnrollments = storage.getEnrollments().filter(e =>
      e.studentId === user?.id &&
      (!activeSemId || e.semesterId === activeSemId)
    );
    const allCourses = storage.getCourses();

    // Deduplicate — a student may have duplicate enrollment records for the
    // same course across semesters or due to data errors. Keep only the first.
    const seenIds = new Set<string>();
    return allEnrollments
      .filter(e => {
        if (seenIds.has(e.courseId)) return false;
        seenIds.add(e.courseId);
        return true;
      })
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

    // 1. Create an off-screen container
    const container = document.createElement('div');
    container.style.cssText =
      'position:fixed;top:0;left:0;width:794px;opacity:0;pointer-events:none;z-index:-9999;overflow:visible;';
    document.body.appendChild(container);

    try {
      // 2. Inject static HTML — no React rendering, no StrictMode double-render
      container.innerHTML = buildExportHTML({
        rows: scheduleRows,
        fullName: user?.fullName || '',
        universityId: user?.universityId || '',
        printDate,
        isRtl,
        logoSrc,
      });

      // 3. Force Cairo font to load before capture
      await document.fonts.load('900 16px "Cairo"');
      await document.fonts.load('700 14px "Cairo"');
      await document.fonts.ready;
      // Extra buffer for layout recalculation
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise<void>(r => setTimeout(r, 350));

      // 4. Capture — target the inner content div, not the container
      const exportEl = container.firstElementChild as HTMLElement;
      if (!exportEl) throw new Error('Export element missing');

      const canvas = await html2canvas(exportEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: exportEl.scrollHeight,
        windowWidth: 794,
        windowHeight: exportEl.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });

      // 5. Build PDF
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // Canvas is at 2x scale; convert px → mm (96dpi)
      const pxPerMm = 96 / 25.4;
      const imgWmm = (canvas.width / 2) / pxPerMm;
      const imgHmm = (canvas.height / 2) / pxPerMm;

      const fit = Math.min(
        (pageW - margin * 2) / imgWmm,
        (pageH - margin * 2) / imgHmm,
        1,
      );
      const finalW = imgWmm * fit;
      const finalH = imgHmm * fit;

      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        (pageW - finalW) / 2,
        margin,
        finalW,
        finalH,
      );
      pdf.save(`Timetable_${user?.universityId || 'student'}.pdf`);

    } catch (err) {
      console.error('[Timetable Export]', err);
      alert(isRtl ? 'فشل التصدير. حاول مرة أخرى.' : 'Export failed. Please try again.');
    } finally {
      // 6. Guaranteed cleanup
      if (document.body.contains(container)) document.body.removeChild(container);
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
                        key={`row-${i}`}
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
                  <div key={`m-${i}`} className="relative rounded-2xl border border-border/60 bg-surface/40 dark:bg-white/[0.03] p-4 overflow-hidden">
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
