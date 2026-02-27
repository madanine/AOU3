
import React, { useMemo, useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Calendar, Loader2, Clock, User, FileText } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// buildExportHTML — Generates a 100% self-contained HTML string for the PDF.
// Opens in a new window → auto-triggers browser print dialog → user saves as PDF.
// No html2canvas, no portal, no screenshot. Clean, guaranteed correct layout.
// ─────────────────────────────────────────────────────────────────────────────
interface ExportRow {
  day: string;
  code: string;
  subject: string;
  time: string;
  notes: string;
  doctor: string;
}

function buildExportHTML(opts: {
  rows: ExportRow[];
  fullName: string;
  universityId: string;
  printDate: string;
  isRtl: boolean;
  logoSrc: string | null;
}): string {
  const { rows, fullName, universityId, printDate, isRtl, logoSrc } = opts;

  const labels = {
    title: isRtl ? 'جدولي الدراسي' : 'My Timetable',
    day: isRtl ? 'اليوم' : 'Day',
    subject: isRtl ? 'المادة' : 'Subject',
    time: isRtl ? 'الوقت' : 'Time',
    notes: isRtl ? 'ملاحظات' : 'Notes',
    printed: isRtl ? `طُبع في: ${printDate}` : `Printed: ${printDate}`,
  };

  const rowsHTML = rows.map((row, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : 'rgba(212,175,55,0.04)'}">
      <td style="padding:14px 16px;border-bottom:1px solid rgba(212,175,55,0.18);text-align:center;font-weight:800;font-size:13px;color:#111;">
        ${row.day}
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid rgba(212,175,55,0.18);${isRtl ? 'text-align:right' : 'text-align:left'}">
        <div style="font-size:9px;font-weight:800;color:#D4AF37;letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px;">${row.code}</div>
        <div style="font-size:14px;font-weight:900;color:#111;line-height:1.3;">${row.subject}</div>
        <div style="font-size:11px;font-weight:600;color:#6b7280;margin-top:3px;">${row.doctor}</div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid rgba(212,175,55,0.18);text-align:center;">
        <span style="display:inline-block;font-size:12px;font-weight:800;color:#D4AF37;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.28);border-radius:50px;padding:4px 14px;">
          ${row.time}
        </span>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid rgba(212,175,55,0.18);text-align:center;font-size:12px;color:#6b7280;">
        ${row.notes || '—'}
      </td>
    </tr>
  `).join('');

  const logoHTML = logoSrc
    ? `<img src="${logoSrc}" alt="Logo" style="height:32px;width:auto;object-fit:contain;display:block;margin-bottom:10px;margin-left:auto;margin-right:auto;" />`
    : `<div style="height:32px;width:32px;border-radius:8px;background:rgba(212,175,55,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;"><span style="font-size:11px;font-weight:900;color:#D4AF37;">AOU</span></div>`;

  return `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${labels.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  @page {
    size: A4 portrait;
    margin: 14mm 14mm 14mm 14mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', 'Segoe UI', sans-serif !important;
    background: #ffffff;
    color: #111111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .export-root {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: 0;
  }
  .header {
    text-align: center;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 2px solid rgba(212,175,55,0.30);
  }
  .title {
    font-family: 'Cairo', sans-serif !important;
    font-size: 28px;
    font-weight: 900;
    color: #111;
    letter-spacing: -.02em;
    margin-bottom: 12px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(212,175,55,0.07);
    border: 1px solid rgba(212,175,55,0.22);
    border-radius: 50px;
    padding: 7px 20px;
  }
  .badge-name { font-family: 'Cairo', sans-serif !important; font-weight: 700; font-size: 14px; color: #111; }
  .badge-sep  { width: 4px; height: 4px; border-radius: 50%; background: rgba(212,175,55,0.6); display: inline-block; }
  .badge-id   { font-family: 'Cairo', sans-serif !important; font-weight: 800; font-size: 13px; color: #D4AF37; letter-spacing: .1em; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Cairo', sans-serif !important;
    table-layout: fixed;
  }
  th {
    font-family: 'Cairo', sans-serif !important;
    border-top: 3px solid #D4AF37;
    border-bottom: 2px solid rgba(212,175,55,0.28);
    background: rgba(212,175,55,0.07) !important;
    padding: 13px 16px;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .07em;
    text-align: center;
    color: #555;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  td { font-family: 'Cairo', sans-serif !important; }

  .footer {
    margin-top: 32px;
    padding-top: 14px;
    border-top: 1px solid rgba(212,175,55,0.2);
    text-align: ${isRtl ? 'left' : 'right'};
    font-family: 'Cairo', sans-serif !important;
    font-size: 10px;
    color: #9ca3af;
    font-weight: 600;
  }

  @media print {
    body { background: #fff !important; }
    .export-root { max-width: 100%; }
  }
</style>
</head>
<body>
<div class="export-root">
  <div class="header">
    ${logoHTML}
    <div class="title">${labels.title}</div>
    <div class="badge">
      <span class="badge-name">${fullName}</span>
      <span class="badge-sep"></span>
      <span class="badge-id">${universityId}</span>
    </div>
  </div>

  <table dir="${isRtl ? 'rtl' : 'ltr'}">
    <colgroup>
      <col style="width:14%;"/>
      <col style="width:37%;"/>
      <col style="width:16%;"/>
      <col style="width:33%;"/>
    </colgroup>
    <thead>
      <tr>
        <th>${labels.day}</th>
        <th style="${isRtl ? 'text-align:right' : 'text-align:left'};padding-right:16px;padding-left:16px;">${labels.subject}</th>
        <th>${labels.time}</th>
        <th>${labels.notes}</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>

  <div class="footer">${labels.printed}</div>
</div>

<script>
  // Wait for Cairo font to load, then auto-print
  document.fonts.ready.then(function() {
    setTimeout(function() { window.print(); }, 400);
  });
  // Close the window after print dialog is dismissed
  window.addEventListener('afterprint', function() { window.close(); });
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Timetable Component
// ─────────────────────────────────────────────────────────────────────────────
const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang, settings } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const isRtl = lang === 'AR';

  const scheduleRows = useMemo(() => {
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

  // ── Export PDF via new window ─────────────────────────────────────────────
  // Opens a fully self-contained print window with Cairo loaded.
  // auto-triggers print dialog → user saves as PDF. No html2canvas.
  const handleExportPDF = () => {
    if (isExporting || scheduleRows.length === 0) return;
    setIsExporting(true);

    try {
      const html = buildExportHTML({
        rows: scheduleRows,
        fullName: user?.fullName || '',
        universityId: user?.universityId || '',
        printDate,
        isRtl,
        logoSrc,
      });

      const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
      if (!win) {
        alert(isRtl
          ? 'يرجى السماح للنوافذ المنبثقة لهذا الموقع'
          : 'Please allow popups for this site to export the PDF');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (err) {
      console.error('[Export PDF]', err);
      alert(isRtl ? 'فشل التصدير. حاول مرة أخرى.' : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24"
      style={{ fontFamily: '"Cairo", sans-serif' }}
    >
      {/* ── Page Header ──────────────────────────────────────────────────── */}
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
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          {isRtl ? 'تصدير PDF' : 'Export PDF'}
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
                    <col style={{ width: '37%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '33%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {[
                        { label: isRtl ? 'اليوم' : 'Day' },
                        { label: isRtl ? 'المادة' : 'Subject', align: isRtl ? 'right' : 'left' },
                        { label: isRtl ? 'الوقت' : 'Time' },
                        { label: isRtl ? 'ملاحظات' : 'Notes' },
                      ].map(h => (
                        <th
                          key={h.label}
                          style={{ borderTop: '3px solid #D4AF37', borderBottom: '2px solid rgba(212,175,55,0.25)', textAlign: (h.align as any) || 'center' }}
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
              <p className="text-xs font-bold text-text-secondary opacity-70">
                {`طُبع في: ${printDate}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentTimetable;
