import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { Exam, ExamQuestion, ExamAttempt, ExamAnswer, ExamException, Course } from '../../types';
import { Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Send, FileText, Lock } from 'lucide-react';

const StudentExams: React.FC = () => {
    const { user, lang } = useApp();
    const isAR = lang === 'AR';

    const [exams, setExams] = useState<Exam[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Taking exam
    const [activeExam, setActiveExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
    const [draftAnswers, setDraftAnswers] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [exceptions, setExceptions] = useState<ExamException[]>([]);

    // Results view
    const [viewingResults, setViewingResults] = useState(false);
    const [resultAnswers, setResultAnswers] = useState<ExamAnswer[]>([]);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [ex, co] = await Promise.all([supabaseService.getExams(), supabaseService.getCourses()]);
            setExams(ex.filter(e => e.isPublished));
            setCourses(co);
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const getCourseName = (id: string) => { const c = courses.find(x => x.id === id); return c ? (isAR ? c.title_ar : c.title) : ''; };

    const getExamStatus = (exam: Exam) => {
        const now = new Date();
        const start = new Date(exam.startAt);
        const end = new Date(exam.endAt);
        // Check for student exception
        const exc = exceptions.find(e => e.examId === exam.id && e.studentId === user?.id);
        const effectiveEnd = exc ? new Date(exc.extendedUntil) : end;

        if (now < start) return 'upcoming';
        if (now > effectiveEnd) return 'ended';
        return 'active';
    };

    // Open exam to take it
    const openExam = async (exam: Exam) => {
        if (!user) return;
        setError('');
        try {
            const exc = await supabaseService.getExamExceptions(exam.id);
            setExceptions(exc);

            const now = new Date();
            const start = new Date(exam.startAt);
            const end = new Date(exam.endAt);
            const studentExc = exc.find(e => e.studentId === user.id);
            const effectiveEnd = studentExc ? new Date(studentExc.extendedUntil) : end;

            if (now < start) { setError(isAR ? 'الامتحان لم يبدأ بعد' : 'Exam has not started yet'); return; }
            if (now > effectiveEnd) { setError(isAR ? 'انتهى وقت الامتحان' : 'Exam time has ended'); return; }

            // Check existing attempt
            let att = await supabaseService.getStudentAttempt(exam.id, user.id);
            if (att && att.isSubmitted) { setError(isAR ? 'لقد أكملت هذا الامتحان مسبقاً' : 'You have already completed this exam'); return; }

            // Create attempt if none
            if (!att) att = await supabaseService.createExamAttempt(exam.id, user.id);

            const qs = await supabaseService.getExamQuestions(exam.id);
            // Load existing answers
            const existingAns = await supabaseService.getExamAnswers(att.id);
            const draft: Record<string, any> = {};
            existingAns.forEach(a => {
                const q = qs.find(x => x.id === a.questionId);
                if (!q) return;
                if (q.type === 'essay') draft[a.questionId] = a.essayAnswer || '';
                else if (q.type === 'matrix') draft[a.questionId] = a.matrixSelections || {};
                else draft[a.questionId] = a.selectedOptionId || '';
            });

            setActiveExam(exam);
            setQuestions(qs);
            setAttempt(att);
            setDraftAnswers(draft);
        } catch (e: any) { setError(e.message); }
    };

    // Save answer as student types/selects (auto-save)
    const updateAnswer = (questionId: string, value: any) => {
        setDraftAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    // Submit exam
    const submitExam = async () => {
        if (!attempt || !activeExam || !user) return;
        if (!confirm(isAR ? 'هل أنت متأكد من تسليم الامتحان؟ لن تتمكن من التعديل بعد التسليم.' : 'Are you sure you want to submit? You cannot change your answers after submission.')) return;

        setSubmitting(true);
        try {
            // Save all answers
            const answersToSave: ExamAnswer[] = questions.map(q => ({
                id: crypto.randomUUID(),
                attemptId: attempt.id,
                questionId: q.id,
                selectedOptionId: (q.type === 'mcq' || q.type === 'true_false') ? (draftAnswers[q.id] || null) : undefined,
                essayAnswer: q.type === 'essay' ? (draftAnswers[q.id] || '') : undefined,
                matrixSelections: q.type === 'matrix' ? (draftAnswers[q.id] || {}) : undefined,
                createdAt: new Date().toISOString()
            }));

            await supabaseService.bulkUpsertExamAnswers(answersToSave);
            await supabaseService.submitExamAttempt(attempt.id);

            setActiveExam(null);
            setAttempt(null);
            setQuestions([]);
            setDraftAnswers({});
            await loadData();
            alert(isAR ? 'تم تسليم الامتحان بنجاح!' : 'Exam submitted successfully!');
        } catch (e: any) { setError(e.message); }
        setSubmitting(false);
    };

    // View results
    const viewResults = async (exam: Exam) => {
        if (!user) return;
        try {
            const att = await supabaseService.getStudentAttempt(exam.id, user.id);
            if (!att) return;
            const [qs, ans] = await Promise.all([
                supabaseService.getExamQuestions(exam.id),
                supabaseService.getExamAnswers(att.id)
            ]);
            setActiveExam(exam);
            setQuestions(qs);
            setAttempt(att);
            setResultAnswers(ans);
            setViewingResults(true);
        } catch (e: any) { setError(e.message); }
    };

    const card = "bg-card rounded-2xl shadow-sm border border-border p-6";
    const btn = "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2";
    const btnPrimary = `${btn} bg-primary text-white hover:bg-primary/80`;
    const btnGray = `${btn} bg-surface text-text-primary hover:bg-border`;

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    // ===== TAKING EXAM =====
    if (activeExam && !viewingResults) {
        return (
            <div className="max-w-4xl mx-auto p-4 space-y-6" dir={isAR ? 'rtl' : 'ltr'}>
                <div className={card}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-xl font-black">{activeExam.title}</h1>
                            <p className="text-sm text-text-secondary">{getCourseName(activeExam.courseId)}</p>
                        </div>
                        <button className={btnGray} onClick={() => { setActiveExam(null); setAttempt(null); }}>{isAR ? '← خروج (بدون تسليم)' : '← Exit (without submit)'}</button>
                    </div>

                    <div className="space-y-6">
                        {questions.map((q, i) => (
                            <div key={q.id} className="border border-border rounded-xl p-5">
                                <div className="flex items-start gap-3 mb-3">
                                    <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                                    <div>
                                        <p className="font-bold text-base">{q.questionText}</p>
                                        <p className="text-xs text-text-secondary mt-1">{q.marks} {isAR ? 'درجة' : 'marks'}</p>
                                    </div>
                                </div>

                                {(q.type === 'mcq' || q.type === 'true_false') && (
                                    <div className="space-y-2 ml-11">
                                        {q.options?.map(o => (
                                            <label key={o.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${draftAnswers[q.id] === o.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface'}`}>
                                                <input type="radio" name={`q-${q.id}`} checked={draftAnswers[q.id] === o.id} onChange={() => updateAnswer(q.id, o.id)} className="accent-primary" />
                                                <span className="text-sm">{o.optionText}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'essay' && (
                                    <div className="ml-11">
                                        <textarea className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary text-sm" rows={5} placeholder={isAR ? 'اكتب إجابتك هنا...' : 'Write your answer here...'} value={draftAnswers[q.id] || ''} onChange={e => updateAnswer(q.id, e.target.value)} />
                                    </div>
                                )}

                                {q.type === 'matrix' && (
                                    <div className="ml-11 overflow-x-auto">
                                        <table className="text-sm border">
                                            <thead><tr><th className="border p-2"></th>{q.options?.map(o => <th key={o.id} className="border p-2 text-center text-xs">{o.optionText}</th>)}</tr></thead>
                                            <tbody>{q.matrixRows?.map((row, ri) => {
                                                const rowSelections: string[] = (draftAnswers[q.id] || {})[ri.toString()] || [];
                                                return (
                                                    <tr key={ri}>
                                                        <td className="border p-2 font-bold text-xs">{row}</td>
                                                        {q.options?.map(o => {
                                                            const isChecked = rowSelections.includes(o.id);
                                                            return (
                                                                <td key={o.id} className="border p-2 text-center">
                                                                    <input type="checkbox" checked={isChecked} className="accent-primary w-4 h-4 cursor-pointer" onChange={() => {
                                                                        const prev = { ...(draftAnswers[q.id] || {}) };
                                                                        const current: string[] = prev[ri.toString()] || [];
                                                                        prev[ri.toString()] = isChecked ? current.filter(id => id !== o.id) : [...current, o.id];
                                                                        updateAnswer(q.id, prev);
                                                                    }} />
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}</tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-center">
                        <button className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 transition-all flex items-center gap-2" onClick={submitExam} disabled={submitting}>
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            {isAR ? 'تسليم الامتحان' : 'Submit Exam'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ===== VIEWING RESULTS =====
    if (activeExam && viewingResults) {
        const totalAwarded = resultAnswers.reduce((s, a) => s + (a.awardedMarks || 0), 0);
        return (
            <div className="max-w-4xl mx-auto p-4 space-y-6" dir={isAR ? 'rtl' : 'ltr'}>
                <div className={card}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-black">{activeExam.title} - {isAR ? 'النتائج' : 'Results'}</h1>
                            <p className="text-2xl font-black mt-2" style={{ color: totalAwarded >= 25 ? '#16a34a' : '#dc2626' }}>{totalAwarded} / 50</p>
                        </div>
                        <button className={btnGray} onClick={() => { setActiveExam(null); setViewingResults(false); }}>{isAR ? '← رجوع' : '← Back'}</button>
                    </div>

                    <div className="space-y-4">
                        {questions.map((q, i) => {
                            const ans = resultAnswers.find(a => a.questionId === q.id);
                            return (
                                <div key={q.id} className={`border rounded-xl p-4 ${ans?.isCorrect ? 'border-green-300 bg-green-50/50' : ans?.isCorrect === false ? 'border-red-500/30 bg-red-500/10/50' : 'border-border'}`}>
                                    <div className="flex items-start gap-3 mb-2">
                                        <span className={`rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0 text-white ${ans?.isCorrect ? 'bg-green-600' : ans?.isCorrect === false ? 'bg-red-600' : 'bg-gray-400'}`}>{i + 1}</span>
                                        <div className="flex-1">
                                            <p className="font-bold">{q.questionText}</p>
                                            <p className="text-xs text-text-secondary">{ans?.awardedMarks ?? 0}/{q.marks}</p>
                                        </div>
                                    </div>
                                    {(q.type === 'mcq' || q.type === 'true_false') && q.options?.map(o => (
                                        <div key={o.id} className={`ml-10 px-3 py-2 rounded-lg text-sm mb-1 ${o.isCorrect ? 'bg-green-100 border border-green-300 font-bold' : ans?.selectedOptionId === o.id ? 'bg-red-500/20 border border-red-500/30' : 'bg-surface'}`}>
                                            {o.isCorrect && <CheckCircle size={14} className="inline mr-1 text-green-600" />}
                                            {ans?.selectedOptionId === o.id && !o.isCorrect && <XCircle size={14} className="inline mr-1 text-red-500" />}
                                            {o.optionText}
                                        </div>
                                    ))}
                                    {q.type === 'essay' && <div className="ml-10 bg-surface rounded-lg p-3 text-sm whitespace-pre-wrap">{ans?.essayAnswer || '-'}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ===== EXAM LIST =====
    return (
        <div className="max-w-5xl mx-auto p-4 space-y-6" dir={isAR ? 'rtl' : 'ltr'}>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-center gap-2"><AlertTriangle size={18} />{error}<button onClick={() => setError('')} className="ml-auto font-bold">×</button></div>}

            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{isAR ? '📝 الامتحانات' : '📝 Exams'}</h1>

            {exams.length === 0 ? (
                <div className={card}><p className="text-center text-text-secondary py-12">{isAR ? 'لا توجد امتحانات متاحة' : 'No exams available'}</p></div>
            ) : (
                <div className="space-y-3">
                    {exams.map(exam => {
                        const status = getExamStatus(exam);
                        return (
                            <div key={exam.id} className={card}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-lg">{exam.title}</h3>
                                        <p className="text-sm text-text-secondary">{getCourseName(exam.courseId)}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${status === 'active' ? 'bg-green-100 text-green-700' : status === 'upcoming' ? 'bg-primary/20 text-primary' : 'bg-surface text-text-secondary'}`}>
                                                {status === 'active' ? (isAR ? 'متاح الآن' : 'Available Now') : status === 'upcoming' ? (isAR ? 'قريباً' : 'Upcoming') : (isAR ? 'انتهى' : 'Ended')}
                                            </span>
                                            <span className="text-xs text-text-secondary flex items-center gap-1"><Clock size={12} />{new Date(exam.startAt).toLocaleDateString()} - {new Date(exam.endAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {status === 'active' && <button className={btnPrimary} onClick={() => openExam(exam)}><FileText size={16} />{isAR ? 'ابدأ الامتحان' : 'Start Exam'}</button>}
                                        {exam.isResultsReleased ? (
                                            <button className={btnGray} onClick={() => viewResults(exam)}><CheckCircle size={16} />{isAR ? 'عرض النتائج' : 'View Results'}</button>
                                        ) : status === 'ended' ? (
                                            <span className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-500 text-sm font-bold flex items-center gap-1"><Lock size={14} />{isAR ? 'في انتظار النتائج' : 'Pending Results'}</span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentExams;
