
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { SemesterTranscript } from '../../types';
import { Loader2, Download, GraduationCap, X, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Font constants ───────────────────────────────────────────────────────────
const CAIRO_URL = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&display=swap';
const FONT = '"Cairo","Tajawal",Arial,sans-serif';
const BORDER = '#d4b870';

// ─── Inject Cairo <link> once ─────────────────────────────────────────────────
function injectCairoLink() {
    if (document.getElementById('cairo-tx')) return;
    const l = document.createElement('link');
    l.id = 'cairo-tx'; l.rel = 'stylesheet'; l.href = CAIRO_URL;
    document.head.appendChild(l);
}

// ─── Load Cairo fonts into the FontFace registry ─────────────────────────────
// We use the FontFace API so we can load the same font into a cloned document.
const CAIRO_FACES = [
    { w: 400, url: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGgrw.woff2' },
    { w: 700, url: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRj8AEgrw.woff2' },
    { w: 900, url: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjrAEgrw.woff2' },
];

async function loadCairoFaces(target: FontFaceSet = document.fonts): Promise<void> {
    await Promise.all(
        CAIRO_FACES.map(({ w, url }) => {
            const ff = new FontFace('Cairo', `url(${url}) format('woff2')`, { weight: String(w) });
            target.add(ff);
            return ff.load();
        })
    );
}

// ─── Shared cell styles (inline = survive html2canvas clone) ─────────────────
const thS = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: `1px solid ${BORDER}`, padding: '10px 14px',
    fontWeight: 800, color: '#4a3510', fontSize: '13px',
    fontFamily: FONT, background: '#f5edd8', textAlign: 'center',
    ...extra,
});
const tdS = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: `1px solid ${BORDER}`, padding: '10px 14px',
    fontSize: '13px', color: '#1a1a2e', fontFamily: FONT,
    background: 'rgba(255,253,245,0.92)',
    ...extra,
});

// ─────────────────────────────────────────────────────────────────────────────
// TranscriptDoc — the actual transcript document rendered into both:
//   • the on-screen scrollable modal   (width: 100%)
//   • the off-screen export container  (width: 1100px, always desktop)
// ─────────────────────────────────────────────────────────────────────────────
interface DocProps {
    transcripts: SemesterTranscript[];
    logoSrc: string; cumulativeGPA: string; isAR: boolean;
    name?: string; univId?: string; major?: string;
    siteNameAr?: string; footerText?: string;
    /** When true, forces desktop width and disables responsive behaviour */
    desktop?: boolean;
}

const TranscriptDoc: React.FC<DocProps> = ({
    transcripts, logoSrc, cumulativeGPA, isAR,
    name, univId, major, siteNameAr, footerText, desktop,
}) => (
    <div
        data-tx-root
        style={{
            background: '#fdfaf4', color: '#1a1a2e', fontFamily: FONT,
            border: '1.5px solid #d4af6a', position: 'relative', overflow: 'hidden',
            borderRadius: 12, direction: 'rtl',
            // Desktop mode: fixed 1100px so layout never collapses
            width: desktop ? 1100 : '100%',
            minWidth: desktop ? 1100 : undefined,
            boxSizing: 'border-box',
        }}
    >
        {/* Watermark */}
        <div style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.04,
        }}>
            <img src={logoSrc} alt="" crossOrigin="anonymous" style={{ width: 360 }} />
        </div>

        {/* ─ Content above watermark ─────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 1 }}>

            {/* HEADER */}
            <div style={{
                background: 'linear-gradient(135deg,#f5edd8 0%,#fffdf5 60%,#f0e6c8 100%)',
                borderBottom: '2px solid #c49642', padding: '24px 32px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <img src={logoSrc} alt="Logo" crossOrigin="anonymous"
                            style={{ height: 64, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                            onError={e => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }} />
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', fontFamily: FONT }}>
                                {siteNameAr || 'الجامعة الأمريكية المفتوحة'}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#c49642', marginTop: 4, fontFamily: FONT }}>
                                المركز الإقليمي الأول
                            </div>
                        </div>
                    </div>
                    {/* GPA box */}
                    <div style={{
                        textAlign: 'center', padding: '12px 24px', flexShrink: 0,
                        border: '1.5px solid #c49642', borderRadius: 10,
                        background: 'rgba(196,150,66,0.06)',
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: '#9a7a30', textTransform: 'uppercase', fontFamily: FONT }}>
                            {isAR ? 'المعدل التراكمي' : 'Cumulative GPA'}
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#c49642', lineHeight: 1.1, fontFamily: FONT }}>
                            {cumulativeGPA}%
                        </div>
                    </div>
                </div>
            </div>

            {/* STUDENT INFO */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                borderBottom: '1.5px solid #e8d9b0',
                background: 'rgba(255,253,245,0.92)',
            }}>
                {[
                    { label: 'اسم الطالب', value: name },
                    { label: 'الرقم الجامعي', value: univId },
                    { label: 'التخصص', value: major },
                ].map((f, i, a) => (
                    <div key={i} style={{ padding: '14px 24px', borderLeft: i < a.length - 1 ? '1px solid #e8d9b0' : undefined }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#9a7a30', textTransform: 'uppercase', marginBottom: 4, fontFamily: FONT }}>
                            {f.label}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', fontFamily: FONT }}>
                            {f.value || '—'}
                        </div>
                    </div>
                ))}
            </div>

            {/* SEMESTERS */}
            <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                {transcripts.map(sem => (
                    <div key={sem.id}>
                        {/* Semester row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{
                                background: '#c49642', color: '#fff', padding: '3px 14px',
                                borderRadius: 20, fontSize: 13, fontWeight: 800, fontFamily: FONT, flexShrink: 0,
                            }}>
                                {sem.semesterNameSnapshot}
                            </div>
                            <div style={{ flex: 1, height: 1, background: '#e0cfa0' }} />
                            <span style={{ fontSize: 13, color: '#6b5a2e', fontWeight: 700, fontFamily: FONT, flexShrink: 0 }}>
                                {isAR ? 'معدل الفصل' : 'Avg'}:{' '}
                                <strong style={{ color: '#c49642' }}>{sem.semesterAverage?.toFixed(2) || '0.00'}%</strong>
                            </span>
                        </div>

                        {/* Table */}
                        <table style={{
                            width: '100%', borderCollapse: 'collapse', fontFamily: FONT,
                            border: `1.5px solid ${BORDER}`, tableLayout: 'fixed',
                        }}>
                            <colgroup>
                                <col style={{ width: '34%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '13%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={thS({ textAlign: 'right' })}>{isAR ? 'المادة' : 'Course'}</th>
                                    <th style={thS()}>{isAR ? 'الحضور' : 'Att.'}<br /><small style={{ color: '#9a7a30', fontSize: 10 }}>20</small></th>
                                    <th style={thS()}>{isAR ? 'المشاركة' : 'Part.'}<br /><small style={{ color: '#9a7a30', fontSize: 10 }}>10</small></th>
                                    <th style={thS()}>{isAR ? 'الواجبات' : 'Asgn.'}<br /><small style={{ color: '#9a7a30', fontSize: 10 }}>20</small></th>
                                    <th style={thS()}>{isAR ? 'الامتحان' : 'Exam'}<br /><small style={{ color: '#9a7a30', fontSize: 10 }}>50</small></th>
                                    <th style={thS({ background: '#ede0b8' })}>{isAR ? 'المجموع' : 'Total'}<br /><small style={{ color: '#9a7a30', fontSize: 10 }}>100</small></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(sem.courses || []).map(c => (
                                    <tr key={c.id}>
                                        <td style={tdS({ textAlign: 'right', fontWeight: 700 })}>{c.courseNameSnapshot}</td>
                                        <td style={tdS({ textAlign: 'center' })}>{c.attendanceScore}</td>
                                        <td style={tdS({ textAlign: 'center' })}>{c.participationScore}</td>
                                        <td style={tdS({ textAlign: 'center' })}>{c.assignmentsScore}</td>
                                        <td style={tdS({ textAlign: 'center' })}>{c.examScore ?? '—'}</td>
                                        <td style={tdS({ textAlign: 'center', fontWeight: 900, color: '#c49642', background: 'rgba(253,244,224,0.95)' })}>
                                            {c.finalScore}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            {/* FOOTER */}
            <div style={{
                borderTop: '1.5px solid #d4af6a', padding: '12px 32px',
                background: 'rgba(245,237,216,0.95)', textAlign: 'center',
                fontSize: 11, color: '#7a6230', fontWeight: 600, fontFamily: FONT,
            }}>
                هذه الوثيقة صادرة إلكترونياً من نظام {siteNameAr || 'الجامعة الأمريكية المفتوحة'}
                {footerText && <><br />{footerText}</>}
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const StudentTranscript: React.FC = () => {
    const { user, lang, settings, t } = useApp();
    const isAR = lang === 'AR';
    const getMajorLabel = (k: string) => (t as any).majorList?.[k] || k;

    /** The EXPORT container — position:fixed far off-screen, full opacity, 1100px wide.
     *  CRITICAL: must NOT be visibility:hidden or display:none — html2canvas needs
     *  the element to be visually rendered (just off-screen is fine). */
    const exportRef = useRef<HTMLDivElement>(null);

    const [transcripts, setTranscripts] = useState<SemesterTranscript[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => { injectCairoLink(); loadCairoFaces(); }, []);

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
        ? (allCourses.reduce((a, c) => a + c.finalScore, 0) / allCourses.length).toFixed(2)
        : '0.00';

    const logoSrc = settings.branding.logo || settings.branding.logoBase64 || '/assets/logo.png';
    const majorLabel = user?.major ? getMajorLabel(user.major) : '—';
    const docProps: Omit<DocProps, 'desktop'> = {
        transcripts, logoSrc, cumulativeGPA, isAR,
        name: user?.fullName, univId: user?.universityId, major: majorLabel,
        siteNameAr: settings.branding.siteNameAr,
        footerText: (settings.branding as any).footerText,
    };

    // ── PDF Export ────────────────────────────────────────────────────────────
    const exportPDF = async () => {
        const el = exportRef.current;
        if (!el) return;
        setExporting(true);
        try {
            // 1. Make sure fonts are physically loaded in the browser
            await loadCairoFaces();
            await document.fonts.ready;
            // 2. Short settle so the browser paints the off-screen element
            await new Promise(r => setTimeout(r, 200));

            const W = el.scrollWidth;
            const H = el.scrollHeight;

            // 3. Capture the 1100px off-screen container
            const canvas = await html2canvas(el, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#fdfaf4',
                logging: false,
                windowWidth: W,
                windowHeight: H,
                scrollX: 0,
                scrollY: 0,
                onclone: async (clonedDoc, clonedEl) => {
                    // Load Cairo directly into the cloned document's FontFaceSet
                    // (the cloned document doesn't inherit the parent's loaded fonts)
                    await loadCairoFaces(clonedDoc.fonts);

                    // Inject global CSS rule so every text node uses Cairo
                    const s = clonedDoc.createElement('style');
                    s.textContent = `* { font-family: "Cairo","Tajawal",Arial,sans-serif !important; }`;
                    clonedDoc.head.appendChild(s);

                    // Force root element attrs
                    clonedEl.style.fontFamily = '"Cairo","Tajawal",Arial,sans-serif';
                    clonedEl.style.direction = 'rtl';
                    clonedEl.style.width = '1100px';
                },
            });

            // 4. Build PDF
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const ratio = pdfW / canvas.width;
            const imgH = canvas.height * ratio;
            let y = 0;
            while (y < imgH) {
                if (y > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -y, pdfW, imgH);
                y += pdfH;
            }
            pdf.save(`transcript_${user?.universityId || 'student'}.pdf`);
        } catch (e) { console.error('PDF export error:', e); }
        setExporting(false);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Page header ──────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto p-4 space-y-5" dir={isAR ? 'rtl' : 'ltr'}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <GraduationCap size={28} />
                        {isAR ? 'كشف الدرجات' : 'Grade Report'}
                    </h1>
                    {transcripts.length > 0 && (
                        <div className="flex gap-2">
                            <button onClick={() => setModalOpen(true)}
                                className="px-4 py-2 rounded-xl font-bold text-sm border transition-all hover:opacity-90"
                                style={{ borderColor: '#c49642', color: '#c49642', background: 'transparent' }}>
                                <Eye size={14} className="inline mr-1" />
                                {isAR ? 'عرض الكشف' : 'View'}
                            </button>
                            <button onClick={exportPDF} disabled={exporting}
                                className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:opacity-90"
                                style={{ background: '#c49642', color: '#fff' }}>
                                {exporting
                                    ? <Loader2 size={15} className="animate-spin" />
                                    : <Download size={15} />}
                                {exporting ? (isAR ? 'جاري…' : 'Exporting…') : (isAR ? 'تحميل PDF' : 'Export PDF')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Body */}
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
                ) : transcripts.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border p-12 text-center">
                        <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-text-secondary text-lg">{isAR ? 'لا توجد فصول دراسية معتمدة بعد' : 'No approved semesters yet'}</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border p-6 text-center" style={{ background: 'rgba(196,150,66,0.04)', borderColor: '#c49642' }}>
                        <p className="text-sm font-bold" style={{ color: '#9a7a30' }}>
                            {isAR ? 'المعدل التراكمي' : 'Cumulative GPA'}
                        </p>
                        <p className="text-5xl font-black mt-1" style={{ color: '#c49642' }}>{cumulativeGPA}%</p>
                        <p className="text-xs mt-2 opacity-70" style={{ color: '#9a7a30' }}>
                            {transcripts.length} {isAR ? 'فصل دراسي معتمد' : 'approved semester(s)'}
                        </p>
                    </div>
                )}
            </div>

            {/* ── MODAL ────────────────────────────────────────────────────────
                Overlay: fixed, full-screen, dim background.
                Inner: max-height 85vh, overflow-y auto — genuinely scrollable.
                Close button is OUTSIDE the scrollable area (sticky to modal top).
            ─────────────────────────────────────────────────────────────────── */}
            {modalOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(5px)',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                        padding: '20px 12px 12px',
                        boxSizing: 'border-box',
                        overflowY: 'auto',                // outer scroll if content taller than viewport
                    }}
                    onClick={() => setModalOpen(false)}
                >
                    {/* Modal container — click inside doesn't close */}
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: 880,
                            display: 'flex', flexDirection: 'column',
                            gap: 0,
                            // No max-height here — let the outer overlay scroll
                        }}
                    >
                        {/* Close bar — always visible at top, not inside scroll */}
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end',
                            marginBottom: 8,
                        }}>
                            <button
                                onClick={() => setModalOpen(false)}
                                style={{
                                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', backdropFilter: 'blur(4px)',
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Transcript body — naturally as tall as needed, overlay scrolls */}
                        <TranscriptDoc {...docProps} desktop={false} />
                    </div>
                </div>
            )}

            {/* ── OFF-SCREEN EXPORT CONTAINER ──────────────────────────────────
                CRITICAL rules:
                  • position: fixed  (not absolute — absolute can shift with scroll)
                  • left value pushes it completely off viewport right side
                  • opacity: 1, visibility: visible — html2canvas MUST be able to paint it
                  • width: 1100px  — desktop layout always
                  • Do NOT use display:none / visibility:hidden — causes blank PDF
            ─────────────────────────────────────────────────────────────────── */}
            <div
                ref={exportRef}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    left: '110vw',      // completely off-screen to the right
                    top: 0,
                    width: 1100,
                    zIndex: -9999,
                    pointerEvents: 'none',
                    // opacity: 1 (default) — must be visible for html2canvas to paint
                }}
            >
                <TranscriptDoc {...docProps} desktop={true} />
            </div>
        </>
    );
};

export default StudentTranscript;
