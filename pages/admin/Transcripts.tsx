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

    const card = "bg-card rounded-[2.5rem] shadow-sm border border-border p-6 md:p-8";
    const btn = "px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-black transition-all duration-200 flex items-center justify-center gap-2";

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10" dir={isAR ? 'rtl' : 'ltr'}>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm"><AlertTriangle size={20} /><span className="font-bold text-sm flex-1">{error}</span><button onClick={() => setError('')} className="p-1 hover:bg-black/5 rounded-lg transition-colors"><Unlock size={16} className="opacity-0" />×</button></div>}
            {success && <div className="bg-success/10 border border-success/20 text-success px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm"><CheckCircle size={20} /><span className="font-bold text-sm">{success}</span></div>}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-title tracking-tight flex items-center gap-3">
                        <GraduationCap size={32} className="text-primary" /> {isAR ? 'إدارة السجلات الأكاديمية' : 'Transcript Management'}
                    </h1>
                    <p className="text-text-secondary font-medium mt-2 max-w-xl">{isAR ? 'التحكم في اعتماد الفصول وإدارة السجلات الأكاديمية للطلاب.' : 'Control semester releases and manage student academic transcripts.'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Semester Release */}
                <div className={`${card} flex flex-col`}>
                    <div className="mb-6">
                        <h2 className="text-xl font-black text-text-primary">{isAR ? 'اعتماد الفصول الدراسية' : 'Semester Approval'}</h2>
                        <p className="text-xs text-text-secondary mt-1 font-medium leading-relaxed max-w-md">{isAR ? 'اعتماد الفصل يحفظ نسخة من جميع درجات الطلاب ليتم عرضها في السجل الأكاديمي' : 'Releasing a semester snapshots all student grades and shows them in the transcript'}</p>
                    </div>

                    <div className="space-y-4 flex-1">
                        {semesters.map(sem => {
                            const isReleased = releasedMap[sem.id];
                            const isSaving = saving === sem.id;
                            return (
                                <div key={sem.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border transition-colors ${isReleased ? 'border-success/30 bg-success/5' : 'border-border bg-surface hover:border-primary/30'}`}>
                                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${isReleased ? 'bg-success border-success text-white' : 'bg-card border-border text-text-secondary'}`}>
                                            {isReleased ? <CheckCircle size={20} /> : <Lock size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-black text-text-primary text-sm">{sem.name}</p>
                                            <p className={`text-[10px] uppercase font-black tracking-widest mt-1 ${isReleased ? 'text-success' : 'text-text-secondary'}`}>{isReleased ? (isAR ? 'معتمد' : 'Released') : (isAR ? 'غير معتمد' : 'Not released')}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        {isReleased ? (
                                            <button className={`${btn} w-full sm:w-auto bg-surface border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white`} onClick={() => unreleaseS(sem)} disabled={!!saving}>
                                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                                {isAR ? 'إلغاء الاعتماد' : 'Remove'}
                                            </button>
                                        ) : (
                                            <button className={`${btn} w-full sm:w-auto bg-gold-gradient text-white shadow-premium hover:shadow-premium-hover active:scale-95 text-[10px]`} onClick={() => releaseSemester(sem)} disabled={!!saving}>
                                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Unlock size={16} />}
                                                {isAR ? 'اعتماد الفصل' : 'Release'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {semesters.length === 0 && (
                            <div className="text-center p-8 bg-surface rounded-2xl border border-border border-dashed">
                                <p className="text-text-secondary font-black text-xs uppercase tracking-widest">{isAR ? 'لا توجد فصول دراسية' : 'No Semesters Found'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Student Transcript */}
                <div className={`${card} flex flex-col`}>
                    <div className="mb-6">
                        <h2 className="text-xl font-black text-text-primary">{isAR ? 'معاينة سجل طالب' : 'Preview Student Transcript'}</h2>
                        <p className="text-xs text-text-secondary mt-1 font-medium">{isAR ? 'عرض السجل الأكاديمي للطالب كما سيظهر له' : 'View the academic transcript exactly as the student sees it'}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-end bg-surface p-4 rounded-2xl border border-border">
                        <div className="flex-1 w-full">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1 mb-2 block text-text-secondary">{isAR ? 'اختر طالب' : 'Select Student'}</label>
                            <select className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text-primary text-sm font-bold outline-none focus:ring-2 focus:ring-primary transition-all" value={previewStudent} onChange={e => setPreviewStudent(e.target.value)}>
                                <option value="">{isAR ? '-- اختر طالب --' : '-- Select Student --'}</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.universityId})</option>)}
                            </select>
                        </div>
                        <button className={`${btn} w-full sm:w-auto bg-primary text-white shadow-md hover:shadow-lg active:scale-95`} onClick={() => previewTranscript(previewStudent)} disabled={!previewStudent}>
                            <Eye size={16} />{isAR ? 'معاينة السجل' : 'Preview'}
                        </button>
                    </div>

                    {showPreview && (
                        <div className="mt-6 border border-border rounded-2xl bg-surface overflow-hidden flex-1 flex flex-col">
                            <div className="p-4 border-b border-border bg-card">
                                <h3 className="text-sm font-black text-text-primary">{students.find(s => s.id === previewStudent)?.fullName || 'Student'}</h3>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar max-h-[400px]">
                                {previewData.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-60">
                                        <Eye size={32} className="text-text-secondary mb-3" />
                                        <p className="text-text-secondary font-black text-xs uppercase tracking-widest">{isAR ? 'لا توجد فصول معتمدة لهذا الطالب' : 'No released semesters for this student'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {previewData.map(sem => (
                                            <div key={sem.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                                                <div className="p-4 bg-surface border-b border-border flex justify-between items-center">
                                                    <h3 className="font-black text-text-primary text-sm">{sem.semesterNameSnapshot}</h3>
                                                    <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-black">
                                                        {isAR ? 'المعدل:' : 'Avg:'} {sem.semesterAverage?.toFixed(2)}%
                                                    </span>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-left whitespace-nowrap" dir={isAR ? 'rtl' : 'ltr'}>
                                                        <thead>
                                                            <tr className="border-b border-border bg-surface text-text-secondary text-[10px] uppercase tracking-widest font-black">
                                                                <th className="px-4 py-3">{isAR ? 'المادة' : 'Course'}</th>
                                                                <th className="px-4 py-3 text-center">{isAR ? 'حضور' : 'Att'}</th>
                                                                <th className="px-4 py-3 text-center">{isAR ? 'مشاركة' : 'Part'}</th>
                                                                <th className="px-4 py-3 text-center">{isAR ? 'واجبات' : 'Assign'}</th>
                                                                <th className="px-4 py-3 text-center">{isAR ? 'امتحان' : 'Exam'}</th>
                                                                <th className="px-4 py-3 text-center">{isAR ? 'مجموع' : 'Total'}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border">
                                                            {(sem.courses || []).map(c => (
                                                                <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                                                                    <td className="px-4 py-3 font-bold text-text-primary text-xs">{c.courseNameSnapshot}</td>
                                                                    <td className="px-4 py-3 text-center font-medium text-text-secondary">{c.attendanceScore}</td>
                                                                    <td className="px-4 py-3 text-center font-medium text-text-secondary">{c.participationScore}</td>
                                                                    <td className="px-4 py-3 text-center font-medium text-text-secondary">{c.assignmentsScore}</td>
                                                                    <td className="px-4 py-3 text-center font-medium text-text-secondary">{c.examScore ?? '-'}</td>
                                                                    <td className="px-4 py-3 text-center font-black text-text-primary bg-surface/50">{c.finalScore}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminTranscripts;
