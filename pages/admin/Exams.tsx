import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { Exam, ExamQuestion, ExamOption, ExamAttempt, ExamAnswer, ExamException, ExamQuestionType, Course, Semester, User } from '../../types';
import { Plus, Trash2, Edit, Eye, CheckCircle, XCircle, Clock, Send, AlertTriangle, ChevronDown, ChevronUp, FileText, Users, Award, Loader2, Search, Copy, GripVertical, Download, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

// ================ TYPES ================
interface DraftQuestion {
    _uid: string;
    type: ExamQuestionType;
    questionText: string;
    marks: number;
    orderIndex: number;
    matrixRows?: string[];
    matrixAnswers?: Record<string, string[]>;
    options: DraftOption[];
    existingId?: string; // for edits
}
interface DraftOption {
    _uid: string;
    optionText: string;
    isCorrect: boolean;
    orderIndex: number;
    existingId?: string;
}

const uid = () => crypto.randomUUID();

type Tab = 'list' | 'builder' | 'attempts' | 'grade' | 'search';

const AdminExams: React.FC = () => {
    const { lang, t } = useApp();
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
    const [searchTerm, setSearchTerm] = useState('');

    // Builder state (draft mode)
    const [examForm, setExamForm] = useState<Partial<Exam>>({});
    const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);
    const [draftDirty, setDraftDirty] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [answerKeyQIdx, setAnswerKeyQIdx] = useState<number | null>(null);

    // Attempts & Grading
    const [selectedExamId, setSelectedExamId] = useState('');
    const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
    const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
    const [answers, setAnswers] = useState<ExamAnswer[]>([]);
    const [gradingQ, setGradingQ] = useState<ExamQuestion[]>([]);
    const [exceptions, setExceptions] = useState<ExamException[]>([]);
    const [showExcForm, setShowExcForm] = useState(false);
    const [excStudentId, setExcStudentId] = useState('');
    const [excUntil, setExcUntil] = useState('');

    // Student search
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<{ student: User; exams: { exam: Exam; score: number | null; courseName: string }[] }[]>([]);

    // Drag
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [ex, co, se, st] = await Promise.all([
                supabaseService.getExams(), supabaseService.getCourses(),
                supabaseService.getSemesters(), supabaseService.getUsers()
            ]);
            setExams(ex); setCourses(co); setSemesters(se); setStudents(st.filter(s => s.role === 'student'));
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };
    const getCourseName = (id: string) => { const c = courses.find(x => x.id === id); return c ? (isAR ? c.title_ar : c.title) : id; };
    const getSemName = (id: string) => semesters.find(x => x.id === id)?.name || id;
    const getStudentName = (id: string) => students.find(x => x.id === id)?.fullName || id;
    const getStudentUniId = (id: string) => students.find(x => x.id === id)?.universityId || '';
    const getMajorLabel = (key: string) => (t as any).majorList?.[key] || key;

    // ================ BUILDER HELPERS ================
    const totalDraftMarks = draftQuestions.reduce((s, q) => s + q.marks, 0);

    const openBuilder = (exam?: Exam) => {
        if (exam) {
            setExamForm(exam);
            // Load existing questions
            (async () => {
                const qs = await supabaseService.getExamQuestions(exam.id);
                setDraftQuestions(qs.map((q, i) => ({
                    _uid: uid(), type: q.type, questionText: q.questionText,
                    marks: q.marks, orderIndex: i, existingId: q.id,
                    matrixRows: q.matrixRows, matrixAnswers: q.matrixAnswers,
                    options: (q.options || []).map((o, oi) => ({
                        _uid: uid(), optionText: o.optionText, isCorrect: o.isCorrect,
                        orderIndex: oi, existingId: o.id
                    }))
                })));
            })();
        } else {
            setExamForm({ totalMarks: 50 });
            setDraftQuestions([]);
        }
        setExpandedQ(null);
        setDraftDirty(false);
        setTab('builder');
    };

    const addQuestion = (type: ExamQuestionType) => {
        const opts: DraftOption[] = type === 'true_false'
            ? [{ _uid: uid(), optionText: isAR ? 'صح' : 'True', isCorrect: true, orderIndex: 0 },
            { _uid: uid(), optionText: isAR ? 'خطأ' : 'False', isCorrect: false, orderIndex: 1 }]
            : type === 'mcq'
                ? [{ _uid: uid(), optionText: '', isCorrect: true, orderIndex: 0 },
                { _uid: uid(), optionText: '', isCorrect: false, orderIndex: 1 }]
                : [];
        const q: DraftQuestion = {
            _uid: uid(), type, questionText: '', marks: 1,
            orderIndex: draftQuestions.length, options: opts,
            matrixRows: type === 'matrix' ? [''] : undefined
        };
        setDraftQuestions(prev => [...prev, q]);
        setExpandedQ(q._uid);
        setDraftDirty(true);
    };

    const duplicateQuestion = (idx: number) => {
        const src = draftQuestions[idx];
        const dup: DraftQuestion = {
            ...src, _uid: uid(), existingId: undefined, orderIndex: draftQuestions.length,
            options: src.options.map(o => ({ ...o, _uid: uid(), existingId: undefined })),
            matrixRows: src.matrixRows ? [...src.matrixRows] : undefined,
            matrixAnswers: src.matrixAnswers ? { ...src.matrixAnswers } : undefined
        };
        const newList = [...draftQuestions];
        newList.splice(idx + 1, 0, dup);
        setDraftQuestions(newList.map((q, i) => ({ ...q, orderIndex: i })));
        setExpandedQ(dup._uid);
        setDraftDirty(true);
    };

    const removeQuestion = (idx: number) => {
        setDraftQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, orderIndex: i })));
        setDraftDirty(true);
    };

    const updateQ = (idx: number, patch: Partial<DraftQuestion>) => {
        setDraftQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
        setDraftDirty(true);
    };

    const updateQOption = (qIdx: number, oIdx: number, patch: Partial<DraftOption>) => {
        setDraftQuestions(prev => prev.map((q, qi) => qi === qIdx ? {
            ...q, options: q.options.map((o, oi) => oi === oIdx ? { ...o, ...patch } : o)
        } : q));
        setDraftDirty(true);
    };

    const setCorrectOption = (qIdx: number, oIdx: number) => {
        setDraftQuestions(prev => prev.map((q, qi) => qi === qIdx ? {
            ...q, options: q.options.map((o, oi) => ({ ...o, isCorrect: oi === oIdx }))
        } : q));
        setDraftDirty(true);
    };

    const addOptionToQ = (qIdx: number) => {
        setDraftQuestions(prev => prev.map((q, qi) => qi === qIdx ? {
            ...q, options: [...q.options, { _uid: uid(), optionText: '', isCorrect: false, orderIndex: q.options.length }]
        } : q));
        setDraftDirty(true);
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        setDraftQuestions(prev => prev.map((q, qi) => qi === qIdx ? {
            ...q, options: q.options.filter((_, oi) => oi !== oIdx)
        } : q));
        setDraftDirty(true);
    };

    // Drag & reorder
    const handleDragStart = (idx: number) => setDragIdx(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === idx) return;
        const newList = [...draftQuestions];
        const [moved] = newList.splice(dragIdx, 1);
        newList.splice(idx, 0, moved);
        setDraftQuestions(newList.map((q, i) => ({ ...q, orderIndex: i })));
        setDragIdx(idx);
        setDraftDirty(true);
    };
    const handleDragEnd = () => setDragIdx(null);

    // ================ BATCH SAVE ================
    const saveExamBatch = async () => {
        if (!examForm.courseId || !examForm.semesterId || !examForm.title || !examForm.startAt || !examForm.endAt) {
            setError(t.allFieldsRequired); return;
        }
        setSaving(true); setError('');
        try {
            const savedExam = await supabaseService.upsertExam({
                id: examForm.id || uid(), courseId: examForm.courseId, semesterId: examForm.semesterId,
                title: examForm.title, startAt: examForm.startAt, endAt: examForm.endAt,
                totalMarks: examForm.totalMarks || 50, isPublished: examForm.isPublished || false,
                isResultsReleased: examForm.isResultsReleased || false,
                createdAt: examForm.createdAt || new Date().toISOString()
            } as Exam);

            // Delete old questions for this exam then re-insert all
            if (examForm.id) {
                const oldQs = await supabaseService.getExamQuestions(examForm.id);
                for (const oq of oldQs) {
                    await supabaseService.deleteExamOptionsByQuestion(oq.id);
                    await supabaseService.deleteExamQuestion(oq.id);
                }
            }

            // Insert all draft questions + options in batch
            for (const dq of draftQuestions) {
                const savedQ = await supabaseService.upsertExamQuestion({
                    id: uid(), examId: savedExam.id, type: dq.type,
                    questionText: dq.questionText, marks: dq.marks,
                    orderIndex: dq.orderIndex, matrixRows: dq.matrixRows,
                    matrixAnswers: dq.matrixAnswers, createdAt: new Date().toISOString()
                } as ExamQuestion);

                for (let i = 0; i < dq.options.length; i++) {
                    const opt = dq.options[i];
                    await supabaseService.upsertExamOption({
                        id: uid(), questionId: savedQ.id, optionText: opt.optionText,
                        isCorrect: opt.isCorrect, orderIndex: i
                    } as ExamOption);
                }
            }

            await loadData();
            setTab('list');
            setDraftDirty(false);
            flash(t.examSaved);
        } catch (e: any) { setError(e.message); }
        setSaving(false);
    };

    // ================ EXAM ACTIONS ================
    const deleteExam = async (id: string) => {
        if (!confirm(t.confirmDeleteExam)) return;
        try { await supabaseService.deleteExam(id); await loadData(); flash(isAR ? 'تم الحذف' : 'Deleted'); } catch (e: any) { setError(e.message); }
    };

    const togglePublish = async (exam: Exam) => {
        try { await supabaseService.publishExam(exam.id, !exam.isPublished); await loadData(); } catch (e: any) { setError(e.message); }
    };

    const releaseResults = async (examId: string) => {
        if (!confirm(t.confirmSubmitResults)) return;
        setSaving(true);
        try {
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
                            let totalCorrect = 0;
                            let totalCells = 0;
                            rows.forEach(r => {
                                const correctSet = new Set(q.matrixAnswers![r] || []);
                                const selectedSet = new Set(a.matrixSelections![r] || []);
                                totalCells += correctSet.size;
                                correctSet.forEach(c => { if (selectedSet.has(c)) totalCorrect++; });
                            });
                            const marks = totalCells > 0 ? Math.round((totalCorrect / totalCells) * q.marks) : 0;
                            await supabaseService.gradeExamAnswer(a.id, marks, totalCorrect === totalCells);
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

    // ================ ATTEMPTS & GRADING ================
    const openAttempts = async (examId: string) => {
        setSelectedExamId(examId); setTab('attempts');
        try {
            const [a, e] = await Promise.all([supabaseService.getExamAttempts(examId), supabaseService.getExamExceptions(examId)]);
            setAttempts(a); setExceptions(e);
        } catch (e: any) { setError(e.message); }
    };

    const openGrading = async (attempt: ExamAttempt) => {
        setSelectedAttempt(attempt); setTab('grade');
        try {
            const [a, q] = await Promise.all([supabaseService.getExamAnswers(attempt.id), supabaseService.getExamQuestions(attempt.examId)]);
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
            await supabaseService.upsertExamException({ id: uid(), examId: selectedExamId, studentId: excStudentId, extendedUntil: excUntil, createdAt: new Date().toISOString() });
            setExceptions(await supabaseService.getExamExceptions(selectedExamId));
            setShowExcForm(false); setExcStudentId(''); setExcUntil('');
        } catch (e: any) { setError(e.message); }
    };

    // ================ EXPORT GRADES ================
    const exportExamGrades = async (exam: Exam) => {
        try {
            const [atts, enrollments] = await Promise.all([
                supabaseService.getExamAttempts(exam.id),
                supabaseService.getEnrollments()
            ]);
            const courseStudents = enrollments
                .filter(e => e.courseId === exam.courseId && e.semesterId === exam.semesterId)
                .map(e => e.studentId);
            const uniqueIds = [...new Set(courseStudents)];

            const rows = uniqueIds.map(sid => {
                const st = students.find(s => s.id === sid);
                const att = atts.find(a => a.studentId === sid && a.isSubmitted);
                return {
                    [isAR ? 'الرقم الجامعي' : 'University ID']: st?.universityId || '',
                    [isAR ? 'اسم الطالب' : 'Student Name']: st?.fullName || '',
                    [isAR ? 'التخصص' : 'Major']: st?.major ? getMajorLabel(st.major) : '',
                    [isAR ? 'درجة الامتحان' : 'Exam Score']: att?.totalScore ?? 0,
                };
            });

            const ws = XLSX.utils.aoa_to_sheet([
                [isAR ? 'المادة' : 'Course', getCourseName(exam.courseId)],
                [isAR ? 'الامتحان' : 'Exam', exam.title],
                [isAR ? 'الفصل' : 'Semester', getSemName(exam.semesterId)],
                [],
            ]);
            XLSX.utils.sheet_add_json(ws, rows, { origin: 'A5', skipHeader: false });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, exam.title.slice(0, 30));
            XLSX.writeFile(wb, `${exam.title}_grades.xlsx`);
        } catch (e: any) { setError(e.message); }
    };

    const exportAllExams = async () => {
        try {
            const enrollments = await supabaseService.getEnrollments();
            const wb = XLSX.utils.book_new();
            for (const exam of exams) {
                const atts = await supabaseService.getExamAttempts(exam.id);
                const courseStudents = enrollments
                    .filter(e => e.courseId === exam.courseId && e.semesterId === exam.semesterId)
                    .map(e => e.studentId);
                const uniqueIds = [...new Set(courseStudents)];
                const rows = uniqueIds.map(sid => {
                    const st = students.find(s => s.id === sid);
                    const att = atts.find(a => a.studentId === sid && a.isSubmitted);
                    return {
                        [isAR ? 'الرقم الجامعي' : 'University ID']: st?.universityId || '',
                        [isAR ? 'اسم الطالب' : 'Student Name']: st?.fullName || '',
                        [isAR ? 'التخصص' : 'Major']: st?.major ? getMajorLabel(st.major) : '',
                        [isAR ? 'درجة الامتحان' : 'Exam Score']: att?.totalScore ?? 0,
                    };
                });
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, `${getCourseName(exam.courseId).slice(0, 15)}-${exam.title.slice(0, 15)}`);
            }
            XLSX.writeFile(wb, `all_exams_grades.xlsx`);
        } catch (e: any) { setError(e.message); }
    };

    // ================ STUDENT SEARCH ================
    const doStudentSearch = async () => {
        if (!studentSearchTerm.trim()) return;
        const term = studentSearchTerm.toLowerCase();
        const matched = students.filter(s =>
            s.fullName.toLowerCase().includes(term) ||
            (s.universityId || '').toLowerCase().includes(term)
        );
        const results: typeof searchResults = [];
        for (const st of matched.slice(0, 10)) {
            const studentExams: { exam: Exam; score: number | null; courseName: string }[] = [];
            for (const exam of exams) {
                const att = await supabaseService.getStudentAttempt(exam.id, st.id);
                if (att) {
                    studentExams.push({ exam, score: att.totalScore ?? null, courseName: getCourseName(exam.courseId) });
                }
            }
            results.push({ student: st, exams: studentExams });
        }
        setSearchResults(results);
    };

    // ================ FILTERED ================
    const filteredExams = exams.filter(e => {
        const term = searchTerm.toLowerCase();
        return e.title.toLowerCase().includes(term) || getCourseName(e.courseId).toLowerCase().includes(term);
    });

    // ================ STYLES ================
    const card = "bg-white rounded-2xl shadow-sm border border-gray-100 p-6";
    const btn = "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer";
    const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
    const btnDanger = `${btn} bg-red-50 text-red-600 hover:bg-red-100`;
    const btnGreen = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;
    const btnGray = `${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`;
    const input = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none";
    const label = "block text-sm font-bold text-gray-700 mb-1";

    const qTypeLabel: Record<ExamQuestionType, string> = {
        mcq: isAR ? 'اختياري' : 'MCQ',
        true_false: isAR ? 'صح/خطأ' : 'True/False',
        essay: isAR ? 'مقالي' : 'Essay',
        matrix: isAR ? 'مصفوفة' : 'Matrix'
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6" dir={isAR ? 'rtl' : 'ltr'} ref={containerRef}>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2"><AlertTriangle size={18} />{error}<button onClick={() => setError('')} className="ml-auto font-bold">×</button></div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2"><CheckCircle size={18} />{success}</div>}

            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>📝 {t.examManagement}</h1>
                <div className="flex gap-2 flex-wrap">
                    {tab === 'list' && <>
                        <button className={btnPrimary} onClick={() => openBuilder()}><Plus size={18} />{t.newExam}</button>
                        <button className={btnGray} onClick={() => { setTab('search'); setSearchResults([]); setStudentSearchTerm(''); }}><Search size={16} />{t.studentSearch}</button>
                        <button className={btnGray} onClick={exportAllExams}><Download size={16} />{t.exportAllExams}</button>
                    </>}
                    {tab !== 'list' && <button className={btnGray} onClick={() => { setTab('list'); setSelectedAttempt(null); setShowExcForm(false); }}>{isAR ? '← رجوع' : '← Back'}</button>}
                </div>
            </div>

            {/* ====== LIST TAB ====== */}
            {tab === 'list' && (
                <div className={card}>
                    <div className="mb-4 relative">
                        <Search className={`absolute top-3 ${isAR ? 'right-3' : 'left-3'} text-gray-400`} size={18} />
                        <input className={`${input} ${isAR ? 'pr-10' : 'pl-10'}`} placeholder={t.search} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    {filteredExams.length === 0 ? (
                        <p className="text-center text-gray-500 py-12">{t.noExams}</p>
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
                                                    {exam.isPublished ? t.published : t.draft}
                                                </span>
                                                {exam.isResultsReleased && <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{t.resultsReleased}</span>}
                                                <span className="text-xs text-gray-400"><Clock size={12} className="inline mr-1" />{new Date(exam.startAt).toLocaleDateString()} - {new Date(exam.endAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button className={btnGray} onClick={() => openBuilder(exam)}><Edit size={16} />{isAR ? 'تعديل' : 'Edit'}</button>
                                            <button className={btnGray} onClick={() => openAttempts(exam.id)}><Users size={16} />{isAR ? 'محاولات' : 'Attempts'}</button>
                                            <button className={btnGray} onClick={() => togglePublish(exam)}>{exam.isPublished ? <XCircle size={16} /> : <CheckCircle size={16} />}{exam.isPublished ? (isAR ? 'إلغاء النشر' : 'Unpublish') : (isAR ? 'نشر' : 'Publish')}</button>
                                            {!exam.isResultsReleased && <button className={btnGreen} onClick={() => releaseResults(exam.id)} disabled={saving}><Award size={16} />{isAR ? 'إصدار النتائج' : 'Release'}</button>}
                                            <button className={btnGray} onClick={() => exportExamGrades(exam)}><Download size={16} />{t.exportThisExam}</button>
                                            <button className={btnDanger} onClick={() => deleteExam(exam.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ====== BUILDER TAB (Google Forms Style) ====== */}
            {tab === 'builder' && (
                <div className="space-y-4">
                    {/* Draft indicator */}
                    {draftDirty && <div className="fixed top-4 right-4 z-50 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">✏️ {t.draftSaved}</div>}

                    {/* Exam details card */}
                    <div className={`${card} border-t-4 border-t-blue-600`}>
                        <input className="text-2xl font-black w-full border-0 border-b-2 border-transparent focus:border-blue-500 outline-none pb-2 mb-4 bg-transparent" placeholder={t.examTitle} value={examForm.title || ''} onChange={e => { setExamForm(p => ({ ...p, title: e.target.value })); setDraftDirty(true); }} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div><label className={label}>{t.selectCourse}</label><select className={input} value={examForm.courseId || ''} onChange={e => { setExamForm(p => ({ ...p, courseId: e.target.value })); setDraftDirty(true); }}><option value="">{t.selectCourse}</option>{courses.map(c => <option key={c.id} value={c.id}>{isAR ? c.title_ar : c.title}</option>)}</select></div>
                            <div><label className={label}>{t.selectSemester}</label><select className={input} value={examForm.semesterId || ''} onChange={e => { setExamForm(p => ({ ...p, semesterId: e.target.value })); setDraftDirty(true); }}><option value="">{t.selectSemester}</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                            <div><label className={label}>{t.totalMarks}</label><input type="number" className={input} value={examForm.totalMarks || 50} onChange={e => { setExamForm(p => ({ ...p, totalMarks: parseInt(e.target.value) || 50 })); setDraftDirty(true); }} /></div>
                            <div><label className={label}>{t.startsAt}</label><input type="datetime-local" className={input} value={examForm.startAt ? examForm.startAt.slice(0, 16) : ''} onChange={e => { setExamForm(p => ({ ...p, startAt: new Date(e.target.value).toISOString() })); setDraftDirty(true); }} /></div>
                            <div><label className={label}>{t.endsAt}</label><input type="datetime-local" className={input} value={examForm.endAt ? examForm.endAt.slice(0, 16) : ''} onChange={e => { setExamForm(p => ({ ...p, endAt: new Date(e.target.value).toISOString() })); setDraftDirty(true); }} /></div>
                        </div>
                    </div>

                    {/* Marks summary */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${totalDraftMarks === (examForm.totalMarks || 50) ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'} font-bold text-sm`}>
                        <span>{isAR ? 'مجموع الأسئلة:' : 'Questions total:'} {totalDraftMarks} / {examForm.totalMarks || 50}</span>
                        {totalDraftMarks !== (examForm.totalMarks || 50) && <span>⚠ {t.totalMustBe50}</span>}
                    </div>

                    {/* Questions list (expandable cards) */}
                    <div className="space-y-3">
                        {draftQuestions.map((q, idx) => {
                            const isExpanded = expandedQ === q._uid;
                            return (
                                <div key={q._uid} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd}
                                    className={`${card} transition-all duration-200 ${isExpanded ? 'ring-2 ring-blue-500 border-blue-200' : 'hover:shadow-md cursor-pointer'} ${dragIdx === idx ? 'opacity-50' : ''}`}
                                    onClick={() => !isExpanded && setExpandedQ(q._uid)}>

                                    {/* Collapsed view */}
                                    <div className="flex items-center gap-3">
                                        <GripVertical size={18} className="text-gray-300 cursor-grab shrink-0" />
                                        <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate">{q.questionText || (isAR ? 'سؤال بدون عنوان' : 'Untitled question')}</p>
                                            <p className="text-xs text-gray-400">{qTypeLabel[q.type]} • {q.marks} {t.marks}</p>
                                        </div>
                                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => duplicateQuestion(idx)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50" title={t.duplicateQuestion}><Copy size={15} /></button>
                                            <button onClick={() => removeQuestion(idx)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
                                            <button onClick={() => setExpandedQ(isExpanded ? null : q._uid)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded edit form */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4" onClick={e => e.stopPropagation()}>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <div className="md:col-span-3"><label className={label}>{t.questionText}</label><textarea className={input} rows={2} value={q.questionText} onChange={e => updateQ(idx, { questionText: e.target.value })} /></div>
                                                <div><label className={label}>{t.marks}</label><input type="number" className={input} value={q.marks} min={1} onChange={e => updateQ(idx, { marks: parseInt(e.target.value) || 1 })} /></div>
                                            </div>

                                            {/* Type selector */}
                                            <div className="flex gap-2 flex-wrap">
                                                {(['mcq', 'true_false', 'essay', 'matrix'] as ExamQuestionType[]).map(tp => (
                                                    <button key={tp} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${q.type === tp ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                        onClick={() => {
                                                            const newOpts: DraftOption[] = tp === 'true_false'
                                                                ? [{ _uid: uid(), optionText: isAR ? 'صح' : 'True', isCorrect: true, orderIndex: 0 }, { _uid: uid(), optionText: isAR ? 'خطأ' : 'False', isCorrect: false, orderIndex: 1 }]
                                                                : tp === 'mcq' ? [{ _uid: uid(), optionText: '', isCorrect: true, orderIndex: 0 }, { _uid: uid(), optionText: '', isCorrect: false, orderIndex: 1 }] : [];
                                                            updateQ(idx, { type: tp, options: newOpts, matrixRows: tp === 'matrix' ? [''] : undefined });
                                                        }}>
                                                        {qTypeLabel[tp]}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* MCQ / TF Options */}
                                            {(q.type === 'mcq' || q.type === 'true_false') && (
                                                <div className="space-y-2">
                                                    {q.options.map((opt, oi) => (
                                                        <div key={opt._uid} className="flex items-center gap-2">
                                                            <input type="radio" name={`correct-${q._uid}`} checked={opt.isCorrect} onChange={() => setCorrectOption(idx, oi)} className="accent-blue-600 w-4 h-4" />
                                                            <input className={`${input} flex-1`} value={opt.optionText} onChange={e => updateQOption(idx, oi, { optionText: e.target.value })} placeholder={`${isAR ? 'خيار' : 'Option'} ${oi + 1}`} />
                                                            {q.type === 'mcq' && q.options.length > 2 && <button onClick={() => removeOption(idx, oi)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>}
                                                        </div>
                                                    ))}
                                                    {q.type === 'mcq' && <button className="text-blue-600 text-sm font-bold flex items-center gap-1 mt-1" onClick={() => addOptionToQ(idx)}><Plus size={14} />{t.addOption}</button>}
                                                </div>
                                            )}

                                            {/* Matrix (Google Forms Tick Box Grid style) */}
                                            {q.type === 'matrix' && (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={label}>{isAR ? 'صفوف' : 'Rows'}</label>
                                                            {q.matrixRows?.map((row, ri) => (
                                                                <div key={ri} className="flex items-center gap-2 mb-2">
                                                                    <span className="text-xs text-gray-400 w-5">{ri + 1}.</span>
                                                                    <input className={`${input} flex-1`} value={row} onChange={e => { const newRows = [...(q.matrixRows || [])]; newRows[ri] = e.target.value; updateQ(idx, { matrixRows: newRows }); }} />
                                                                    <button onClick={() => updateQ(idx, { matrixRows: q.matrixRows?.filter((_, i) => i !== ri) })} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                                                </div>
                                                            ))}
                                                            <button className="text-blue-600 text-sm font-bold flex items-center gap-1" onClick={() => updateQ(idx, { matrixRows: [...(q.matrixRows || []), ''] })}><Plus size={14} />{isAR ? 'إضافة صف' : 'Add Row'}</button>
                                                        </div>
                                                        <div>
                                                            <label className={label}>{isAR ? 'أعمدة' : 'Columns'}</label>
                                                            {q.options.map((opt, oi) => (
                                                                <div key={opt._uid} className="flex items-center gap-2 mb-2">
                                                                    <input className={`${input} flex-1`} value={opt.optionText} onChange={e => updateQOption(idx, oi, { optionText: e.target.value })} />
                                                                    <button onClick={() => removeOption(idx, oi)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                                                </div>
                                                            ))}
                                                            <button className="text-blue-600 text-sm font-bold flex items-center gap-1" onClick={() => addOptionToQ(idx)}><Plus size={14} />{isAR ? 'إضافة عمود' : 'Add Column'}</button>
                                                        </div>
                                                    </div>
                                                    {/* Answer Key button */}
                                                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                                                        <button className="text-blue-600 text-sm font-bold flex items-center gap-1.5 hover:underline" onClick={() => setAnswerKeyQIdx(idx)}>
                                                            <CheckCircle size={16} />{isAR ? 'مفتاح الإجابة' : 'Answer Key'}
                                                        </button>
                                                        <span className="text-xs text-gray-400">({q.marks} {t.marks})</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Answer Key Modal for Matrix */}
                                            {q.type === 'matrix' && answerKeyQIdx === idx && (
                                                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAnswerKeyQIdx(null)}>
                                                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <CheckCircle size={20} className="text-blue-600" />
                                                            <h3 className="text-lg font-bold">{isAR ? 'اختر الإجابات الصحيحة:' : 'Choose correct answers:'}</h3>
                                                        </div>
                                                        <table className="w-full text-sm border-collapse">
                                                            <thead>
                                                                <tr>
                                                                    <th className="border p-3 bg-gray-50 text-left">{isAR ? 'السؤال' : 'Question'}</th>
                                                                    {q.options.map(opt => <th key={opt._uid} className="border p-3 bg-gray-50 text-center min-w-[80px]">{opt.optionText}</th>)}
                                                                    <th className="border p-3 bg-gray-50 text-center min-w-[70px]">{isAR ? 'النقاط' : 'Points'}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {q.matrixRows?.map((row, ri) => {
                                                                    const rowAnswers = q.matrixAnswers?.[ri.toString()] || [];
                                                                    return (
                                                                        <tr key={ri} className="hover:bg-blue-50/30">
                                                                            <td className="border p-3 font-medium">{row}</td>
                                                                            {q.options.map(opt => {
                                                                                const isChecked = rowAnswers.includes(opt._uid);
                                                                                return (
                                                                                    <td key={opt._uid} className="border p-3 text-center">
                                                                                        <input type="checkbox" checked={isChecked}
                                                                                            className="w-5 h-5 accent-blue-600 cursor-pointer"
                                                                                            onChange={() => {
                                                                                                const newAnswers = { ...(q.matrixAnswers || {}) };
                                                                                                const current = newAnswers[ri.toString()] || [];
                                                                                                newAnswers[ri.toString()] = isChecked
                                                                                                    ? current.filter(id => id !== opt._uid)
                                                                                                    : [...current, opt._uid];
                                                                                                updateQ(idx, { matrixAnswers: newAnswers });
                                                                                            }} />
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                            <td className="border p-3 text-center">
                                                                                <span className="text-sm font-bold text-gray-600">{rowAnswers.length > 0 ? '✓' : '0'}</span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                        <div className="flex justify-end mt-4">
                                                            <button className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700" onClick={() => setAnswerKeyQIdx(null)}>{isAR ? 'تم' : 'Done'}</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {q.type === 'essay' && <p className="text-sm text-gray-400 italic">{isAR ? 'سؤال مقالي — يحتاج تصحيح يدوي' : 'Essay question — requires manual grading'}</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Add question buttons */}
                    <div className="flex flex-wrap gap-2 justify-center py-4">
                        {(['mcq', 'true_false', 'essay', 'matrix'] as ExamQuestionType[]).map(type => (
                            <button key={type} className={`${btn} bg-white border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50`} onClick={() => addQuestion(type)}>
                                <Plus size={16} />{qTypeLabel[type]}
                            </button>
                        ))}
                    </div>

                    {/* Save bar */}
                    <div className="sticky bottom-4 z-40">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
                            <span className="text-sm text-gray-500">{draftQuestions.length} {isAR ? 'سؤال' : 'questions'} • {totalDraftMarks}/{examForm.totalMarks || 50} {t.marks}</span>
                            <div className="flex gap-2">
                                <button className={btnGray} onClick={() => { setTab('list'); setDraftDirty(false); }}>{t.cancel}</button>
                                <button className={`${btnPrimary} px-8`} onClick={saveExamBatch} disabled={saving}>
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {t.saveExam}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== ATTEMPTS TAB ====== */}
            {tab === 'attempts' && (
                <div className={card}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">{isAR ? 'محاولات الطلاب' : 'Student Attempts'}</h2>
                        <div className="flex gap-2">
                            <button className={btnGray} onClick={() => { const exam = exams.find(e => e.id === selectedExamId); if (exam) exportExamGrades(exam); }}><Download size={16} />{t.exportGrades}</button>
                            <button className={btnGray} onClick={() => setShowExcForm(!showExcForm)}><Clock size={16} />{isAR ? 'تمديد وقت' : 'Time Extension'}</button>
                        </div>
                    </div>

                    {showExcForm && (
                        <div className="bg-yellow-50 rounded-xl p-4 mb-4 space-y-3">
                            <h3 className="font-bold">{isAR ? 'تمديد وقت لطالب' : 'Grant Time Extension'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <select className={input} value={excStudentId} onChange={e => setExcStudentId(e.target.value)}><option value="">{t.selectStudent}</option>{students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select>
                                <input type="datetime-local" className={input} value={excUntil} onChange={e => setExcUntil(e.target.value)} />
                                <button className={btnPrimary} onClick={saveException}>{t.save}</button>
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
                                <thead><tr className="border-b"><th className="py-2 px-3 text-left">{isAR ? 'الطالب' : 'Student'}</th><th className="py-2 px-3">{isAR ? 'الحالة' : 'Status'}</th><th className="py-2 px-3">{t.score}</th><th className="py-2 px-3">{isAR ? 'التاريخ' : 'Date'}</th><th className="py-2 px-3"></th></tr></thead>
                                <tbody>{attempts.map(a => (
                                    <tr key={a.id} className="border-b hover:bg-gray-50">
                                        <td className="py-2 px-3"><span className="font-bold">{getStudentName(a.studentId)}</span><br /><span className="text-xs text-gray-400">{getStudentUniId(a.studentId)}</span></td>
                                        <td className="py-2 px-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${a.isSubmitted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.isSubmitted ? (isAR ? 'مسلّم' : 'Submitted') : (isAR ? 'قيد التقدم' : 'In Progress')}</span></td>
                                        <td className="py-2 px-3 text-center font-bold">{a.totalScore ?? '-'}/50</td>
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
                                            <p className="text-xs text-gray-500">{q.marks} {t.marks} • {qTypeLabel[q.type]}</p>
                                        </div>
                                        {ans && <span className={`px-2 py-1 rounded-full text-xs font-bold ${ans.isCorrect ? 'bg-green-100 text-green-700' : ans.isCorrect === false ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{ans.awardedMarks ?? '?'}/{q.marks}</span>}
                                    </div>
                                    {(q.type === 'mcq' || q.type === 'true_false') && (
                                        <div className="ml-10 space-y-1">
                                            {q.options?.map(o => {
                                                const selected = ans?.selectedOptionId === o.id;
                                                return (<div key={o.id} className={`px-3 py-2 rounded-lg text-sm ${o.isCorrect ? 'bg-green-50 border border-green-300' : selected ? 'bg-red-50 border border-red-300' : 'bg-gray-50'}`}>
                                                    {selected && (o.isCorrect ? <CheckCircle size={14} className="inline mr-1 text-green-600" /> : <XCircle size={14} className="inline mr-1 text-red-600" />)}
                                                    {o.optionText}
                                                </div>);
                                            })}
                                        </div>
                                    )}
                                    {q.type === 'essay' && (
                                        <div className="ml-10 space-y-2">
                                            <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap">{ans?.essayAnswer || (isAR ? 'لا توجد إجابة' : 'No answer')}</div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-bold">{t.score}:</label>
                                                <input type="number" className="w-20 px-2 py-1 border rounded-lg text-sm" min={0} max={q.marks} value={ans?.awardedMarks ?? ''} onChange={e => { if (ans) gradeEssay(ans.id, parseInt(e.target.value) || 0, q.marks); }} />
                                                <span className="text-sm text-gray-500">/ {q.marks}</span>
                                            </div>
                                        </div>
                                    )}
                                    {q.type === 'matrix' && ans?.matrixSelections && (
                                        <div className="ml-10 overflow-x-auto">
                                            <table className="text-sm border"><thead><tr><th className="border p-2"></th>{q.options?.map(o => <th key={o.id} className="border p-2 text-center">{o.optionText}</th>)}</tr></thead>
                                                <tbody>{q.matrixRows?.map((row, ri) => (<tr key={ri}><td className="border p-2 font-bold">{row}</td>{q.options?.map(o => {
                                                    const selectedArr = ans.matrixSelections![ri.toString()] || [];
                                                    const correctArr = q.matrixAnswers?.[ri.toString()] || [];
                                                    const sel = selectedArr.includes(o.id);
                                                    const correct = correctArr.includes(o.id);
                                                    return <td key={o.id} className={`border p-2 text-center ${sel && correct ? 'bg-green-100' : sel ? 'bg-red-100' : correct ? 'bg-green-50' : ''}`}>{sel ? '☑' : correct ? '☐' : ''}</td>;
                                                })}</tr>))}</tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <button className={btnGray} onClick={() => { setTab('attempts'); setSelectedAttempt(null); }}>{isAR ? '← رجوع' : '← Back'}</button>
                        <span className="font-bold text-lg">{isAR ? 'المجموع:' : 'Total:'} {answers.reduce((s, a) => s + (a.awardedMarks || 0), 0)}/50</span>
                    </div>
                </div>
            )}

            {/* ====== STUDENT SEARCH TAB ====== */}
            {tab === 'search' && (
                <div className={card}>
                    <h2 className="text-xl font-bold mb-4">{t.studentSearch}</h2>
                    <div className="flex gap-3 mb-6">
                        <input className={`${input} flex-1`} placeholder={isAR ? 'ابحث بالاسم أو الرقم الجامعي...' : 'Search by name or university ID...'} value={studentSearchTerm} onChange={e => setStudentSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && doStudentSearch()} />
                        <button className={btnPrimary} onClick={doStudentSearch}><Search size={16} />{t.search}</button>
                    </div>
                    {searchResults.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">{isAR ? 'ابحث عن طالب لعرض أداءه' : 'Search for a student to view performance'}</p>
                    ) : (
                        <div className="space-y-4">
                            {searchResults.map(r => (
                                <div key={r.student.id} className="border rounded-xl p-4">
                                    <div className="flex flex-wrap gap-4 mb-3">
                                        <div><span className="text-xs text-gray-500">{isAR ? 'الاسم' : 'Name'}</span><p className="font-bold">{r.student.fullName}</p></div>
                                        <div><span className="text-xs text-gray-500">{isAR ? 'الرقم الجامعي' : 'ID'}</span><p className="font-bold">{r.student.universityId}</p></div>
                                        <div><span className="text-xs text-gray-500">{isAR ? 'التخصص' : 'Major'}</span><p className="font-bold">{r.student.major}</p></div>
                                    </div>
                                    {r.exams.length === 0 ? (
                                        <p className="text-sm text-gray-400">{isAR ? 'لم يؤدِ أي امتحان' : 'No exams taken'}</p>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead><tr className="border-b"><th className="py-1.5 px-2 text-left">{t.exams}</th><th className="py-1.5 px-2">{isAR ? 'المادة' : 'Course'}</th><th className="py-1.5 px-2">{t.score}</th></tr></thead>
                                            <tbody>{r.exams.map((ex, i) => (
                                                <tr key={i} className="border-b"><td className="py-1.5 px-2">{ex.exam.title}</td><td className="py-1.5 px-2 text-center">{ex.courseName}</td>
                                                    <td className="py-1.5 px-2 text-center font-bold">{ex.score ?? 0}/50</td></tr>
                                            ))}</tbody>
                                        </table>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminExams;
