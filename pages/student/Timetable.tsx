
import React, { useMemo, useState } from 'react';
import { useApp } from '../../App';
import { storage } from '../../storage';
import { Calendar, Loader2, Clock, User, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

// ─────────────────────────────────────────────────────────────────────────────
// WHY CANVAS 2D INSTEAD OF html2canvas:
// html2canvas re-implements the browser text renderer in JS and loses Arabic
// letter-joining rules (Unicode shaping). CanvasRenderingContext2D.fillText()
// with ctx.direction = 'rtl' uses the native browser shaper → correct Arabic.
// ─────────────────────────────────────────────────────────────────────────────

interface Row { day: string; code: string; subject: string; time: string; notes: string; doctor: string; }

// ── Draw everything onto a canvas and return it ──────────────────────────────
async function drawTimetable(p: {
  rows: Row[]; fullName: string; universityId: string;
  printDate: string; isRtl: boolean; logoSrc: string | null;
}): Promise<HTMLCanvasElement> {
  const W = 794, SCALE = 2, M = 58;
  const GOLD = '#D4AF37', GOLD_A = 'rgba(212,175,55,', DARK = '#111', MUTED = '#6b7280';
  const F = (w: number, s: number) => `${w} ${s}px Cairo, sans-serif`;
  const ROW_H = 74, TH_H = 44;
  const totalH = 52 + 50 + 16 + 40 + 14 + 38 + 28 + 2 + 24 + TH_H + p.rows.length * ROW_H + 24 + 2 + 42 + 36;

  const cv = document.createElement('canvas');
  cv.width = W * SCALE; cv.height = totalH * SCALE;
  const ctx = cv.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const text = (str: string, x: number, y: number, font: string, color: string,
    align: CanvasTextAlign = 'center', dir: CanvasDirection = 'ltr', maxW?: number) => {
    ctx.save(); ctx.font = font; ctx.fillStyle = color;
    ctx.textAlign = align; ctx.direction = dir; ctx.textBaseline = 'middle';
    maxW ? ctx.fillText(str, x, y, maxW) : ctx.fillText(str, x, y);
    ctx.restore();
  };
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  const hgrad = (y: number, x1: number, x2: number, a: number) => {
    const g = ctx.createLinearGradient(x1, y, x2, y);
    g.addColorStop(0, 'transparent'); g.addColorStop(.45, GOLD_A + a + ')');
    g.addColorStop(.55, GOLD_A + a + ')'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(x1, y, x2 - x1, 2);
  };

  // Ensure Cairo is loaded
  await document.fonts.load(F(900, 20)); await document.fonts.load(F(700, 14));
  await document.fonts.load(F(600, 12)); await document.fonts.ready;

  // White background
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, totalH);

  let cy = 52;
  const CW = W - M * 2; // 678px content width

  // Column x positions (RTL: Day=rightmost, Notes=leftmost)
  // Day(14%) | Subject(36%) | Time(16%) | Notes(34%)  reading R→L
  // In canvas x coords (L→R): [Notes(34%) | Time(16%) | Subject(36%) | Day(14%)]
  const CX = {
    day: { l: M + CW * .66, r: M + CW, cx: M + CW * .93 },
    subject: { l: M + CW * .30, r: M + CW * .66, cx: M + CW * .48 },
    time: { l: M + CW * .14, r: M + CW * .30, cx: M + CW * .22 },
    notes: { l: M, r: M + CW * .14, cx: M + CW * .07 },
  };
  // For RTL timetable, swap day↔notes and subject↔time positions:
  // Day on right = rightmost in canvas X too ✓ (already correct above)

  // ── Logo ────────────────────────────────────────────────────────────────
  if (p.logoSrc) {
    const img = new Image(); img.crossOrigin = 'anonymous';
    await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = p.logoSrc!; });
    if (img.naturalWidth) {
      const lh = 44, lw = img.naturalWidth * (lh / img.naturalHeight);
      ctx.drawImage(img, (W - lw) / 2, cy, lw, lh);
    }
  } else {
    ctx.save(); ctx.fillStyle = GOLD_A + '.12)'; rr((W - 44) / 2, cy, 44, 44, 10); ctx.fill(); ctx.restore();
    text('AOU', W / 2, cy + 22, F(900, 13), GOLD);
  }
  cy += 50 + 16;

  // ── Title ────────────────────────────────────────────────────────────────
  const title = p.isRtl ? 'جدولي الدراسي' : 'My Timetable';
  text(title, W / 2, cy + 18, F(900, 26), DARK, 'center', p.isRtl ? 'rtl' : 'ltr');
  cy += 40 + 14;

  // ── Name badge ───────────────────────────────────────────────────────────
  const badgeH = 38, badgeW = 240, badgeX = (W - badgeW) / 2;
  ctx.save(); ctx.fillStyle = GOLD_A + '.08)'; rr(badgeX, cy, badgeW, badgeH, 19); ctx.fill();
  ctx.strokeStyle = GOLD_A + '.22)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  if (p.isRtl) {
    text(p.fullName, W / 2 + 8, cy + badgeH / 2, F(700, 14), DARK, 'right', 'rtl');
    ctx.save(); ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(W / 2, cy + badgeH / 2, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    text(p.universityId, W / 2 - 10, cy + badgeH / 2, F(900, 13), GOLD, 'left', 'ltr');
  } else {
    text(`${p.fullName}  ·  ${p.universityId}`, W / 2, cy + badgeH / 2, F(700, 14), DARK);
  }
  cy += badgeH + 28;

  // ── Divider ──────────────────────────────────────────────────────────────
  hgrad(cy, M, W - M, .28); cy += 2 + 24;

  // ── Table header ─────────────────────────────────────────────────────────
  ctx.save(); ctx.fillStyle = GOLD_A + '.07)'; ctx.fillRect(M, cy, CW, TH_H); ctx.restore();
  ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(M, cy); ctx.lineTo(M + CW, cy); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.strokeStyle = GOLD_A + '.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, cy + TH_H); ctx.lineTo(M + CW, cy + TH_H); ctx.stroke(); ctx.restore();

  const thLabels = p.isRtl
    ? [['day', 'اليوم'], ['subject', 'المادة'], ['time', 'الوقت'], ['notes', 'ملاحظات']]
    : [['day', 'Day'], ['subject', 'Subject'], ['time', 'Time'], ['notes', 'Notes']];

  for (const [col, label] of thLabels) {
    const c = CX[col as keyof typeof CX];
    text(label, c.cx, cy + TH_H / 2, F(800, 10), '#555', 'center', p.isRtl ? 'rtl' : 'ltr');
  }
  cy += TH_H;

  // ── Table rows ────────────────────────────────────────────────────────────
  for (let i = 0; i < p.rows.length; i++) {
    const row = p.rows[i];
    const ry = cy + i * ROW_H;

    // Row bg
    if (i % 2 !== 0) { ctx.save(); ctx.fillStyle = GOLD_A + '.025)'; ctx.fillRect(M, ry, CW, ROW_H); ctx.restore(); }
    // Row border
    ctx.save(); ctx.strokeStyle = GOLD_A + '.13)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(M, ry + ROW_H); ctx.lineTo(M + CW, ry + ROW_H); ctx.stroke(); ctx.restore();

    const mid = ry + ROW_H / 2;
    const dir: CanvasDirection = p.isRtl ? 'rtl' : 'ltr';

    // Day column
    text(row.day, CX.day.cx, mid, F(800, 13), DARK, 'center', dir);

    // Subject column — code / subject / doctor
    const sR = p.isRtl ? CX.subject.r - 8 : CX.subject.l + 8;
    const sAlign: CanvasTextAlign = p.isRtl ? 'right' : 'left';
    const subW = CX.subject.r - CX.subject.l - 16;
    text(row.code, sR, mid - 22, F(700, 9), GOLD, sAlign, 'ltr');
    text(row.subject, sR, mid - 6, F(900, 14), DARK, sAlign, dir, subW);
    text(row.doctor, sR, mid + 14, F(600, 11), MUTED, sAlign, dir, subW);

    // Time column — single line with pill
    const timeStr = row.time.includes('-') ? row.time : row.time;
    const tW = ctx.measureText(timeStr).width + 26;
    ctx.save(); ctx.fillStyle = GOLD_A + '.10)'; rr(CX.time.cx - tW / 2, mid - 13, tW, 26, 13); ctx.fill();
    ctx.strokeStyle = GOLD_A + '.28)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    text(timeStr, CX.time.cx, mid, F(800, 11), GOLD, 'center', 'ltr');

    // Notes column
    const notesText = row.notes && !row.notes.startsWith('http') ? row.notes : '—';
    text(notesText, CX.notes.cx, mid, F(600, 11), MUTED, 'center', dir, CX.notes.r - CX.notes.l - 8);
  }
  cy += p.rows.length * ROW_H + 24;

  // ── Footer ────────────────────────────────────────────────────────────────
  hgrad(cy, M, W - M, .18); cy += 2 + 14;
  const footerLabel = p.isRtl ? `طُبع في: ${p.printDate}` : `Printed: ${p.printDate}`;
  text(footerLabel, p.isRtl ? M + 8 : W - M - 8, cy + 14,
    F(600, 10), '#aaa', p.isRtl ? 'left' : 'right', p.isRtl ? 'rtl' : 'ltr');

  return cv;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const StudentTimetable: React.FC = () => {
  const { user, t, translate, lang, settings } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const isRtl = lang === 'AR';

  const scheduleRows = useMemo<Row[]>(() => {
    const activeSemId = settings.activeSemesterId;
    const seen = new Set<string>();
    return storage.getEnrollments()
      .filter(e =>
        e.studentId === user?.id &&
        (!activeSemId || e.semesterId === activeSemId) &&
        !seen.has(e.courseId) && seen.add(e.courseId)
      )
      .map(e => storage.getCourses().find(c => c.id === e.courseId)!)
      .filter(Boolean)
      .map(course => ({
        day: t.days[course.day as keyof typeof t.days],
        code: course.code,
        subject: translate(course, 'title'),
        // Format time as single line: "10:00 – 12:00"
        time: (course.time || '').replace(/\s*[-–]\s*/g, ' – ').trim(),
        notes: course.notes || '',
        doctor: translate(course, 'doctor'),
      }));
  }, [user?.id, settings.activeSemesterId, t, translate]);

  const printDate = new Date().toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const logoSrc = settings.branding.logo || settings.branding.logoBase64 || null;

  const handleExportPDF = async () => {
    if (isExporting || scheduleRows.length === 0) return;
    setIsExporting(true);
    try {
      const canvas = await drawTimetable({
        rows: scheduleRows, fullName: user?.fullName || '',
        universityId: user?.universityId || '', printDate, isRtl, logoSrc,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = pdf.internal.pageSize.getWidth();
      const PH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const pxmm = 96 / 25.4;
      const imgW = (canvas.width / 2) / pxmm;
      const imgH = (canvas.height / 2) / pxmm;
      const fit = Math.min((PW - margin * 2) / imgW, (PH - margin * 2) / imgH, 1);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG',
        (PW - imgW * fit) / 2, margin, imgW * fit, imgH * fit);
      pdf.save(`Timetable_${user?.universityId || 'student'}.pdf`);
    } catch (e) {
      console.error(e);
      alert(isRtl ? 'فشل التصدير' : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24" style={{ fontFamily: '"Cairo", sans-serif' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary">{isRtl ? 'جدولي الدراسي' : 'My Timetable'}</h1>
          <p className="text-sm font-semibold mt-1.5 text-text-secondary">{isRtl ? 'استعرض جدول محاضراتك الأسبوعي' : 'View your weekly lecture schedule'}</p>
        </div>
        <button onClick={handleExportPDF} disabled={isExporting || scheduleRows.length === 0}
          className="flex items-center gap-2.5 px-6 py-3 bg-gold-gradient text-white rounded-xl shadow-premium hover:shadow-premium-hover font-black text-xs uppercase tracking-widest hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          {isRtl ? 'تصدير PDF' : 'Export PDF'}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border shadow-premium bg-card" style={{ fontFamily: '"Cairo", sans-serif' }}>
        <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(ellipse at 15% 10%, rgba(212,175,55,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(212,175,55,0.04) 0%, transparent 45%)' }} />
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }} />

        <div className="relative p-8 md:p-12">
          <div className="text-center mb-10 pb-8 border-b border-border/40">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5"><Calendar className="text-primary" size={28} /></div>
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-text-primary leading-tight">{isRtl ? 'جدولي الدراسي' : 'My Timetable'}</h2>
            <div className="inline-flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-full px-5 py-2">
              <span className="font-bold text-base text-text-primary">{user?.fullName}</span>
              <span className="w-1 h-1 rounded-full bg-primary/50 inline-block" />
              <span className="font-bold text-sm tracking-widest text-primary">{user?.universityId}</span>
            </div>
          </div>

          {scheduleRows.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto rounded-2xl">
                <table className="w-full border-collapse" dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: '"Cairo", sans-serif', tableLayout: 'fixed' }}>
                  <colgroup><col style={{ width: '14%' }} /><col style={{ width: '36%' }} /><col style={{ width: '16%' }} /><col style={{ width: '34%' }} /></colgroup>
                  <thead><tr>
                    {[
                      { l: isRtl ? 'اليوم' : 'Day', a: 'center' },
                      { l: isRtl ? 'المادة' : 'Subject', a: isRtl ? 'right' : 'left' },
                      { l: isRtl ? 'الوقت' : 'Time', a: 'center' },
                      { l: isRtl ? 'ملاحظات' : 'Notes', a: 'center' },
                    ].map(h => (
                      <th key={h.l} style={{ borderTop: '3px solid #D4AF37', borderBottom: '2px solid rgba(212,175,55,0.25)', textAlign: h.a as any }}
                        className="px-5 py-4 text-xs font-black uppercase tracking-wider text-text-secondary bg-primary/5">{h.l}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {scheduleRows.map((row, i) => (
                      <tr key={i} className={`transition-colors hover:bg-primary/5 ${i % 2 === 0 ? '' : 'bg-surface/20 dark:bg-white/[0.02]'}`} style={{ borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
                        <td className="px-5 py-5 text-center"><span className="font-black text-sm text-text-primary">{row.day}</span></td>
                        <td className="px-5 py-5" dir={isRtl ? 'rtl' : 'ltr'}>
                          <div className="text-[11px] font-bold text-primary/70 tracking-widest uppercase mb-0.5">{row.code}</div>
                          <div className="font-black text-base text-text-primary leading-snug">{row.subject}</div>
                          <div className="flex items-center gap-1.5 mt-1"><User size={11} className="text-text-secondary opacity-60 shrink-0" /><span className="text-xs font-semibold text-text-secondary">{row.doctor}</span></div>
                        </td>
                        <td className="px-5 py-5 text-center">
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 whitespace-nowrap"><Clock size={11} />{row.time}</span>
                        </td>
                        <td className="px-5 py-5 text-center text-xs font-semibold text-text-secondary">
                          {row.notes && !row.notes.startsWith('http') ? <span className="bg-surface/60 dark:bg-white/5 border border-border/50 rounded-xl px-3 py-1.5 inline-block">{row.notes}</span> : <span className="opacity-30">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {scheduleRows.map((row, i) => (
                  <div key={i} className="relative rounded-2xl border border-border/60 bg-surface/40 dark:bg-white/[0.03] p-4 overflow-hidden">
                    <div className="absolute top-0 bottom-0 start-0 w-[3px] rounded-full bg-gold-gradient" />
                    <div className="ps-3">
                      <div className="flex items-start justify-between gap-3 mb-2.5" dir={isRtl ? 'rtl' : 'ltr'}>
                        <span className="text-xs font-black text-primary tracking-widest uppercase">{row.day}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shrink-0 whitespace-nowrap"><Clock size={10} />{row.time}</span>
                      </div>
                      <div dir={isRtl ? 'rtl' : 'ltr'}>
                        <div className="text-[10px] font-bold text-primary/60 tracking-widest uppercase mb-0.5">{row.code}</div>
                        <div className="font-black text-base text-text-primary leading-tight">{row.subject}</div>
                        <div className="flex items-center gap-1.5 mt-1.5"><User size={11} className="text-text-secondary opacity-50 shrink-0" /><span className="text-xs font-semibold text-text-secondary">{row.doctor}</span></div>
                      </div>
                      {row.notes && !row.notes.startsWith('http') && <div className="mt-2.5 text-xs font-semibold text-text-secondary bg-card/60 border border-border/40 rounded-xl px-3 py-1.5">{row.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/5 border border-primary/15 rounded-full mb-6"><Calendar className="text-primary opacity-40" size={40} /></div>
              <h3 className="text-2xl font-black mb-2 text-text-primary">{t.noData}</h3>
              <p className="text-sm font-semibold text-text-secondary max-w-xs mx-auto">{isRtl ? 'لم تقم بتسجيل أي مواد بعد لهذا الفصل الدراسي' : "You haven't registered for any courses this semester yet."}</p>
            </div>
          )}
          {scheduleRows.length > 0 && <div className="mt-10 pt-6 border-t border-border/30 flex items-center justify-end"><p className="text-xs font-bold text-text-secondary opacity-70">{`طُبع في: ${printDate}`}</p></div>}
        </div>
      </div>
    </div>
  );
};

export default StudentTimetable;
