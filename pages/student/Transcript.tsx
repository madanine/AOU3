
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { SemesterTranscript, TranscriptCourse } from '../../types';
import { Loader2, Download, GraduationCap } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const StudentTranscript: React.FC = () => {
    const { user, lang, settings, t } = useApp();
    const isAR = lang === 'AR';
    const transcriptRef = useRef<HTMLDivElement>(null);
    const getMajorLabel = (key: string) => (t as any).majorList?.[key] || key;

    const [transcripts, setTranscripts] = useState<SemesterTranscript[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

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

    // Cumulative GPA from ALL released semesters combined
    const allCourses = transcripts.flatMap(t => t.courses || []);
    const cumulativeGPA = allCourses.length > 0
        ? (allCourses.reduce((s, c) => s + c.finalScore, 0) / allCourses.length).toFixed(2)
        : '0.00';

    const exportPDF = async () => {
        if (!transcriptRef.current) return;
        setExporting(true);
        try {
            // Force light-mode capture regardless of system theme
            const canvas = await html2canvas(transcriptRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#fdfaf4',
                logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
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

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    const logoSrc = settings.branding.logo || settings.branding.logoBase64 || '/assets/logo.png';

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-6" dir={isAR ? 'rtl' : 'ltr'}>
            {/* Page header (outside transcript area) */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <GraduationCap size={28} /> {isAR ? 'كشف الدرجات' : 'Grade Report'}
                </h1>
                {transcripts.length > 0 && (
                    <button
                        onClick={exportPDF}
                        disabled={exporting}
                        className="px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2"
                        style={{ background: '#c49642', color: '#fff' }}
                    >
                        {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                        {isAR ? 'تحميل PDF' : 'Export PDF'}
                    </button>
                )}
            </div>

            {transcripts.length === 0 ? (
                <div className="bg-card rounded-2xl shadow-sm border border-border p-12 text-center">
                    <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-text-secondary text-lg">{isAR ? 'لا توجد فصول دراسية معتمدة بعد' : 'No approved semesters yet'}</p>
                    <p className="text-text-secondary text-sm mt-2">{isAR ? 'سيظهر كشف الدرجات بعد اعتماد الفصل من قبل الإدارة' : 'Transcript will appear after semester approval by administration'}</p>
                </div>
            ) : (
                /*
                 * TRANSCRIPT DOCUMENT
                 * Always rendered in light mode (white/ivory + dark text + gold accents)
                 * regardless of the system dark-mode setting.
                 */
                <div
                    ref={transcriptRef}
                    dir="rtl"
                    style={{
                        background: '#fdfaf4',
                        color: '#1a1a2e',
                        fontFamily: '"Tajawal", "Cairo", Arial, sans-serif',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        border: '1.5px solid #d4af6a',
                        boxShadow: '0 4px 32px rgba(196,150,66,0.10)',
                    }}
                >
                    {/* ──── HEADER ──── */}
                    <div style={{
                        background: 'linear-gradient(135deg, #f5edd8 0%, #fffdf5 60%, #f0e6c8 100%)',
                        borderBottom: '2px solid #c49642',
                        padding: '28px 32px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {/* Logo + names */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <img
                                    src={logoSrc}
                                    alt="Logo"
                                    style={{ height: '72px', width: 'auto', objectFit: 'contain' }}
                                    crossOrigin="anonymous"
                                    onError={e => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }}
                                />
                                <div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#1a1a2e', letterSpacing: '-0.5px' }}>
                                        {settings.branding.siteNameAr || 'الجامعة الأمريكية المفتوحة'}
                                    </div>
                                    {/* Regional center line — required by user */}
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#c49642', marginTop: '4px' }}>
                                        المركز الإقليمي الأول
                                    </div>
                                </div>
                            </div>

                            {/* Gold divider + GPA panel */}
                            <div style={{
                                textAlign: 'center',
                                padding: '12px 28px',
                                border: '1.5px solid #c49642',
                                borderRadius: '12px',
                                background: 'rgba(196,150,66,0.06)',
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '2px', color: '#9a7a30', textTransform: 'uppercase' }}>
                                    {isAR ? 'المعدل التراكمي' : 'Cumulative GPA'}
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 900, color: '#c49642', lineHeight: 1.1 }}>
                                    {cumulativeGPA}
                                </div>
                                <div style={{ fontSize: '11px', color: '#9a7a30', marginTop: '2px' }}>من 100</div>
                            </div>
                        </div>
                    </div>

                    {/* ──── STUDENT INFO ──── */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0',
                        borderBottom: '1.5px solid #e8d9b0',
                        background: '#fffdf5',
                    }}>
                        {[
                            { label: isAR ? 'اسم الطالب' : 'Student Name', value: user?.fullName },
                            { label: isAR ? 'الرقم الجامعي' : 'University ID', value: user?.universityId },
                            { label: isAR ? 'التخصص' : 'Major', value: user?.major ? getMajorLabel(user.major) : '—' },
                        ].map((item, i, arr) => (
                            <div
                                key={i}
                                style={{
                                    padding: '16px 24px',
                                    borderLeft: i < arr.length - 1 ? '1px solid #e8d9b0' : undefined,
                                }}
                            >
                                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#9a7a30', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    {item.label}
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#1a1a2e' }}>{item.value || '—'}</div>
                            </div>
                        ))}
                    </div>

                    {/* ──── WATERMARK + SEMESTERS ──── */}
                    <div style={{ position: 'relative', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Watermark */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0.025, pointerEvents: 'none', zIndex: 0,
                        }}>
                            <img src={logoSrc} alt="" style={{ width: '360px' }} crossOrigin="anonymous" />
                        </div>

                        {transcripts.map((semester, sIdx) => (
                            <div key={semester.id} style={{ position: 'relative', zIndex: 1 }}>
                                {/* Semester header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px',
                                }}>
                                    <div style={{
                                        background: '#c49642', color: '#fff',
                                        padding: '4px 16px', borderRadius: '20px',
                                        fontSize: '13px', fontWeight: 800,
                                    }}>
                                        {semester.semesterNameSnapshot}
                                    </div>
                                    <div style={{ flex: 1, height: '1px', background: '#e0cfa0' }} />
                                    <span style={{ fontSize: '13px', color: '#6b5a2e', fontWeight: 700 }}>
                                        {isAR ? 'معدل الفصل' : 'Semester Avg'}:{' '}
                                        <strong style={{ color: '#c49642' }}>{semester.semesterAverage?.toFixed(2) || '0.00'}</strong>
                                    </span>
                                </div>

                                {/* Courses table */}
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '13.5px',
                                    border: '1.5px solid #d4b870',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                }}>
                                    <thead>
                                        <tr style={{ background: '#f5edd8' }}>
                                            <th style={{ ...thStyle, textAlign: 'right', minWidth: '160px' }}>
                                                {isAR ? 'المادة' : 'Course'}
                                            </th>
                                            <th style={{ ...thStyle, ...thCenter }}>
                                                {isAR ? 'الحضور' : 'Attendance'}<br />
                                                <span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>20</span>
                                            </th>
                                            <th style={{ ...thStyle, ...thCenter }}>
                                                {isAR ? 'المشاركة' : 'Participation'}<br />
                                                <span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>10</span>
                                            </th>
                                            <th style={{ ...thStyle, ...thCenter }}>
                                                {isAR ? 'الواجبات' : 'Assignments'}<br />
                                                <span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>20</span>
                                            </th>
                                            <th style={{ ...thStyle, ...thCenter }}>
                                                {isAR ? 'الامتحان' : 'Exam'}<br />
                                                <span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>50</span>
                                            </th>
                                            <th style={{ ...thStyle, ...thCenter, background: '#ede0b8' }}>
                                                {isAR ? 'المجموع' : 'Total'}<br />
                                                <span style={{ fontWeight: 600, color: '#9a7a30', fontSize: '11px' }}>100</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(semester.courses || []).map((course, cIdx) => (
                                            <tr
                                                key={course.id}
                                                style={{ background: cIdx % 2 === 0 ? '#fffdf5' : '#faf5e8' }}
                                            >
                                                <td style={{ ...tdStyle, fontWeight: 700 }}>
                                                    {course.courseNameSnapshot}
                                                    {course.courseCodeSnapshot && (
                                                        <span style={{ color: '#9a7a30', fontSize: '11px', marginRight: '6px' }}>
                                                            ({course.courseCodeSnapshot})
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>{course.attendanceScore}</td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>{course.participationScore}</td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>{course.assignmentsScore}</td>
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>{course.examScore ?? '—'}</td>
                                                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 900, color: '#c49642', background: cIdx % 2 === 0 ? '#fdf4e0' : '#f8edcc' }}>
                                                    {course.finalScore}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* ──── FOOTER ──── */}
                    <div style={{
                        borderTop: '1.5px solid #d4af6a',
                        padding: '14px 32px',
                        background: '#f5edd8',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#7a6230',
                        fontWeight: 600,
                    }}>
                        <p>هذه الوثيقة صادرة إلكترونياً من نظام {settings.branding.siteNameAr || 'الجامعة الأمريكية المفتوحة'}</p>
                        {settings.branding.footerText && (
                            <p style={{ marginTop: '4px' }}>{settings.branding.footerText}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Shared cell style helpers (inline objects — no Tailwind — guaranteed light in PDF)
const borderColor = '#d4b870';
const thStyle: React.CSSProperties = {
    border: `1px solid ${borderColor}`,
    padding: '10px 14px',
    fontWeight: 800,
    color: '#4a3510',
    fontSize: '13px',
    letterSpacing: '0.3px',
};
const thCenter: React.CSSProperties = { textAlign: 'center', minWidth: '72px' };
const tdStyle: React.CSSProperties = {
    border: `1px solid ${borderColor}`,
    padding: '10px 14px',
    fontSize: '13px',
    color: '#1a1a2e',
};

export default StudentTranscript;
