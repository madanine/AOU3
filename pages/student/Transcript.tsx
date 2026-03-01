
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { SemesterTranscript, TranscriptCourse } from '../../types';
import { Loader2, Download, GraduationCap, X } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─────────────────────────────────────────────────────────────────────────────
// FONT STRATEGY
//
// Step 1: Inject <link> for Cairo on mount so the browser downloads the font.
// Step 2: Before any pdf capture, await document.fonts.ready (blocks until all
//         declared fonts have loaded).
// Step 3: The off-screen export container explicitly sets fontFamily = FONT on
//         every element — INCLUDING the root.  The onclone hook additionally
//         injects a <style> tag into the cloned document so that Cairo is forced
//         on all text nodes even if the original stylesheet is not copied.
// ─────────────────────────────────────────────────────────────────────────────

const CAIRO_HREF = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&display=swap';
const FONT = '"Cairo", "Tajawal", Arial, sans-serif';

function ensureCairo(): Promise<unknown> {
    if (!document.getElementById('cairo-transcript-link')) {
        const link = document.createElement('link');
        link.id = 'cairo-transcript-link';
        link.rel = 'stylesheet';
        link.href = CAIRO_HREF;
        document.head.appendChild(link);
    }
    return document.fonts.ready;
}

// ─ Shared border colour ──────────────────────────────────────────────────────
const BORDER = '#d4b870';

// ─ Inline style helpers (guaranteed to survive html2canvas cloning) ──────────
const thS: React.CSSProperties = {
    border: `1px solid ${BORDER}`,
    padding: '10px 14px',
    fontWeight: 800,
    color: '#4a3510',
    fontSize: '13px',
    fontFamily: FONT,
    background: '#f5edd8',
    textAlign: 'center',
};
const tdS: React.CSSProperties = {
    border: `1px solid ${BORDER}`,
    padding: '10px 14px',
    fontSize: '13px',
    color: '#1a1a2e',
    fontFamily: FONT,
    background: 'rgba(255,253,245,0.9)',
};

// ─────────────────────────────────────────────────────────────────────────────
// TRANSCRIPT BODY — single source of truth rendered in BOTH places:
//   1. The on-screen modal (scrollable, responsive)
//   2. The off-screen export container (fixed 1100 px, always desktop)
// ─────────────────────────────────────────────────────────────────────────────

interface TranscriptBodyProps {
    transcripts: SemesterTranscript[];
    logoSrc: string;
    cumulativeGPA: string;
    isAR: boolean;
    userName?: string;
    universityId?: string;
    major?: string;
    siteNameAr?: string;
    footerText?: string;
    forExport?: boolean;
}

const TranscriptBody: React.FC<TranscriptBodyProps> = ({
    transcripts, logoSrc, cumulativeGPA, isAR,
    userName, universityId, major, siteNameAr, footerText, forExport,
}) => {
    const root: React.CSSProperties = {
        background: '#fdfaf4',
        color: '#1a1a2e',
        fontFamily: FONT,
        border: '1.5px solid #d4af6a',
        boxShadow: forExport ? 'none' : '0 4px 32px rgba(196,150,66,0.10)',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: forExport ? '0' : '1rem',
        direction: 'rtl',
        unicodeBidi: 'embed',
        minWidth: forExport ? '1100px' : undefined,
        width: forExport ? '1100px' : '100%',
    };

    return (
        <div data-transcript-export style={root}>

            {/* ── Background watermark — z-index 0 ─────────────────────────── */}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.04,
                pointerEvents: 'none',
                zIndex: 0,
            }}>
                <img src={logoSrc} alt="" crossOrigin="anonymous"
                    style={{ width: '380px', height: 'auto' }} />
            </div>

            {/* ── All content above watermark ───────────────────────────────── */}
            <div style={{ position: 'relative', zIndex: 1 }}>

                {/* HEADER */}
                <div style={{
                    background: 'linear-gradient(135deg,#f5edd8 0%,#fffdf5 60%,#f0e6c8 100%)',
                    borderBottom: '2px solid #c49642',
                    padding: '28px 36px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>

                        {/* Logo + university name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                            <img src={logoSrc} alt="Logo" crossOrigin="anonymous"
                                onError={e => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }}
                                style={{ height: '72px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 900, color: '#1a1a2e', fontFamily: FONT, letterSpacing: '-0.5px', unicodeBidi: 'embed' }}>
                                    {siteNameAr || 'الجامعة الأمريكية المفتوحة'}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#c49642', marginTop: '4px', fontFamily: FONT }}>
                                    المركز الإقليمي الأول
                                </div>
                            </div>
                        </div>

                        {/* Cumulative GPA */}
                        <div style={{
                            textAlign: 'center',
                            padding: '14px 28px',
                            border: '1.5px solid #c49642',
                            borderRadius: '12px',
                            background: 'rgba(196,150,66,0.06)',
                            flexShrink: 0,
                        }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '2px', color: '#9a7a30', textTransform: 'uppercase', fontFamily: FONT }}>
                                {isAR ? 'المعدل التراكمي' : 'Cumulative GPA'}
                            </div>
                            <div style={{ fontSize: '34px', fontWeight: 900, color: '#c49642', lineHeight: 1.1, fontFamily: FONT }}>
                                {cumulativeGPA}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* STUDENT INFO */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    borderBottom: '1.5px solid #e8d9b0',
                    background: 'rgba(255,253,245,0.92)',
                }}>
                    {[
                        { label: 'اسم الطالب', value: userName },
                        { label: 'الرقم الجامعي', value: universityId },
                        { label: 'التخصص', value: major },
                    ].map((item, i, arr) => (
                        <div key={i} style={{
                            padding: '16px 28px',
                            borderLeft: i < arr.length - 1 ? '1px solid #e8d9b0' : undefined,
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#9a7a30', textTransform: 'uppercase', marginBottom: '4px', fontFamily: FONT }}>
                                {item.label}
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1a1a2e', fontFamily: FONT, unicodeBidi: 'embed' }}>
                                {item.value || '—'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* SEMESTERS */}
                <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {transcripts.map(semester => (
                        <div key={semester.id}>

                            {/* Semester label + average */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{
                                    background: '#c49642', color: '#fff',
                                    padding: '4px 18px', borderRadius: '20px',
                                    fontSize: '13px', fontWeight: 800, fontFamily: FONT,
                                    flexShrink: 0, unicodeBidi: 'embed',
                                }}>
                                    {semester.semesterNameSnapshot}
                                </div>
                                <div style={{ flex: 1, height: '1px', background: '#e0cfa0', minWidth: 0 }} />
                                <span style={{ fontSize: '13px', color: '#6b5a2e', fontWeight: 700, fontFamily: FONT, flexShrink: 0 }}>
                                    {isAR ? 'معدل الفصل' : 'Semester Avg'}:{' '}
                                    <strong style={{ color: '#c49642' }}>{semester.semesterAverage?.toFixed(2) || '0.00'}%</strong>
                                </span>
                            </div>

                            {/* Courses table */}
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontFamily: FONT,
                                border: `1.5px solid ${BORDER}`,
                                tableLayout: 'fixed',
                            }}>
                                <colgroup>
                                    <col style={{ width: '36%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '12%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={{ ...thS, textAlign: 'right' }}>{isAR ? 'المادة' : 'Course'}</th>
                                        <th style={thS}>{isAR ? 'الحضور' : 'Attendance'}<br /><span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>20</span></th>
                                        <th style={thS}>{isAR ? 'المشاركة' : 'Participation'}<br /><span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>10</span></th>
                                        <th style={thS}>{isAR ? 'الواجبات' : 'Assignments'}<br /><span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>20</span></th>
                                        <th style={thS}>{isAR ? 'الامتحان' : 'Exam'}<br /><span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>50</span></th>
                                        <th style={{ ...thS, background: '#ede0b8' }}>{isAR ? 'المجموع' : 'Total'}<br /><span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>100</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(semester.courses || []).map(course => (
                                        <tr key={course.id}>
                                            <td style={{ ...tdS, textAlign: 'right', fontWeight: 700, unicodeBidi: 'embed' }}>
                                                {course.courseNameSnapshot}
                                            </td>
                                            <td style={{ ...tdS, textAlign: 'center' }}>{course.attendanceScore}</td>
                                            <td style={{ ...tdS, textAlign: 'center' }}>{course.participationScore}</td>
                                            <td style={{ ...tdS, textAlign: 'center' }}>{course.assignmentsScore}</td>
                                            <td style={{ ...tdS, textAlign: 'center' }}>{course.examScore ?? '—'}</td>
                                            <td style={{ ...tdS, textAlign: 'center', fontWeight: 900, color: '#c49642', background: 'rgba(253,244,224,0.95)' }}>
                                                {course.finalScore}
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
                    borderTop: '1.5px solid #d4af6a',
                    padding: '14px 36px',
                    background: 'rgba(245,237,216,0.95)',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#7a6230',
                    fontWeight: 600,
                    fontFamily: FONT,
                }}>
                    <p>هذه الوثيقة صادرة إلكترونياً من نظام {siteNameAr || 'الجامعة الأمريكية المفتوحة'}</p>
                    {footerText && <p style={{ marginTop: '4px' }}>{footerText}</p>}
                </div>

            </div>{/* /z-index:1 content */}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const StudentTranscript: React.FC = () => {
    const { user, lang, settings, t } = useApp();
    const isAR = lang === 'AR';
    const getMajorLabel = (key: string) => (t as any).majorList?.[key] || key;

    const exportRef = useRef<HTMLDivElement>(null);  // off-screen, fixed 1100px

    const [transcripts, setTranscripts] = useState<SemesterTranscript[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    // Pre-load Cairo immediately
    useEffect(() => { ensureCairo(); }, []);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await supabaseService.getFullTranscript(user.id);
            setTranscripts(data);
        } catch (e: any) { console.error(e); }
        setLoading(false);
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const allCourses = transcripts.flatMap(t => t.courses || []);
    const cumulativeGPA = allCourses.length > 0
        ? (allCourses.reduce((s, c) => s + c.finalScore, 0) / allCourses.length).toFixed(2)
        : '0.00';

    const logoSrc = settings.branding.logo || settings.branding.logoBase64 || '/assets/logo.png';
    const majorLabel = user?.major ? getMajorLabel(user.major) : '—';

    const sharedProps: Omit<TranscriptBodyProps, 'forExport'> = {
        transcripts, logoSrc, cumulativeGPA, isAR,
        userName: user?.fullName,
        universityId: user?.universityId,
        major: majorLabel,
        siteNameAr: settings.branding.siteNameAr,
        footerText: (settings.branding as any).footerText,
    };

    // ── PDF Export ────────────────────────────────────────────────────────────
    const exportPDF = async () => {
        const container = exportRef.current;
        if (!container) return;
        setExporting(true);
        try {
            // 1) Guarantee Cairo is downloaded
            await ensureCairo();
            await document.fonts.ready;

            // Small delay to let cairo finish any pending paints
            await new Promise(r => setTimeout(r, 120));

            const containerW = container.scrollWidth;
            const containerH = container.scrollHeight;

            // 2) Capture the OFF-SCREEN container — always 1100px desktop layout
            const canvas = await html2canvas(container, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#fdfaf4',
                logging: false,
                // Lock to the export container's exact dimensions
                windowWidth: containerW,
                windowHeight: containerH,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    // Inject a <style> in the cloned document that forces Cairo on
                    // every element — this is the most reliable way to guarantee
                    // the font is applied even in html2canvas's internal rendering.
                    const style = clonedDoc.createElement('style');
                    style.textContent = `
                        @import url('${CAIRO_HREF}');
                        * {
                            font-family: "Cairo", "Tajawal", Arial, sans-serif !important;
                        }
                    `;
                    clonedDoc.head.appendChild(style);

                    // Also apply inline style to root element
                    const root = clonedDoc.querySelector('[data-transcript-export]') as HTMLElement | null;
                    if (root) {
                        root.style.fontFamily = '"Cairo","Tajawal",Arial,sans-serif';
                        root.style.direction = 'rtl';
                    }
                },
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const ratio = pdfW / canvas.width;
            const scaledH = canvas.height * ratio;

            let yOffset = 0;
            while (yOffset < scaledH) {
                if (yOffset > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, scaledH);
                yOffset += pdfH;
            }
            pdf.save(`transcript_${user?.universityId || 'student'}.pdf`);
        } catch (e: any) { console.error('PDF export error:', e); }
        setExporting(false);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Page UI ──────────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto p-4 space-y-5" dir={isAR ? 'rtl' : 'ltr'}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <GraduationCap size={28} />
                        {isAR ? 'كشف الدرجات' : 'Grade Report'}
                    </h1>
                    <div className="flex gap-3">
                        {transcripts.length > 0 && (
                            <>
                                <button
                                    onClick={() => setModalOpen(true)}
                                    className="px-4 py-2 rounded-xl font-bold text-sm border hover:opacity-90 transition-all"
                                    style={{ borderColor: '#c49642', color: '#c49642', background: 'transparent' }}
                                >
                                    {isAR ? 'عرض الكشف' : 'View Transcript'}
                                </button>
                                <button
                                    onClick={exportPDF}
                                    disabled={exporting}
                                    className="px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2"
                                    style={{ background: '#c49642', color: '#fff' }}
                                >
                                    {exporting
                                        ? <><Loader2 className="animate-spin" size={16} />{isAR ? 'جاري التصدير…' : 'Exporting…'}</>
                                        : <><Download size={16} />{isAR ? 'تحميل PDF' : 'Export PDF'}</>
                                    }
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin w-8 h-8 text-primary" />
                    </div>
                ) : transcripts.length === 0 ? (
                    <div className="bg-card rounded-2xl shadow-sm border border-border p-12 text-center">
                        <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-text-secondary text-lg">
                            {isAR ? 'لا توجد فصول دراسية معتمدة بعد' : 'No approved semesters yet'}
                        </p>
                        <p className="text-text-secondary text-sm mt-2">
                            {isAR ? 'سيظهر كشف الدرجات بعد اعتماد الفصل من قبل الإدارة' : 'Transcript will appear after semester approval by administration'}
                        </p>
                    </div>
                ) : (
                    /* Summary card on the main page — not the full transcript */
                    <div
                        className="rounded-2xl border p-6 text-center"
                        style={{ background: 'rgba(196,150,66,0.04)', borderColor: '#c49642' }}
                    >
                        <p className="text-sm font-bold" style={{ color: '#9a7a30' }}>
                            {isAR ? 'المعدل التراكمي' : 'Cumulative GPA'}
                        </p>
                        <p className="text-5xl font-black mt-1" style={{ color: '#c49642' }}>{cumulativeGPA}%</p>
                        <p className="text-xs mt-2" style={{ color: '#9a7a30' }}>
                            {transcripts.length} {isAR ? 'فصل دراسي معتمد' : 'approved semester(s)'}
                        </p>
                        <p className="text-xs mt-3 opacity-70" style={{ color: '#9a7a30' }}>
                            {isAR ? 'اضغط "عرض الكشف" لرؤية التفاصيل أو "تحميل PDF" للتصدير' : 'Tap "View Transcript" for details or "Export PDF" to download'}
                        </p>
                    </div>
                )}
            </div>

            {/* ── MODAL — scrollable on mobile ─────────────────────────────── */}
            {modalOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999,
                        padding: '16px',
                        boxSizing: 'border-box',
                    }}
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '85vh',
                            overflowY: 'auto',
                            borderRadius: '1rem',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setModalOpen(false)}
                            style={{
                                position: 'sticky', top: '8px',
                                float: 'left', marginLeft: '8px',
                                zIndex: 10, width: '32px', height: '32px',
                                borderRadius: '50%', border: 'none',
                                background: 'rgba(0,0,0,0.5)', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            <X size={16} />
                        </button>
                        <div style={{ clear: 'both' }} />
                        {/* Transcript rendered at full width inside modal — no compression */}
                        <TranscriptBody {...sharedProps} forExport={false} />
                    </div>
                </div>
            )}

            {/* ── OFF-SCREEN EXPORT CONTAINER ───────────────────────────────
                 Rendered at fixed 1100px outside the viewport.
                 display:block (not none) so fonts + images fully paint.
                 visibility:hidden so user never sees it.
                 This guarantees PDF always captures desktop layout.
            ─────────────────────────────────────────────────────────────── */}
            <div
                ref={exportRef}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    left: '-9999px',
                    top: 0,
                    width: '1100px',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    zIndex: -1,
                }}
            >
                <TranscriptBody {...sharedProps} forExport={true} />
            </div>
        </>
    );
};

export default StudentTranscript;
