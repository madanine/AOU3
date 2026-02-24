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

    // Calculate cumulative GPA (out of 100)
    const allCourses = transcripts.flatMap(t => t.courses || []);
    const cumulativeGPA = allCourses.length > 0
        ? (allCourses.reduce((s, c) => s + c.finalScore, 0) / allCourses.length).toFixed(2)
        : '0.00';

    const exportPDF = async () => {
        if (!transcriptRef.current) return;
        setExporting(true);
        try {
            const canvas = await html2canvas(transcriptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const imgW = canvas.width;
            const imgH = canvas.height;
            const ratio = pdfW / imgW;
            const scaledH = imgH * ratio;

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
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <GraduationCap size={28} /> {isAR ? 'كشف الدرجات' : 'Academic Transcript'}
                </h1>
                {transcripts.length > 0 && (
                    <button onClick={exportPDF} disabled={exporting} className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/80 transition-all flex items-center gap-2">
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
                <div ref={transcriptRef} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden" style={{ direction: 'rtl', fontFamily: 'Tajawal, Arial, sans-serif' }}>
                    {/* HEADER */}
                    <div className="bg-gradient-to-l from-blue-900 to-blue-700 text-white p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img src={logoSrc} alt="Logo" className="h-16 w-auto object-contain" crossOrigin="anonymous" onError={e => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }} />
                                <div>
                                    <h2 className="text-xl font-black">{settings.branding.siteNameAr || 'الجامعة الأمريكية المفتوحة'}</h2>
                                    <p className="text-text-secondary text-sm">{settings.branding.siteNameEn || 'American Open University'}</p>
                                </div>
                            </div>
                            <div className="text-left text-sm">
                                <p className="font-bold text-lg">كشف الدرجات</p>
                                <p className="text-text-secondary">Academic Transcript</p>
                            </div>
                        </div>
                    </div>

                    {/* STUDENT INFO */}
                    <div className="p-6 border-b border-border bg-surface">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><span className="text-text-secondary block">اسم الطالب</span><span className="font-bold">{user?.fullName}</span></div>
                            <div><span className="text-text-secondary block">الرقم الجامعي</span><span className="font-bold">{user?.universityId}</span></div>
                            <div><span className="text-text-secondary block">التخصص</span><span className="font-bold">{user?.major ? getMajorLabel(user.major) : '-'}</span></div>
                            <div><span className="text-text-secondary block">المعدل التراكمي</span><span className="font-black text-lg text-primary">{cumulativeGPA}%</span></div>
                        </div>
                        <p className="text-xs text-text-secondary mt-3">تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</p>
                    </div>

                    {/* WATERMARK CONTAINER */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
                            <img src={logoSrc} alt="" className="w-96" crossOrigin="anonymous" />
                        </div>

                        {/* SEMESTERS */}
                        <div className="p-6 space-y-6 relative z-10">
                            {transcripts.map((semester, sIdx) => (
                                <div key={semester.id}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">{semester.semesterNameSnapshot}</div>
                                        <div className="flex-1 h-px bg-border"></div>
                                        <span className="text-sm text-text-secondary">معدل الفصل: <strong className="text-primary">{semester.semesterAverage?.toFixed(2) || '0.00'}%</strong></span>
                                    </div>

                                    <table className="w-full border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-surface">
                                                <th className="border border-border px-3 py-2 text-right">المادة</th>
                                                <th className="border border-border px-3 py-2 text-center w-16">الحضور<br /><span className="text-[10px] text-text-secondary">20</span></th>
                                                <th className="border border-border px-3 py-2 text-center w-16">المشاركة<br /><span className="text-[10px] text-text-secondary">10</span></th>
                                                <th className="border border-border px-3 py-2 text-center w-16">الواجبات<br /><span className="text-[10px] text-text-secondary">20</span></th>
                                                <th className="border border-border px-3 py-2 text-center w-16">الامتحان<br /><span className="text-[10px] text-text-secondary">50</span></th>
                                                <th className="border border-border px-3 py-2 text-center w-16">المجموع<br /><span className="text-[10px] text-text-secondary">100</span></th>
                                                <th className="border border-border px-3 py-2 text-center w-16">النسبة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(semester.courses || []).map(course => (
                                                <tr key={course.id} className="hover:bg-surface">
                                                    <td className="border border-border px-3 py-2 font-bold">
                                                        {course.courseNameSnapshot}
                                                        {course.courseCodeSnapshot && <span className="text-text-secondary text-xs mr-2">({course.courseCodeSnapshot})</span>}
                                                    </td>
                                                    <td className="border border-border px-3 py-2 text-center">{course.attendanceScore}</td>
                                                    <td className="border border-border px-3 py-2 text-center">{course.participationScore}</td>
                                                    <td className="border border-border px-3 py-2 text-center">{course.assignmentsScore}</td>
                                                    <td className="border border-border px-3 py-2 text-center">{course.examScore ?? '-'}</td>
                                                    <td className="border border-border px-3 py-2 text-center font-bold">{course.finalScore}</td>
                                                    <td className="border border-border px-3 py-2 text-center">{course.percentage}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>

                        {/* FOOTER */}
                        <div className="border-t border-border p-4 bg-surface text-center text-xs text-text-secondary">
                            <p>هذه الوثيقة صادرة إلكترونياً من نظام {settings.branding.siteNameAr || 'الجامعة الأمريكية المفتوحة'}</p>
                            <p className="mt-1">{settings.branding.footerText}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentTranscript;
