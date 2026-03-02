
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { SemesterTranscript } from '../../types';
import { Loader2, Download, GraduationCap, X } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─────────────────────────────────────────────────────────────────────────────
// CAIRO — loaded via FontFace API (synchronous & guaranteed before html2canvas)
// NOT via <link> (which is async and may not finish before capture starts)
// ─────────────────────────────────────────────────────────────────────────────
const CAIRO_FACES = [
    { weight: '400', src: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGgrw.woff2' },
    { weight: '600', src: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjPAEgrw.woff2' },
    { weight: '700', src: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRj8AEgrw.woff2' },
    { weight: '900', src: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjrAEgrw.woff2' },
];

/** Load Cairo into a FontFaceSet (document.fonts or a cloned doc's fonts) */
async function loadCairo(target: FontFaceSet = document.fonts): Promise<void> {
    await Promise.all(
        CAIRO_FACES.map(async ({ weight, src }) => {
            // Skip if already loaded
            if (target.check(`${weight} 16px Cairo`)) return;
            const ff = new FontFace('Cairo', `url(${src}) format('woff2')`, { weight });
            target.add(ff);
            await ff.load();
        })
    );
}

const FONT = '"Cairo","Tajawal",Arial,sans-serif';
const BORDER = '#d4b870';

// ─────────────────────────────────────────────────────────────────────────────
// Shared cell styles (inline — survive html2canvas clone without any stylesheet)
// ─────────────────────────────────────────────────────────────────────────────
const thBase: React.CSSProperties = {
    border: `1px solid ${BORDER}`, padding: '10px 14px', fontWeight: 800,
    color: '#4a3510', fontSize: '13px', fontFamily: FONT, background: '#f5edd8',
    verticalAlign: 'middle',
};
const tdBase: React.CSSProperties = {
    border: `1px solid ${BORDER}`, padding: '10px 14px', fontSize: '13px',
    color: '#1a1a2e', fontFamily: FONT, background: 'rgba(255,253,245,0.92)',
    verticalAlign: 'middle',
};

// ─────────────────────────────────────────────────────────────────────────────
// Optical baseline adjustment component. 
// Used to wrap text so we can lift it via CSS selectively on Desktop PDF exports.
// ─────────────────────────────────────────────────────────────────────────────
const T: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="pdf-text-adjust">{children}</span>
);

// ─────────────────────────────────────────────────────────────────────────────
// TranscriptContent — the actual document markup.
//
// Used in TWO places:
//   1) On-screen (inside scrollable modal wrapper on mobile)
//   2) Off-screen export div (fixed 900px — always "desktop", never compressed)
//
// `exportMode` adds colgroup fixed widths + removes box-shadow for clean PDF.
// ─────────────────────────────────────────────────────────────────────────────
interface ContentProps {
    transcripts: SemesterTranscript[];
    isAR: boolean;
    logoSrc: string;
    cumulativeGPA: string;
    displayGPA: string;
    userName?: string;
    universityId?: string;
    major?: string;
    siteNameAr?: string;
    footerText?: string;
    exportMode?: boolean;
}

const TranscriptContent = React.forwardRef<HTMLDivElement, ContentProps>(
    ({ transcripts, isAR, logoSrc, cumulativeGPA, displayGPA, userName, universityId,
        major, siteNameAr, footerText, exportMode }, ref) => (

        <div
            ref={ref}
            data-tx-export
            dir="rtl"
            style={{
                background: '#fdfaf4',
                color: '#1a1a2e',
                fontFamily: FONT,
                borderRadius: exportMode ? 0 : '1rem',
                border: '1.5px solid #d4af6a',
                boxShadow: exportMode ? 'none' : '0 4px 32px rgba(196,150,66,0.10)',
                position: 'relative',
                overflow: 'hidden',
                // exportMode: fixed 900px desktop width — never responsive
                width: exportMode ? 900 : '100%',
                minWidth: exportMode ? 900 : undefined,
                boxSizing: 'border-box',
            }}
        >
            {/* Watermark — z:0, content above at z:1 */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.04,
            }}>
                <img src={logoSrc} alt="" crossOrigin="anonymous" style={{ width: 380, height: 'auto' }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>

                {/* ── HEADER ── */}
                <div style={{
                    background: 'linear-gradient(135deg,#f5edd8 0%,#fffdf5 60%,#f0e6c8 100%)',
                    borderBottom: '2px solid #c49642',
                    padding: '28px 32px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
                            <img src={logoSrc} alt="Logo" crossOrigin="anonymous"
                                onError={e => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }}
                                style={{ height: 64, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', fontFamily: FONT }}>
                                    <T>{siteNameAr || 'الجامعة الأمريكية المفتوحة'}</T>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#c49642', marginTop: 4, fontFamily: FONT }}>
                                    <T>المركز الإقليمي الأول</T>
                                </div>
                            </div>
                        </div>
                        {/* GPA box — A1: show as % */}
                        <div style={{
                            textAlign: 'center', padding: '12px 24px', flexShrink: 0,
                            border: '1.5px solid #c49642', borderRadius: 12,
                            background: 'rgba(196,150,66,0.06)',
                        }}>
                            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0, color: '#9a7a30', fontFamily: FONT }}>
                                <T>{isAR ? 'المعدل التراكمي' : 'Cumulative GPA'}</T>
                            </div>
                            <div className="pdf-text-adjust" style={{ fontSize: 32, fontWeight: 900, color: '#c49642', lineHeight: 1.1, fontFamily: FONT }}>
                                {exportMode ? cumulativeGPA : displayGPA}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── STUDENT INFO ── */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                    borderBottom: '1.5px solid #e8d9b0',
                    background: 'rgba(255,253,245,0.85)',
                }}>
                    {[
                        { label: isAR ? 'اسم الطالب' : 'Student Name', value: userName },
                        { label: isAR ? 'الرقم الجامعي' : 'University ID', value: universityId },
                        { label: isAR ? 'التخصص' : 'Major', value: major },
                    ].map((item, i, arr) => (
                        <div key={i} style={{
                            padding: '14px 24px',
                            borderLeft: i < arr.length - 1 ? '1px solid #e8d9b0' : undefined,
                        }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0, color: '#9a7a30', marginBottom: 4, fontFamily: FONT }}>
                                <T>{item.label}</T>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', fontFamily: FONT }}>
                                <T>{item.value || '—'}</T>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── SEMESTERS ── */}
                <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {transcripts.map(semester => (
                        <div key={semester.id}>
                            {/* Semester label + average
                                Use a table row (not flex) — html2canvas renders tables reliably.
                                3 cells: [badge] [divider line via border-bottom] [avg] */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: 1, whiteSpace: 'nowrap', padding: '0 10px 0 0', verticalAlign: 'middle' }}>
                                            <div style={{
                                                background: '#c49642', color: '#fff',
                                                padding: '4px 16px', borderRadius: 20,
                                                fontSize: 13, fontWeight: 800, fontFamily: FONT,
                                                display: 'inline-block', lineHeight: 1.5,
                                            }}>
                                                <T>{semester.semesterNameSnapshot}</T>
                                            </div>
                                        </td>
                                        <td style={{ borderBottom: '1px solid #e0cfa0', padding: 0, verticalAlign: 'middle' }} />
                                        <td style={{ width: 1, whiteSpace: 'nowrap', padding: '0 0 0 10px', verticalAlign: 'middle', textAlign: 'left' }}>
                                            <span style={{ fontSize: 13, color: '#6b5a2e', fontWeight: 700, fontFamily: FONT }}>
                                                <T>
                                                    {isAR ? 'معدل الفصل' : 'Avg'}:{' '}
                                                    <strong style={{ color: '#c49642' }}>
                                                        {semester.semesterAverage?.toFixed(2) || '0.00'}%
                                                    </strong>
                                                </T>
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* A2: unified row bg — no striping
                                A3: course name only — no code
                                tableLayout fixed keeps columns stable in export */}
                            <table style={{
                                width: '100%', borderCollapse: 'collapse', fontFamily: FONT,
                                border: `1.5px solid ${BORDER}`,
                                tableLayout: exportMode ? 'fixed' : 'auto',
                            }}>
                                {exportMode && (
                                    <colgroup>
                                        <col style={{ width: '34%' }} />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '14%' }} />
                                        <col style={{ width: '13%' }} />
                                    </colgroup>
                                )}
                                <thead>
                                    <tr>
                                        <th style={{ ...thBase, textAlign: 'right', minWidth: exportMode ? undefined : 140 }}>
                                            <T>{isAR ? 'المادة' : 'Course'}</T>
                                        </th>
                                        <th style={{ ...thBase, textAlign: 'center', minWidth: exportMode ? undefined : 70 }}>
                                            <T>{isAR ? 'الحضور' : 'Att.'}</T><br />
                                            <small style={{ fontWeight: 600, color: '#9a7a30', fontSize: 11 }}><T>20</T></small>
                                        </th>
                                        <th style={{ ...thBase, textAlign: 'center', minWidth: exportMode ? undefined : 70 }}>
                                            <T>{isAR ? 'المشاركة' : 'Part.'}</T><br />
                                            <small style={{ fontWeight: 600, color: '#9a7a30', fontSize: 11 }}><T>10</T></small>
                                        </th>
                                        <th style={{ ...thBase, textAlign: 'center', minWidth: exportMode ? undefined : 70 }}>
                                            <T>{isAR ? 'الواجبات' : 'Asgn.'}</T><br />
                                            <small style={{ fontWeight: 600, color: '#9a7a30', fontSize: 11 }}><T>20</T></small>
                                        </th>
                                        <th style={{ ...thBase, textAlign: 'center', minWidth: exportMode ? undefined : 70 }}>
                                            <T>{isAR ? 'الامتحان' : 'Exam'}</T><br />
                                            <small style={{ fontWeight: 600, color: '#9a7a30', fontSize: 11 }}><T>50</T></small>
                                        </th>
                                        <th style={{ ...thBase, textAlign: 'center', background: '#ede0b8' }}>
                                            <T>{isAR ? 'المجموع' : 'Total'}</T><br />
                                            <small style={{ fontWeight: 600, color: '#9a7a30', fontSize: 11 }}><T>100</T></small>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(semester.courses || []).map(course => (
                                        <tr key={course.id} style={{ background: 'rgba(255,253,245,0.75)' }}>
                                            <td style={{ ...tdBase, fontWeight: 700, textAlign: 'right' }}>
                                                <T>{course.courseNameSnapshot}</T>
                                            </td>
                                            <td style={{ ...tdBase, textAlign: 'center' }}><T>{course.attendanceScore}</T></td>
                                            <td style={{ ...tdBase, textAlign: 'center' }}><T>{course.participationScore}</T></td>
                                            <td style={{ ...tdBase, textAlign: 'center' }}><T>{course.assignmentsScore}</T></td>
                                            <td style={{ ...tdBase, textAlign: 'center' }}><T>{course.examScore ?? '—'}</T></td>
                                            <td style={{ ...tdBase, textAlign: 'center', fontWeight: 900, color: '#c49642', background: 'rgba(253,244,224,0.85)' }}>
                                                <T>{course.finalScore}</T>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                {/* ── FOOTER ── */}
                <div style={{
                    borderTop: '1.5px solid #d4af6a', padding: '13px 32px',
                    background: 'rgba(245,237,216,0.9)', textAlign: 'center',
                    fontSize: 11, color: '#7a6230', fontWeight: 600, fontFamily: FONT,
                }}>
                    <p><T>هذه الوثيقة صادرة إلكترونياً من نظام {siteNameAr || 'الجامعة الأمريكية المفتوحة'}</T></p>
                    {footerText && <p style={{ marginTop: 4 }}><T>{footerText}</T></p>}
                </div>
            </div>
        </div>
    )
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const StudentTranscript: React.FC = () => {
    const { user, lang, settings, t } = useApp();
    const isAR = lang === 'AR';
    const getMajorLabel = (k: string) => (t as any).majorList?.[k] || k;

    const [transcripts, setTranscripts] = useState<SemesterTranscript[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    // The off-screen export ref — 900px fixed, always "desktop" layout
    // IMPORTANT: rendered at position:fixed left:150vw so it is:
    //   • Off-screen (user never sees it)
    //   • Fully painted (opacity:1, no visibility:hidden) → html2canvas works
    const exportRef = useRef<HTMLDivElement>(null);

    // Pre-load Cairo on mount into document.fonts
    useEffect(() => { loadCairo(); }, []);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try { setTranscripts(await supabaseService.getFullTranscript(user.id)); }
        catch (e) { console.error(e); }
        setLoading(false);
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const allCourses = transcripts.flatMap(s => s.courses || []);
    const cumulativeGPA = allCourses.length > 0
        ? (allCourses.reduce((acc, c) => acc + c.finalScore, 0) / allCourses.length).toFixed(2)
        : '0.00';

    // ── Counter animation for the summary card display ────────────────────────
    // starts at 0.00 and counts up to cumulativeGPA over 1.4s with ease-out.
    // The PDF export always uses the real `cumulativeGPA` — not this display value.
    const [displayGPA, setDisplayGPA] = useState('0.00');
    useEffect(() => {
        const target = parseFloat(cumulativeGPA);
        if (target === 0) { setDisplayGPA('0.00'); return; }
        const duration = 1400;          // ms
        const startTime = performance.now();
        const raf = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic: starts fast, slows toward end
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayGPA((target * eased).toFixed(2));
            if (progress < 1) requestAnimationFrame(raf);
        };
        const id = requestAnimationFrame(raf);
        return () => cancelAnimationFrame(id);
    }, [cumulativeGPA]);

    const logoSrc = settings.branding.logo || settings.branding.logoBase64 || '/assets/logo.png';
    const majorLabel = user?.major ? getMajorLabel(user.major) : '—';
    const contentProps: ContentProps = {
        transcripts, isAR, logoSrc, cumulativeGPA, displayGPA,
        userName: user?.fullName,
        universityId: user?.universityId,
        major: majorLabel,
        siteNameAr: settings.branding.siteNameAr,
        footerText: (settings.branding as any).footerText,
    };

    // ── PDF Export ────────────────────────────────────────────────────────────
    const exportPDF = async () => {
        const el = exportRef.current;
        if (!el) return;
        setExporting(true);
        try {
            // 1. Wait for Cairo to load into document.fonts
            await loadCairo();
            await document.fonts.ready;
            // 2. Give browser 150ms to paint the off-screen element
            await new Promise(r => setTimeout(r, 150));

            const W = el.scrollWidth;   // always 900 in exportMode
            const H = el.scrollHeight;

            const canvas = await html2canvas(el, {
                scale: 2.5,             // high DPI for sharp PDF
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#fdfaf4',
                logging: false,
                // Lock window size to the 900px container — never the phone viewport
                windowWidth: W,
                windowHeight: H,
                scrollX: 0,
                scrollY: 0,
                onclone: async (clonedDoc, clonedEl) => {
                    // Load Cairo into the cloned document's FontFaceSet
                    // (the clone has its own isolated font environment)
                    await loadCairo(clonedDoc.fonts);

                    // Check if device is desktop (not mobile OS)
                    const isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                    const style = clonedDoc.createElement('style');
                    style.textContent = `* { font-family: "Cairo","Tajawal",Arial,sans-serif !important; }`;

                    // Specific optical fix for desktop (Windows/Mac) font baseline bugs in html2canvas
                    if (isDesktop) {
                        style.textContent += `
                            .pdf-text-adjust {
                                position: relative !important;
                                top: -0.18em !important;
                                display: inline-block;
                            }
                        `;
                    }

                    clonedDoc.head.appendChild(style);

                    // Force root properties
                    clonedEl.style.direction = 'rtl';
                    clonedEl.style.fontFamily = '"Cairo","Tajawal",Arial,sans-serif';
                },
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const ratio = pdfW / canvas.width;
            const totalH = canvas.height * ratio;

            // Multi-page: slice canvas into A4 pages
            let yOffset = 0;
            while (yOffset < totalH) {
                if (yOffset > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, totalH);
                yOffset += pdfH;
            }
            pdf.save(`transcript_${user?.universityId || 'student'}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
        }
        setExporting(false);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <div className="max-w-5xl mx-auto p-4 space-y-6" dir={isAR ? 'rtl' : 'ltr'}>

                {/* Page header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <GraduationCap size={28} />
                        {isAR ? 'كشف الدرجات' : 'Grade Report'}
                    </h1>
                    {!loading && transcripts.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {/* View Transcript button — opens modal */}
                            <button
                                onClick={() => setModalOpen(true)}
                                className="px-4 py-2 rounded-xl font-bold text-sm border transition-all hover:opacity-90"
                                style={{ borderColor: '#c49642', color: '#c49642', background: 'transparent' }}
                            >
                                {isAR ? 'عرض الكشف' : 'View Transcript'}
                            </button>
                            {/* Export PDF — always uses the 900px off-screen container */}
                            <button
                                onClick={exportPDF}
                                disabled={exporting}
                                className="px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2"
                                style={{ background: '#c49642', color: '#fff' }}
                            >
                                {exporting
                                    ? <Loader2 className="animate-spin" size={16} />
                                    : <Download size={16} />}
                                {exporting ? (isAR ? 'جاري التصدير…' : 'Exporting…') : (isAR ? 'تحميل PDF' : 'Export PDF')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Body */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin w-8 h-8 text-primary" />
                    </div>
                ) : transcripts.length === 0 ? (
                    <div className="bg-card rounded-2xl shadow-sm border border-border p-12 text-center">
                        <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-text-secondary text-lg">
                            {isAR ? 'لا توجد فصول دراسية معتمدة بعد' : 'No approved semesters yet'}
                        </p>
                        <p className="text-text-secondary text-sm mt-2">
                            {isAR ? 'سيظهر كشف الدرجات بعد اعتماد الفصل من قبل الإدارة' : 'Transcript will appear after semester approval'}
                        </p>
                    </div>
                ) : (
                    /* GPA summary card on main page */
                    <div className="rounded-2xl border p-6 text-center"
                        style={{ background: 'rgba(196,150,66,0.04)', borderColor: '#c49642' }}>
                        <p className="text-sm font-bold" style={{ color: '#9a7a30' }}>
                            {isAR ? 'المعدل التراكمي' : 'Cumulative GPA'}
                        </p>
                        <p className="text-5xl font-black mt-1" style={{ color: '#c49642', fontVariantNumeric: 'tabular-nums' }}>{displayGPA}%</p>
                        <p className="text-xs mt-2 opacity-70" style={{ color: '#9a7a30' }}>
                            {transcripts.length} {isAR ? 'فصل دراسي معتمد' : 'approved semester(s)'}
                            {'  ·  '}
                            {isAR ? 'اضغط "عرض الكشف" لرؤية التفاصيل' : 'Tap "View Transcript" for details'}
                        </p>
                    </div>
                )}
            </div>

            {/* ──── SCROLLABLE MODAL (fix #1 — mobile view) ────
                The outer div fills the screen and is the scroll host.
                The inner card can be wider than the phone screen — user scrolls.
                We do NOT set max-width tight here; instead we set min-width on
                the content so it has room to breathe, and the outer scrolls.
            ──── */}
            {modalOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(6px)',
                        // Entire overlay scrolls both axes: user can scroll down AND sideways
                        overflow: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        padding: '16px',
                        boxSizing: 'border-box',
                    }}
                    onClick={() => setModalOpen(false)}
                >
                    {/* Close button — fixed to top-right, never scrolls away */}
                    <button
                        onClick={() => setModalOpen(false)}
                        style={{
                            position: 'fixed', top: 14, right: 14, zIndex: 10001,
                            width: 36, height: 36, borderRadius: '50%', border: 'none',
                            background: 'rgba(0,0,0,0.5)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={18} />
                    </button>

                    {/* Transcript wrapper — min-width ensures table never compresses */}
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            // On desktop: constrained nicely. On mobile: min-width ensures
                            // horizontal scroll instead of compression.
                            width: '100%',
                            maxWidth: 860,
                            minWidth: 640,  // table needs at least 640px to look right
                            margin: '0 auto',
                            marginTop: 36,  // space below the close button
                        }}
                    >
                        <TranscriptContent {...contentProps} exportMode={false} />
                    </div>
                </div>
            )}

            {/* ──── OFF-SCREEN EXPORT CONTAINER (fix #2 — PDF always desktop) ────
                Rules:
                  • position:fixed  — relative to viewport, not to page flow
                  • left:150vw      — completely off-screen to the right
                  • opacity:1 (default) — MUST be painted for html2canvas
                  • NO visibility:hidden / display:none — those break html2canvas
                  • width:900px     — the "desktop" layout, never adapts to phone
            ──── */}
            <div
                style={{
                    position: 'fixed',
                    left: '150vw',
                    top: 0,
                    width: 900,
                    zIndex: -1,
                    pointerEvents: 'none',
                }}
            >
                <TranscriptContent ref={exportRef} {...contentProps} exportMode={true} />
            </div>
        </>
    );
};

export default StudentTranscript;
