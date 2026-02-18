import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { Exam, ExamQuestion, ExamOption, ExamAttempt, ExamAnswer, ExamException, ExamQuestionType, Course, Semester, User } from '../../types';
import { Plus, Trash2, Edit, Eye, CheckCircle, XCircle, Clock, Send, AlertTriangle, ChevronDown, ChevronUp, FileText, Users, Award, Loader2, Search } from 'lucide-react';

type Tab = 'list' | 'create' | 'questions' | 'attempts' | 'grade';

const AdminExams: React.FC = () => {
    const { lang, t, user } = useApp();
    const isAR = lang === 'AR';

    const [tab, setTab] = useState<Tab>('list');
    const [exams, setExams] = useState<Exam[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Exam form
    const [editExam, setEditExam] = useState<Partial<Exam>>({});
    const [selectedExamId, setSelectedExamId] = useState('');

    // Questions
    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [editQuestion, setEditQuestion] = useState<Partial<ExamQuestion> & { options?: Partial<ExamOption>[] }>({});
    const [showQForm, setShowQForm] = useState(false);

    // Attempts & Grading
    const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
    const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
    const [answers, setAnswers] = useState<ExamAnswer[]>([]);
    const [gradingQ, setGradingQ] = useState<ExamQuestion[]>([]);

    // Exceptions
    const [exceptions, setExceptions] = useState<ExamException[]>([]);
    const [showExcForm, setShowExcForm] = useState(false);
    const [excStudentId, setExcStudentId] = useState('');
    const [excUntil, setExcUntil] = useState('');

    const [searchTerm, setSearchTerm] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [ex, co, se, st] = await Promise.all([
                supabaseService.getExams(),
                supabaseService.getCourses(),
                supabaseService.getSemesters(),
                supabaseService.getUsers()
            ]);
            setExams(ex); setCourses(co); setSemesters(se); setStudents(st.filter(s => s.role === 'student'));
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

    const getCourseName = (id: string) => {
        const c = courses.find(x => x.id === id);
        return c ? (isAR ? c.title_ar : c.title) : id;
    };
    const getSemName = (id: string) => semesters.find(x => x.id === id)?.name || id;
    const getStudentName = (id: string) => students.find(x => x.id === id)?.fullName || id;

    // ===== EXAM CRUD =====
    const saveExam = async () => {
        if (!editExam.courseId || !editExam.semesterId || !editExam.title || !editExam.startAt || !editExam.endAt) {
            setError(isAR ? 'جميع الحقول مطلوبة' : 'All fields are required'); return;
        }
        setSaving(true); setError('');
        try {
            await supabaseService.upsertExam({
                id: editExam.id || crypto.randomUUID(),
                courseId: editExam.courseId,
                semesterId: editExam.semesterId,
                title: editExam.title,
                startAt: editExam.startAt,
                endAt: editExam.endAt,
                totalMarks: editExam.totalMarks || 50,
                isPublished: editExam.isPublished || false,
                isResultsReleased: editExam.isResultsReleased || false,
                createdAt: editExam.createdAt || new Date().toISOString()
            } as Exam);
            await loadData();
            setTab('list'); setEditExam({});
            flash(isAR ? 'تم حفظ الامتحان' : 'Exam saved');
        } catch (e: any) { setError(e.message); }
        setSaving(false);
    };

    const deleteExam = async (id: string) => {
        if (!confirm(isAR ? 'حذف هذا الامتحان؟' : 'Delete this exam?')) return;
        try { await supabaseService.deleteExam(id); await loadData(); flash(isAR ? 'تم الحذف' : 'Deleted'); } catch (e: any) { setError(e.message); }
    };

    const togglePublish = async (exam: Exam) => {
        try { await supabaseService.publishExam(exam.id, !exam.isPublished); await loadData(); } catch (e: any) { setError(e.message); }
    };

    const releaseResults = async (examId: string) => {
        if (!confirm(isAR ? 'إصدار النتائج؟ هذا الإجراء لا يمكن التراجع عنه' : 'Release results? This cannot be undone.')) return;
        setSaving(true);
        try {
            // Auto-grade MCQ/TF/Matrix
            const qs = await supabaseService.getExamQuestions(examId);
            const atts = await supabaseService.getExamAttempts(examId);
            for (const att of atts.filter(a => a.isSubmitted)) {
                const ans = await supabaseService.getExamAnswers(att.id);
                let total = 0;
                for (const a of ans) {
                    const q = qs.find(x => x.id === a.questionId);
                    if (!q) continue;
                    if (q.type === 'mcq' || q.type === 'true_false') {
                        const correct = q.options?.find(o => o.isCorrect);
                        const isCorrect = correct && a.selectedOptionId === correct.id;
                        const marks = isCorrect ? q.marks : 0;
                        await supabaseService.gradeExamAnswer(a.id, marks, !!isCorrect);
                        total += marks;
                    } else if (q.type === 'matrix') {
                        if (q.matrixAnswers && a.matrixSelections) {
                            const rows = Object.keys(q.matrixAnswers);
                            let correctRows = 0;
                            rows.forEach(r => { if (a.matrixSelections![r] === q.matrixAnswers![r]) correctRows++; });
                            const marks = rows.length > 0 ? Math.round((correctRows / rows.length) * q.marks) : 0;
                            await supabaseService.gradeExamAnswer(a.id, marks, correctRows === rows.length);
                            total += marks;
                        }
                    } else if (q.type === 'essay') {
                        total += a.awardedMarks || 0;
                    }
                }
                await supabaseService.updateAttemptScore(att.id, total);
            }
            await supabaseService.releaseExamResults(examId);
            await loadData();
            flash(isAR ? 'تم إصدار النتائج' : 'Results released');
        } catch (e: any) { setError(e.message); }
        setSaving(false);
    };

    // ===== QUESTIONS =====
    const openQuestions = async (examId: string) => {
        setSelectedExamId(examId);
        setTab('questions');
        try { setQuestions(await supabaseService.getExamQuestions(examId)); } catch (e: any) { setError(e.message); }
    };

    const totalQMarks = questions.reduce((s, q) => s + q.marks, 0);

    const saveQuestion = async () => {
        if (!editQuestion.questionText || !editQuestion.type) { setError(isAR ? 'أكمل البيانات' : 'Fill all fields'); return; }
        setSaving(true); setError('');
        try {
            const saved = await supabaseService.upsertExamQuestion({
                id: editQuestion.id || crypto.randomUUID(),
                examId: selectedExamId,
                type: editQuestion.type as ExamQuestionType,
                questionText: editQuestion.questionText,
                marks: editQuestion.marks || 1,
                orderIndex: editQuestion.orderIndex || questions.length,
                matrixRows: editQuestion.matrixRows,
                matrixAnswers: editQuestion.matrixAnswers,
                createdAt: editQuestion.createdAt || new Date().toISOString()
            } as ExamQuestion);

            // Save options for MCQ/TF/Matrix
            if (['mcq', 'true_false', 'matrix'].includes(editQuestion.type!) && editQuestion.options?.length) {
                await supabaseService.deleteExamOptionsByQuestion(saved.id);
                for (let i = 0; i < editQuestion.options.length; i++) {
                    const opt = editQuestion.options[i];
                    await supabaseService.upsertExamOption({
                        id: crypto.randomUUID(),
                        questionId: saved.id,
                        optionText: opt.optionText || '',
                        isCorrect: opt.isCorrect || false,
                        orderIndex: i
                    } as ExamOption);
                }
            }
            setQuestions(await supabaseService.getExamQuestions(selectedExamId));
            setShowQForm(false); setEditQuestion({});
            flash(isAR ? 'تم حفظ السؤال' : 'Question saved');
        } catch (e: any) { setError(e.message); }
        setSaving(false);
    };

    const deleteQuestion = async (id: string) => {
        if (!confirm(isAR ? 'حذف السؤال؟' : 'Delete question?')) return;
        try {
            await supabaseService.deleteExamQuestion(id);
            setQuestions(await supabaseService.getExamQuestions(selectedExamId));
        } catch (e: any) { setError(e.message); }
    };

    const startEditQ = (q: ExamQuestion) => {
        setEditQuestion({ ...q, options: q.options || [] });
        setShowQForm(true);
    };

    const startNewQ = (type: ExamQuestionType) => {
        const opts: Partial<ExamOption>[] = type === 'true_false'
            ? [{ optionText: isAR ? 'صح' : 'True', isCorrect: true }, { optionText: isAR ? 'خطأ' : 'False', isCorrect: false }]
            : type === 'mcq' ? [{ optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }] : [];
        setEditQuestion({ type, marks: 1, options: opts, matrixRows: type === 'matrix' ? [''] : undefined });
        setShowQForm(true);
    };

    // ===== ATTEMPTS =====
    const openAttempts = async (examId: string) => {
        setSelectedExamId(examId);
        setTab('attempts');
        try {
            const [a, e] = await Promise.all([
                supabaseService.getExamAttempts(examId),
                supabaseService.getExamExceptions(examId)
            ]);
            setAttempts(a); setExceptions(e);
        } catch (e: any) { setError(e.message); }
    };

    const openGrading = async (attempt: ExamAttempt) => {
        setSelectedAttempt(attempt);
        setTab('grade');
        try {
            const [a, q] = await Promise.all([
                supabaseService.getExamAnswers(attempt.id),
                supabaseService.getExamQuestions(attempt.examId)
            ]);
            setAnswers(a); setGradingQ(q);
        } catch (e: any) { setError(e.message); }
    };

    const gradeEssay = async (answerId: string, marks: number, maxMarks: number) => {
        const m = Math.min(Math.max(0, marks), maxMarks);
        try {
            await supabaseService.gradeExamAnswer(answerId, m, m > 0);
            setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, awardedMarks: m, isCorrect: m > 0 } : a));
        } catch (e: any) { setError(e.message); }
    };

    const saveException = async () => {
        if (!excStudentId || !excUntil) return;
        try {
            await supabaseService.upsertExamException({ id: crypto.randomUUID(), examId: selectedExamId, studentId: excStudentId, extendedUntil: excUntil, createdAt: new Date().toISOString() });
            setExceptions(await supabaseService.getExamExceptions(selectedExamId));
            setShowExcForm(false); setExcStudentId(''); setExcUntil('');
        } catch (e: any) { setError(e.message); }
    };

    // ===== FILTERED =====
    const filteredExams = exams.filter(e => {
        const term = searchTerm.toLowerCase();
        return e.title.toLowerCase().includes(term) || getCourseName(e.courseId).toLowerCase().includes(term);
    });

    // ===== STYLES =====
    const card = "bg-white rounded-2xl shadow-sm border border-gray-100 p-6";
    const btn = "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2";
    const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
    const btnDanger = `${btn} bg-red-50 text-red-600 hover:bg-red-100`;
    const btnGreen = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;
    const btnGray = `${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`;
    const input = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";
    const label = "block text-sm font-bold text-gray-700 mb-1";

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    // ===== RENDER =====
    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6" dir={isAR ? 'rtl' : 'ltr'}>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2"><AlertTriangle size={18} />{error}<button onClick={() => setError('')} className="ml-auto font-bold">×</button></div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2"><CheckCircle size={18} />{success}</div>}

            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{isAR ? '📝 إدارة الامتحانات' : '📝 Exam Management'}</h1>
                {tab === 'list' && <button className={btnPrimary} onClick={() => { setEditExam({}); setTab('create'); }}><Plus size={18} />{isAR ? 'امتحان جديد' : 'New Exam'}</button>}
                {tab !== 'list' && <button className={btnGray} onClick={() => { setTab('list'); setShowQForm(false); setSelectedAttempt(null); }}>{isAR ? '← رجوع' : '← Back'}</button>}
            </div>

            {/* ====== LIST TAB ====== */}
            {tab === 'list' && (
                <div className={card}>
                    <div className="mb-4 relative">
                        <Search className="absolute top-3 left-3 text-gray-400" size={18} />
                        <input className={`${input} pl-10`} placeholder={isAR ? 'بحث...' : 'Search...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    {filteredExams.length === 0 ? (
                        <p className="text-center text-gray-500 py-12">{isAR ? 'لا توجد امتحانات' : 'No exams found'}</p>
                    ) : (
                        <div className="space-y-3">
                            {filteredExams.map(exam => (
                                <div key={exam.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{exam.title}</h3>
                                            <p className="text-sm text-gray-500">{getCourseName(exam.courseId)} • {getSemName(exam.semesterId)}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${exam.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {exam.isPublished ? (isAR ? 'منشور' : 'Published') : (isAR ? 'مسودة' : 'Draft')}
                                                </span>
                                                {exam.isResultsReleased && <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{isAR ? 'نتائج صادرة' : 'Results Released'}</span>}
                                                <span className="text-xs text-gray-400"><Clock size={12} className="inline mr-1" />{new Date(exam.startAt).toLocaleDateString()} - {new Date(exam.endAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button className={btnGray} onClick={() => openQuestions(exam.id)}><FileText size={16} />{isAR ? 'أسئلة' : 'Questions'}</button>
                                            <button className={btnGray} onClick={() => openAttempts(exam.id)}><Users size={16} />{isAR ? 'محاولات' : 'Attempts'}</button>
                                            <button className={btnGray} onClick={() => togglePublish(exam)}>{exam.isPublished ? <XCircle size={16} /> : <CheckCircle size={16} />}{exam.isPublished ? (isAR ? 'إلغاء النشر' : 'Unpublish') : (isAR ? 'نشر' : 'Publish')}</button>
                                            {!exam.isResultsReleased && <button className={btnGreen} onClick={() => releaseResults(exam.id)} disabled={saving}><Award size={16} />{isAR ? 'إصدار النتائج' : 'Release Results'}</button>}
                                            <button className={btnGray} onClick={() => { setEditExam(exam); setTab('create'); }}><Edit size={16} /></button>
                                            <button className={btnDanger} onClick={() => deleteExam(exam.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ====== CREATE/EDIT TAB ====== */}
            {tab === 'create' && (
                <div className={card}>
                    <h2 className="text-xl font-bold mb-6">{editExam.id ? (isAR ? 'تعديل الامتحان' : 'Edit Exam') : (isAR ? 'إنشاء امتحان جديد' : 'Create New Exam')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={label}>{isAR ? 'عنوان الامتحان' : 'Exam Title'}</label><input className={input} value={editExam.title || ''} onChange={e => setEditExam(p => ({ ...p, title: e.target.value }))} /></div>
                        <div><label className={label}>{isAR ? 'المادة' : 'Course'}</label><select className={input} value={editExam.courseId || ''} onChange={e => setEditExam(p => ({ ...p, courseId: e.target.value }))}><option value="">{isAR ? 'اختر' : 'Select'}</option>{courses.map(c => <option key={c.id} value={c.id}>{isAR ? c.title_ar : c.title}</option>)}</select></div>
                        <div><label className={label}>{isAR ? 'الفصل' : 'Semester'}</label><select className={input} value={editExam.semesterId || ''} onChange={e => setEditExam(p => ({ ...p, semesterId: e.target.value }))}><option value="">{isAR ? 'اختر' : 'Select'}</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                        <div><label className={label}>{isAR ? 'الدرجة الكلية' : 'Total Marks'}</label><input type="number" className={input} value={editExam.totalMarks || 50} onChange={e => setEditExam(p => ({ ...p, totalMarks: parseInt(e.target.value) || 50 }))} /></div>
                        <div><label className={label}>{isAR ? 'يبدأ في' : 'Starts At'}</label><input type="datetime-local" className={input} value={editExam.startAt ? editExam.startAt.slice(0, 16) : ''} onChange={e => setEditExam(p => ({ ...p, startAt: new Date(e.target.value).toISOString() }))} /></div>
                        <div><label className={label}>{isAR ? 'ينتهي في' : 'Ends At'}</label><input type="datetime-local" className={input} value={editExam.endAt ? editExam.endAt.slice(0, 16) : ''} onChange={e => setEditExam(p => ({ ...p, endAt: new Date(e.target.value).toISOString() }))} /></div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button className={btnPrimary} onClick={saveExam} disabled={saving}>{saving && <Loader2 className="animate-spin" size={16} />}{isAR ? 'حفظ' : 'Save'}</button>
                        <button className={btnGray} onClick={() => { setTab('list'); setEditExam({}); }}>{isAR ? 'إلغاء' : 'Cancel'}</button>
                    </div>
                </div>
            )}

            {/* ====== QUESTIONS TAB ====== */}
            {tab === 'questions' && (
                <div className={card}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold">{isAR ? 'الأسئلة' : 'Questions'}</h2>
                            <p className="text-sm text-gray-500">{isAR ? 'المجموع:' : 'Total:'} {totalQMarks}/50</p>
                            {totalQMarks !== 50 && <p className="text-xs text-red-500 font-bold">{isAR ? '⚠ يجب أن يكون المجموع 50' : '⚠ Total must be exactly 50'}</p>}
                        </div>
                        {!showQForm && (
                            <div className="flex gap-2 flex-wrap">
                                {(['mcq', 'true_false', 'essay', 'matrix'] as ExamQuestionType[]).map(type => (
                                    <button key={type} className={btnGray} onClick={() => startNewQ(type)}>
                                        <Plus size={14} />{{ mcq: isAR ? 'اختياري' : 'MCQ', true_false: isAR ? 'صح/خطأ' : 'T/F', essay: isAR ? 'مقالي' : 'Essay', matrix: isAR ? 'مصفوفة' : 'Matrix' }[type]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {showQForm && (
                        <div className="bg-blue-50 rounded-xl p-4 mb-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2"><label className={label}>{isAR ? 'نص السؤال' : 'Question Text'}</label><textarea className={input} rows={2} value={editQuestion.questionText || ''} onChange={e => setEditQuestion(p => ({ ...p, questionText: e.target.value }))} /></div>
                                <div><label className={label}>{isAR ? 'الدرجة' : 'Marks'}</label><input type="number" className={input} value={editQuestion.marks || 1} onChange={e => setEditQuestion(p => ({ ...p, marks: parseInt(e.target.value) || 1 }))} /></div>
                            </div>

                            {(editQuestion.type === 'mcq' || editQuestion.type === 'true_false') && (
                                <div>
                                    <label className={label}>{isAR ? 'الخيارات' : 'Options'}</label>
                                    {editQuestion.options?.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2 mb-2">
                                            <input type="radio" name="correct" checked={opt.isCorrect || false} onChange={() => setEditQuestion(p => ({ ...p, options: p.options?.map((o, j) => ({ ...o, isCorrect: j === i })) }))} />
                                            <input className={`${input} flex-1`} value={opt.optionText || ''} onChange={e => setEditQuestion(p => ({ ...p, options: p.options?.map((o, j) => j === i ? { ...o, optionText: e.target.value } : o) }))} placeholder={`${isAR ? 'خيار' : 'Option'} ${i + 1}`} />
                                            {editQuestion.type === 'mcq' && <button onClick={() => setEditQuestion(p => ({ ...p, options: p.options?.filter((_, j) => j !== i) }))} className="text-red-500"><Trash2 size={16} /></button>}
                                        </div>
                                    ))}
                                    {editQuestion.type === 'mcq' && <button className="text-blue-600 text-sm font-bold" onClick={() => setEditQuestion(p => ({ ...p, options: [...(p.options || []), { optionText: '', isCorrect: false }] }))}><Plus size={14} className="inline" /> {isAR ? 'إضافة خيار' : 'Add Option'}</button>}
                                </div>
                            )}

                            {editQuestion.type === 'matrix' && (
                                <div>
                                    <label className={label}>{isAR ? 'أعمدة (خيارات)' : 'Columns (Options)'}</label>
                                    {editQuestion.options?.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2 mb-2">
                                            <input className={`${input} flex-1`} value={opt.optionText || ''} onChange={e => setEditQuestion(p => ({ ...p, options: p.options?.map((o, j) => j === i ? { ...o, optionText: e.target.value } : o) }))} />
                                            <button onClick={() => setEditQuestion(p => ({ ...p, options: p.options?.filter((_, j) => j !== i) }))} className="text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <button className="text-blue-600 text-sm font-bold mb-3" onClick={() => setEditQuestion(p => ({ ...p, options: [...(p.options || []), { optionText: '', isCorrect: false }] }))}><Plus size={14} className="inline" /> {isAR ? 'إضافة عمود' : 'Add Column'}</button>
                                    <label className={label}>{isAR ? 'صفوف' : 'Rows'}</label>
                                    {editQuestion.matrixRows?.map((row, i) => (
                                        <div key={i} className="flex items-center gap-2 mb-2">
                                            <input className={`${input} flex-1`} value={row} onChange={e => setEditQuestion(p => ({ ...p, matrixRows: p.matrixRows?.map((r, j) => j === i ? e.target.value : r) }))} />
                                            <button onClick={() => setEditQuestion(p => ({ ...p, matrixRows: p.matrixRows?.filter((_, j) => j !== i) }))} className="text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <button className="text-blue-600 text-sm font-bold" onClick={() => setEditQuestion(p => ({ ...p, matrixRows: [...(p.matrixRows || []), ''] }))}><Plus size={14} className="inline" /> {isAR ? 'إضافة صف' : 'Add Row'}</button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button className={btnPrimary} onClick={saveQuestion} disabled={saving}>{saving && <Loader2 className="animate-spin" size={16} />}{isAR ? 'حفظ' : 'Save'}</button>
                                <button className={btnGray} onClick={() => { setShowQForm(false); setEditQuestion({}); }}>{isAR ? 'إلغاء' : 'Cancel'}</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {questions.map((q, i) => (
                            <div key={q.id} className="border rounded-xl p-3 flex items-start gap-3">
                                <span className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm">{q.questionText}</p>
                                    <p className="text-xs text-gray-500">{{ mcq: 'MCQ', true_false: 'T/F', essay: isAR ? 'مقالي' : 'Essay', matrix: isAR ? 'مصفوفة' : 'Matrix' }[q.type]} • {q.marks} {isAR ? 'درجة' : 'marks'}</p>
                                    {q.options && q.options.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{q.options.map(o => <span key={o.id} className={`text-xs px-2 py-0.5 rounded-full ${o.isCorrect ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{o.optionText}</span>)}</div>}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => startEditQ(q)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16} /></button>
                                    <button onClick={() => deleteQuestion(q.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ====== ATTEMPTS TAB ====== */}
            {tab === 'attempts' && (
                <div className={card}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">{isAR ? 'محاولات الطلاب' : 'Student Attempts'}</h2>
                        <button className={btnGray} onClick={() => setShowExcForm(!showExcForm)}><Clock size={16} />{isAR ? 'تمديد وقت' : 'Time Extension'}</button>
                    </div>

                    {showExcForm && (
                        <div className="bg-yellow-50 rounded-xl p-4 mb-4 space-y-3">
                            <h3 className="font-bold">{isAR ? 'تمديد وقت لطالب' : 'Grant Time Extension'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <select className={input} value={excStudentId} onChange={e => setExcStudentId(e.target.value)}><option value="">{isAR ? 'اختر طالب' : 'Select Student'}</option>{students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select>
                                <input type="datetime-local" className={input} value={excUntil} onChange={e => setExcUntil(e.target.value)} />
                                <button className={btnPrimary} onClick={saveException}>{isAR ? 'حفظ' : 'Save'}</button>
                            </div>
                            {exceptions.length > 0 && (
                                <div className="mt-2 space-y-1">{exceptions.map(ex => (
                                    <div key={ex.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
                                        <span>{getStudentName(ex.studentId)} → {new Date(ex.extendedUntil).toLocaleString()}</span>
                                        <button onClick={async () => { await supabaseService.deleteExamException(ex.id); setExceptions(await supabaseService.getExamExceptions(selectedExamId)); }} className="text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                ))}</div>
                            )}
                        </div>
                    )}

                    {attempts.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">{isAR ? 'لا توجد محاولات' : 'No attempts yet'}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b"><th className="py-2 px-3 text-left">{isAR ? 'الطالب' : 'Student'}</th><th className="py-2 px-3">{isAR ? 'الحالة' : 'Status'}</th><th className="py-2 px-3">{isAR ? 'الدرجة' : 'Score'}</th><th className="py-2 px-3">{isAR ? 'التاريخ' : 'Date'}</th><th className="py-2 px-3"></th></tr></thead>
                                <tbody>{attempts.map(a => (
                                    <tr key={a.id} className="border-b hover:bg-gray-50">
                                        <td className="py-2 px-3 font-bold">{getStudentName(a.studentId)}</td>
                                        <td className="py-2 px-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${a.isSubmitted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.isSubmitted ? (isAR ? 'مسلّم' : 'Submitted') : (isAR ? 'قيد التقدم' : 'In Progress')}</span></td>
                                        <td className="py-2 px-3 text-center font-bold">{a.totalScore !== null && a.totalScore !== undefined ? a.totalScore : '-'}/50</td>
                                        <td className="py-2 px-3 text-center text-gray-500">{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '-'}</td>
                                        <td className="py-2 px-3"><button className={btnGray} onClick={() => openGrading(a)}><Eye size={14} />{isAR ? 'تصحيح' : 'Grade'}</button></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ====== GRADING TAB ====== */}
            {tab === 'grade' && selectedAttempt && (
                <div className={card}>
                    <h2 className="text-xl font-bold mb-4">{isAR ? 'تصحيح إجابات' : 'Grade Answers'} - {getStudentName(selectedAttempt.studentId)}</h2>
                    <div className="space-y-4">
                        {gradingQ.map((q, i) => {
                            const ans = answers.find(a => a.questionId === q.id);
                            return (
                                <div key={q.id} className="border rounded-xl p-4">
                                    <div className="flex items-start gap-3 mb-2">
                                        <span className="bg-blue-100 text-blue-700 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                                        <div className="flex-1">
                                            <p className="font-bold">{q.questionText}</p>
                                            <p className="text-xs text-gray-500">{q.marks} {isAR ? 'درجة' : 'marks'} • {{ mcq: 'MCQ', true_false: 'T/F', essay: isAR ? 'مقالي' : 'Essay', matrix: isAR ? 'مصفوفة' : 'Matrix' }[q.type]}</p>
                                        </div>
                                        {ans && <span className={`px-2 py-1 rounded-full text-xs font-bold ${ans.isCorrect ? 'bg-green-100 text-green-700' : ans.isCorrect === false ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{ans.awardedMarks ?? '?'}/{q.marks}</span>}
                                    </div>

                                    {(q.type === 'mcq' || q.type === 'true_false') && (
                                        <div className="ml-10 space-y-1">
                                            {q.options?.map(o => {
                                                const selected = ans?.selectedOptionId === o.id;
                                                return (
                                                    <div key={o.id} className={`px-3 py-2 rounded-lg text-sm ${o.isCorrect ? 'bg-green-50 border border-green-300' : selected ? 'bg-red-50 border border-red-300' : 'bg-gray-50'}`}>
                                                        {selected && (o.isCorrect ? <CheckCircle size={14} className="inline mr-1 text-green-600" /> : <XCircle size={14} className="inline mr-1 text-red-600" />)}
                                                        {o.optionText}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {q.type === 'essay' && (
                                        <div className="ml-10 space-y-2">
                                            <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap">{ans?.essayAnswer || (isAR ? 'لا توجد إجابة' : 'No answer')}</div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-bold">{isAR ? 'الدرجة:' : 'Score:'}</label>
                                                <input type="number" className="w-20 px-2 py-1 border rounded-lg text-sm" min={0} max={q.marks} value={ans?.awardedMarks ?? ''} onChange={e => { if (ans) gradeEssay(ans.id, parseInt(e.target.value) || 0, q.marks); }} />
                                                <span className="text-sm text-gray-500">/ {q.marks}</span>
                                            </div>
                                        </div>
                                    )}

                                    {q.type === 'matrix' && ans?.matrixSelections && (
                                        <div className="ml-10 overflow-x-auto">
                                            <table className="text-sm border">
                                                <thead><tr><th className="border p-2"></th>{q.options?.map(o => <th key={o.id} className="border p-2 text-center">{o.optionText}</th>)}</tr></thead>
                                                <tbody>{q.matrixRows?.map((row, ri) => (
                                                    <tr key={ri}>
                                                        <td className="border p-2 font-bold">{row}</td>
                                                        {q.options?.map(o => {
                                                            const sel = ans.matrixSelections![ri.toString()] === o.id;
                                                            const correct = q.matrixAnswers?.[ri.toString()] === o.id;
                                                            return <td key={o.id} className={`border p-2 text-center ${sel && correct ? 'bg-green-100' : sel ? 'bg-red-100' : correct ? 'bg-green-50' : ''}`}>{sel ? '●' : ''}</td>;
                                                        })}
                                                    </tr>
                                                ))}</tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <button className={btnGray} onClick={() => { setTab('attempts'); setSelectedAttempt(null); }}>{isAR ? '← رجوع للمحاولات' : '← Back to Attempts'}</button>
                        <span className="font-bold text-lg">{isAR ? 'المجموع:' : 'Total:'} {answers.reduce((s, a) => s + (a.awardedMarks || 0), 0)}/50</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminExams;
