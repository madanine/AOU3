import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { Semester, SemesterTranscript, User } from '../../types';
import { Loader2, CheckCircle, AlertTriangle, Unlock, Lock, GraduationCap, Users, Trash2, Eye } from 'lucide-react';

const AdminTranscripts: React.FC = () => {
    const { lang } = useApp();
    const isAR = lang === 'AR';

    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [releasedMap, setReleasedMap] = useState<Record<string, boolean>>({});
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Preview
    const [previewStudent, setPreviewStudent] = useState<string>('');
    const [previewData, setPreviewData] = useState<SemesterTranscript[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [sem, st] = await Promise.all([supabaseService.getSemesters(), supabaseService.getUsers()]);
            setSemesters(sem);
            setStudents(st.filter(s => s.role === 'student'));

            const rMap: Record<string, boolean> = {};
            for (const s of sem) {
                rMap[s.id] = await supabaseService.isSemesterReleased(s.id);
            }
            setReleasedMap(rMap);
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const releaseSemester = async (semester: Semester) => {
        if (!confirm(isAR
            ? `هل تريد اعتماد الفصل "${semester.name}"؟ سيتم حفظ snapshot لجميع درجات الطلاب.`
            : `Release semester "${semester.name}"? This will snapshot all student grades.`
        )) return;

        setSaving(semester.id); setError('');
        try {
            await supabaseService.releaseSemester(semester.id, semester.name);
            setReleasedMap(prev => ({ ...prev, [semester.id]: true }));
            setSuccess(isAR ? `تم اعتماد الفصل "${semester.name}" بنجاح` : `Semester "${semester.name}" released successfully`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) { setError(e.message); }
        setSaving('');
    };

    const unreleaseS = async (semester: Semester) => {
        if (!confirm(isAR ? 'حذف بيانات الاعتماد لهذا الفصل؟' : 'Remove release data for this semester?')) return;
        setSaving(semester.id);
        try {
            await supabaseService.deleteSemesterTranscript(semester.id);
            setReleasedMap(prev => ({ ...prev, [semester.id]: false }));
            setSuccess(isAR ? 'تم إلغاء الاعتماد' : 'Release removed');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) { setError(e.message); }
        setSaving('');
    };

    const previewTranscript = async (studentId: string) => {
        if (!studentId) return;
        try {
            const data = await supabaseService.getFullTranscript(studentId);
            setPreviewData(data);
            setShowPreview(true);
        } catch (e: any) { setError(e.message); }
    };

    const card = "bg-white rounded-2xl shadow-sm border border-gray-100 p-6";
    const btn = "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2";

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6" dir={isAR ? 'rtl' : 'ltr'}>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2"><AlertTriangle size={18} />{error}<button onClick={() => setError('')} className="ml-auto font-bold">×</button></div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2"><CheckCircle size={18} />{success}</div>}

            <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <GraduationCap size={28} /> {isAR ? 'إدارة السجلات الأكاديمية' : 'Transcript Management'}
            </h1>

            {/* Semester Release */}
            <div className={card}>
                <h2 className="text-lg font-bold mb-4">{isAR ? 'اعتماد الفصول الدراسية' : 'Semester Approval'}</h2>
                <p className="text-sm text-gray-500 mb-4">{isAR ? 'اعتماد الفصل يحفظ snapshot لجميع درجات الطلاب ويظهر في السجل الأكاديمي' : 'Releasing a semester snapshots all student grades and shows them in the transcript'}</p>

                <div className="space-y-3">
                    {semesters.map(sem => {
                        const isReleased = releasedMap[sem.id];
                        const isSaving = saving === sem.id;
                        return (
                            <div key={sem.id} className={`flex items-center justify-between p-4 rounded-xl border ${isReleased ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
                                <div className="flex items-center gap-3">
                                    {isReleased ? <CheckCircle className="text-green-600" size={20} /> : <Lock className="text-gray-400" size={20} />}
                                    <div>
                                        <p className="font-bold">{sem.name}</p>
                                        <p className="text-xs text-gray-500">{isReleased ? (isAR ? 'معتمد ✓' : 'Released ✓') : (isAR ? 'غير معتمد' : 'Not released')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {isReleased ? (
                                        <button className={`${btn} bg-red-50 text-red-600 hover:bg-red-100`} onClick={() => unreleaseS(sem)} disabled={!!saving}>
                                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                            {isAR ? 'إلغاء' : 'Remove'}
                                        </button>
                                    ) : (
                                        <button className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={() => releaseSemester(sem)} disabled={!!saving}>
                                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Unlock size={16} />}
                                            {isAR ? 'اعتماد الفصل' : 'Release Semester'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Preview Student Transcript */}
            <div className={card}>
                <h2 className="text-lg font-bold mb-4">{isAR ? 'معاينة سجل طالب' : 'Preview Student Transcript'}</h2>
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <select className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" value={previewStudent} onChange={e => setPreviewStudent(e.target.value)}>
                            <option value="">{isAR ? 'اختر طالب' : 'Select Student'}</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.universityId})</option>)}
                        </select>
                    </div>
                    <button className={`${btn} bg-blue-600 text-white hover:bg-blue-700`} onClick={() => previewTranscript(previewStudent)} disabled={!previewStudent}><Eye size={16} />{isAR ? 'عرض' : 'View'}</button>
                </div>

                {showPreview && (
                    <div className="mt-4 border rounded-xl p-4">
                        {previewData.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">{isAR ? 'لا توجد فصول معتمدة لهذا الطالب' : 'No released semesters for this student'}</p>
                        ) : (
                            <div className="space-y-4">
                                {previewData.map(sem => (
                                    <div key={sem.id}>
                                        <h3 className="font-bold text-blue-700 mb-2">{sem.semesterNameSnapshot} — {isAR ? 'المعدل:' : 'Avg:'} {sem.semesterAverage?.toFixed(2)}%</h3>
                                        <table className="w-full text-sm border-collapse">
                                            <thead><tr className="bg-gray-100"><th className="border px-2 py-1">{isAR ? 'المادة' : 'Course'}</th><th className="border px-2 py-1 w-14">{isAR ? 'حضور' : 'Att'}</th><th className="border px-2 py-1 w-14">{isAR ? 'مشاركة' : 'Part'}</th><th className="border px-2 py-1 w-14">{isAR ? 'واجبات' : 'Assign'}</th><th className="border px-2 py-1 w-14">{isAR ? 'امتحان' : 'Exam'}</th><th className="border px-2 py-1 w-14">{isAR ? 'مجموع' : 'Total'}</th></tr></thead>
                                            <tbody>
                                                {(sem.courses || []).map(c => (
                                                    <tr key={c.id}><td className="border px-2 py-1 font-bold">{c.courseNameSnapshot}</td><td className="border px-2 py-1 text-center">{c.attendanceScore}</td><td className="border px-2 py-1 text-center">{c.participationScore}</td><td className="border px-2 py-1 text-center">{c.assignmentsScore}</td><td className="border px-2 py-1 text-center">{c.examScore ?? '-'}</td><td className="border px-2 py-1 text-center font-bold">{c.finalScore}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTranscripts;
