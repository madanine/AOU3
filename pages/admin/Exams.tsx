import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { Exam, ExamQuestion, ExamOption, ExamAttempt, ExamAnswer, ExamException, ExamQuestionType, Course, Semester, User } from '../../types';
import { Plus, Trash2, Edit, Eye, CheckCircle, XCircle, Clock, Send, AlertTriangle, ChevronDown, ChevronUp, FileText, Users, Award, Loader2, Search, Copy, GripVertical, Download, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

// Convert any date string (ISO/UTC) to local YYYY-MM-DDTHH:MM for datetime-local input
const toLocalInput = (s?: string) => {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s.slice(0, 16);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Convert local datetime-local value to ISO string with timezone offset for correct storage
const toISOLocal = (s: string) => {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toISOString();
};

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
    const { lang, t, settings } = useApp();
    const isAR = lang === 'AR';
    const activeSemesterId = settings.activeSemesterId;

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
    const [manualScore, setManualScore] = useState<number | null>(null);
    const [savingManual, setSavingManual] = useState(false);

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
            setExams(ex);
            // FIX 1: Filter courses to active semester only — prevents ghost/orphan
            // courses from appearing in the dropdown (e.g. 'qw' from a different semester)
            setCourses(co.filter(c => !activeSemesterId || c.semesterId === activeSemesterId));
            setSemesters(se);
            setStudents(st.filter(s => s.role === 'student'));
        } catch (e: any) { setError(e.message); }
        setLoading(false);
    }, [activeSemesterId]);

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
            // FIX 2: Auto-populate semesterId from active semester so the user
            // doesn't have to pick it manually (prevents 'all fields required' false block)
            setExamForm({ totalMarks: 50, semesterId: activeSemesterId || '' });
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
    // FIX 3: Field-level validation — each field gets its own specific error message.
    // The original single 'allFieldsRequired' check made it impossible to know what was missing.
    const validateExamForm = (): boolean => {
        if (!examForm.title?.trim()) {
            setError(isAR ? 'يرجى إدخال عنوان الاختبار' : 'Exam title is required'); return false;
        }
        if (!examForm.courseId) {
            setError(isAR ? 'يرجى اختيار المادة' : 'Please select a course'); return false;
        }
        if (!examForm.semesterId) {
            setError(isAR ? 'يرجى اختيار الفصل الدراسي' : 'Please select a semester'); return false;
        }
        if (!examForm.startAt) {
            setError(isAR ? 'يرجى تحديد وقت البداية' : 'Start date/time is required'); return false;
        }
        if (!examForm.endAt) {
            setError(isAR ? 'يرجى تحديد وقت النهاية' : 'End date/time is required'); return false;
        }
        const start = new Date(examForm.startAt);
        const end = new Date(examForm.endAt);
        if (isNaN(start.getTime())) { setError(isAR ? 'وقت البداية غير صالح' : 'Invalid start date/time'); return false; }
        if (isNaN(end.getTime())) { setError(isAR ? 'وقت النهاية غير صالح' : 'Invalid end date/time'); return false; }
        if (end <= start) { setError(isAR ? 'يجب أن يكون وقت النهاية بعد وقت البداية' : 'End time must be after start time'); return false; }
        return true;
    };

    const saveExamBatch = async () => {
        if (!validateExamForm()) return;
        setSaving(true); setError('');
        try {
            const savedExam = await supabaseService.upsertExam({
                id: examForm.id || uid(), courseId: examForm.courseId, semesterId: examForm.semesterId,
                title: examForm.title, startAt: toISOLocal(examForm.startAt), endAt: toISOLocal(examForm.endAt),
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
        setManualScore(attempt.totalScore ?? null);
        try {
            const [a, q] = await Promise.all([supabaseService.getExamAnswers(attempt.id), supabaseService.getExamQuestions(attempt.examId)]);
            setAnswers(a); setGradingQ(q);
        } catch (e: any) { setError(e.message); }
    };

    const saveManualScore = async () => {
        if (!selectedAttempt || manualScore === null) return;
        setSavingManual(true);
        try {
            await supabaseService.updateAttemptScore(selectedAttempt.id, manualScore);
            setSelectedAttempt(prev => prev ? { ...prev, totalScore: manualScore } : prev);
            setAttempts(prev => prev.map(a => a.id === selectedAttempt.id ? { ...a, totalScore: manualScore } : a));
            flash(isAR ? 'تم حفظ الدرجة بنجاح' : 'Score saved successfully');
        } catch (e: any) { setError(e.message); }
        setSavingManual(false);
    };

    // Compute expected marks for auto-graded question types (previewed before release)
    const getEffectiveMarks = (ans: ExamAnswer | undefined, q: ExamQuestion): number => {
        if (!ans) return 0;
        if (q.type === 'mcq' || q.type === 'true_false') {
            const correct = q.options?.find(o => o.isCorrect);
            return correct && ans.selectedOptionId === correct.id ? q.marks : 0;
        }
        if (q.type === 'matrix') {
            if (q.matrixAnswers && ans.matrixSelections) {
                const rows = Object.keys(q.matrixAnswers);
                let totalCorrect = 0, totalCells = 0;
                rows.forEach(r => {
                    const correctSet = new Set(q.matrixAnswers![r] || []);
                    const selectedSet = new Set(ans.matrixSelections![r] || []);
                    totalCells += correctSet.size;
                    correctSet.forEach(c => { if (selectedSet.has(c)) totalCorrect++; });
                });
                return totalCells > 0 ? Math.round((totalCorrect / totalCells) * q.marks) : 0;
            }
            return 0;
        }
        return ans.awardedMarks || 0; // essay: use stored value
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
            await supabaseService.upsertExamException({ id: uid(), examId: selectedExamId, studentId: excStudentId, extendedUntil: toISOLocal(excUntil), createdAt: new Date().toISOString() });
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
    const card = "bg-card rounded-[2.5rem] shadow-sm border border-border p-6 md:p-8 xl:p-10";
    const btn = "px-6 py-3 rounded-2xl text-xs uppercase tracking-widest font-black transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95";
    const btnPrimary = `${btn} bg-gold-gradient text-white shadow-premium hover:shadow-premium-hover`;
    const btnDanger = `${btn} bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-transparent hover:border-red-500/20`;
    const btnGreen = `${btn} bg-success text-white hover:bg-emerald-600`;
    const btnGray = `${btn} bg-surface text-text-primary border border-border hover:border-primary/50 hover:bg-card`;
    const input = "w-full px-4 py-3 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold text-text-primary outline-none shadow-sm transition-all";
    const label = "block text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1 mb-1.5";

    const qTypeLabel: Record<ExamQuestionType, string> = {
        mcq: isAR ? 'اختياري' : 'MCQ',
        true_false: isAR ? 'صح/خطأ' : 'True/False',
        essay: isAR ? 'مقالي' : 'Essay',
        matrix: isAR ? 'مصفوفة' : 'Matrix'
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6" dir={isAR ? 'rtl' : 'ltr'} ref={containerRef}>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl flex items-center gap-2"><AlertTriangle size={18} />{error}<button onClick={() => setError('')} className="ml-auto font-bold">×</button></div>}
            {success && <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-2xl flex items-center gap-2"><CheckCircle size={18} />{success}</div>}

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
                                                <span className={`px-2 py-1 rounded-lg text-[10px] uppercase tracking-widest font-black ${exam.isPublished ? 'bg-success/10 text-success border border-success/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                    {exam.isPublished ? t.published : t.draft}
                                                </span>
                                                {exam.isResultsReleased && <span className="px-2 py-1 rounded-lg text-[10px] uppercase tracking-widest font-black bg-primary/10 text-primary border border-primary/20">{t.resultsReleased}</span>}
                                                <span className="text-[10px] uppercase tracking-widest font-black text-text-secondary flex items-center"><Clock size={12} className="mr-1" />{new Date(exam.startAt).toLocaleDateString()} - {new Date(exam.endAt).toLocaleDateString()}</span>
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
                            <div><label className={label}>{t.startsAt}</label><input type="datetime-local" className={input} value={toLocalInput(examForm.startAt)} onChange={e => { setExamForm(p => ({ ...p, startAt: e.target.value })); setDraftDirty(true); }} /></div>
                            <div><label className={label}>{t.endsAt}</label><input type="datetime-local" className={input} value={toLocalInput(examForm.endAt)} onChange={e => { setExamForm(p => ({ ...p, endAt: e.target.value })); setDraftDirty(true); }} /></div>
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
                                            <button onClick={() => duplicateQuestion(idx)} className="text-gray-400 hover:text-primary p-1.5 rounded-lg hover:bg-blue-50" title={t.duplicateQuestion}><Copy size={15} /></button>
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
                                                    {q.type === 'mcq' && <button className="text-primary text-sm font-bold flex items-center gap-1 mt-1" onClick={() => addOptionToQ(idx)}><Plus size={14} />{t.addOption}</button>}
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
                                                            <button className="text-primary text-sm font-bold flex items-center gap-1" onClick={() => updateQ(idx, { matrixRows: [...(q.matrixRows || []), ''] })}><Plus size={14} />{isAR ? 'إضافة صف' : 'Add Row'}</button>
                                                        </div>
                                                        <div>
                                                            <label className={label}>{isAR ? 'أعمدة' : 'Columns'}</label>
                                                            {q.options.map((opt, oi) => (
                                                                <div key={opt._uid} className="flex items-center gap-2 mb-2">
                                                                    <input className={`${input} flex-1`} value={opt.optionText} onChange={e => updateQOption(idx, oi, { optionText: e.target.value })} />
                                                                    <button onClick={() => removeOption(idx, oi)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                                                </div>
                                                            ))}
                                                            <button className="text-primary text-sm font-bold flex items-center gap-1" onClick={() => addOptionToQ(idx)}><Plus size={14} />{isAR ? 'إضافة عمود' : 'Add Column'}</button>
                                                        </div>
                                                    </div>
                                                    {/* Answer Key button */}
                                                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                                                        <button className="text-primary text-sm font-bold flex items-center gap-1.5 hover:underline" onClick={() => setAnswerKeyQIdx(idx)}>
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
                                                            <CheckCircle size={20} className="text-primary" />
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
                            <button key={type} className={`${btn} bg-white border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-primary hover:bg-blue-50`} onClick={() => addQuestion(type)}>
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
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-4 space-y-4">
                            <h3 className="font-black text-amber-600">{isAR ? 'تمديد وقت لطالب' : 'Grant Time Extension'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <select className={input} value={excStudentId} onChange={e => setExcStudentId(e.target.value)}><option value="">{t.selectStudent}</option>{students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select>
                                <input type="datetime-local" className={input} value={excUntil} onChange={e => setExcUntil(e.target.value)} />
                                <button className={btnPrimary} onClick={saveException}>{t.save}</button>
                            </div>
                            {exceptions.length > 0 && (
                                <div className="mt-2 space-y-2">{exceptions.map(ex => (
                                    <div key={ex.id} className="flex items-center justify-between border border-border bg-card rounded-xl px-4 py-3 text-sm font-bold shadow-sm">
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
                                    <tr key={a.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                                        <td className="py-3 px-4"><span className="font-black text-text-primary">{getStudentName(a.studentId)}</span><br /><span className="text-[10px] uppercase font-bold text-text-secondary">{getStudentUniId(a.studentId)}</span></td>
                                        <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-lg text-[10px] uppercase tracking-widest font-black ${a.isSubmitted ? 'bg-success/10 text-success border border-success/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>{a.isSubmitted ? (isAR ? 'مسلّم' : 'Submitted') : (isAR ? 'قيد التقدم' : 'In Progress')}</span></td>
                                        <td className="py-3 px-4 text-center font-black text-primary">{a.totalScore ?? '-'}/50</td>
                                        <td className="py-3 px-4 text-center text-xs font-bold text-text-secondary">{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '-'}</td>
                                        <td className="py-3 px-4"><button className={btnGray} onClick={() => openGrading(a)}><Eye size={14} />{isAR ? 'تصحيح' : 'Grade'}</button></td>
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
                                <div key={q.id} className="border border-border rounded-2xl p-6 bg-surface shadow-sm hover:border-primary/30 transition-colors">
                                    <div className="flex items-start gap-4 mb-4">
                                        <span className="bg-primary border border-primary/20 text-white rounded-xl w-8 h-8 flex items-center justify-center font-black shrink-0 shadow-sm">{i + 1}</span>
                                        <div className="flex-1">
                                            <p className="font-bold text-text-primary text-sm">{q.questionText}</p>
                                            <p className="text-[10px] uppercase font-black text-text-secondary mt-1">{q.marks} {t.marks} • {qTypeLabel[q.type]}</p>
                                        </div>
                                        {ans && (() => {
                                            const effective = getEffectiveMarks(ans, q);
                                            const isAuto = q.type === 'mcq' || q.type === 'true_false' || q.type === 'matrix';
                                            const correct = isAuto ? effective === q.marks : ans.isCorrect;
                                            return (
                                                <span className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-sm ${correct ? 'bg-success/10 text-success border border-success/20'
                                                        : (isAuto || ans.isCorrect === false) ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                            : 'bg-surface border-border text-text-secondary'
                                                    }`}>{isAuto ? effective : (ans.awardedMarks ?? '?')}/{q.marks}</span>
                                            );
                                        })()}
                                    </div>
                                    {(q.type === 'mcq' || q.type === 'true_false') && (
                                        <div className="ml-12 space-y-2">
                                            {q.options?.map(o => {
                                                const selected = ans?.selectedOptionId === o.id;
                                                return (<div key={o.id} className={`px-4 py-3 rounded-xl text-xs font-bold transition-all shadow-sm ${o.isCorrect ? 'bg-success/10 border border-success/30 text-text-primary' : selected ? 'bg-red-500/10 border border-red-500/30 text-text-primary' : 'bg-card border border-border text-text-secondary'}`}>
                                                    {selected && (o.isCorrect ? <CheckCircle size={16} className="inline mr-2 text-success" /> : <XCircle size={16} className="inline mr-2 text-red-500" />)}
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
                                                    return <td key={o.id} className={`border border-border p-3 text-center ${sel && correct ? 'bg-success/10 text-success' : sel ? 'bg-red-500/10 text-red-500' : correct ? 'bg-success/5 text-success/50' : ''}`}>{sel ? '☑' : correct ? '☐' : ''}</td>;
                                                })}</tr>))}</tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                        <button className={btnGray} onClick={() => { setTab('attempts'); setSelectedAttempt(null); }}>{isAR ? '← رجوع' : '← Back'}</button>
                        <span className="font-bold text-lg">{isAR ? 'المجموع:' : 'Total:'} {gradingQ.reduce((s, q) => s + getEffectiveMarks(answers.find(a => a.questionId === q.id), q), 0)}/{gradingQ.reduce((s, q) => s + q.marks, 0)}</span>
                    </div>

                    {/* ─── Manual Score Override ─── */}
                    <div className="mt-6 p-5 rounded-2xl border-2 border-primary/30 bg-primary/5">
                        <h3 className="text-sm font-black text-text-primary mb-1">
                            {isAR ? 'ضبط الدرجة يدوياً' : 'Manual Score Override'}
                        </h3>
                        <p className="text-xs text-text-secondary mb-3">
                            {isAR
                                ? 'يمكنك تغيير الدرجة النهائية يدوياً (مثلاً إضافة نقاط مكافأة). تلغي تلقائياً عند إصدار النتائج.'
                                : 'You can override the final score manually (e.g. add bonus points). Auto-grading runs again on result release.'}
                        </p>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min={0}
                                max={999}
                                value={manualScore ?? ''}
                                onChange={e => setManualScore(parseInt(e.target.value) || 0)}
                                className="w-28 px-3 py-2 border-2 border-primary/30 rounded-xl text-lg font-black text-center bg-surface text-text-primary focus:outline-none focus:border-primary transition-all"
                                placeholder="0"
                            />
                            <span className="text-sm font-bold text-text-secondary">/50</span>
                            <button
                                onClick={saveManualScore}
                                disabled={savingManual || manualScore === null}
                                className="px-5 py-2 bg-primary text-white font-black rounded-xl text-sm flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {savingManual ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isAR ? 'حفظ الدرجة' : 'Save Score'}
                            </button>
                        </div>
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
