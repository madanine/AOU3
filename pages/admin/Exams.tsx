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

// Helper: unified grading logic for objective questions (Bug 03)
const computeAnswerMarks = (ans: ExamAnswer, q: ExamQuestion): number => {
    if (q.type === 'mcq' || q.type === 'true_false') {
        const correct = q.options?.find(o => o.isCorrect);
        return correct && ans.selectedOptionId === correct.id ? q.marks : 0;
    }
    if (q.type === 'matrix') {
        if (!q.matrixAnswers || !ans.matrixSelections) return 0;
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
    return ans.awardedMarks || 0; // essay
};

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

    // Modal states
    const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [previewExam, setPreviewExam] = useState<Exam | null>(null);
    const [previewQuestions, setPreviewQuestions] = useState<ExamQuestion[]>([]);
    const [enrolledStudents, setEnrolledStudents] = useState<User[]>([]);

    // Builder state (draft mode)
    const [examForm, setExamForm] = useState<Partial<Exam>>({});
    const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);
    const [draftDirty, setDraftDirty] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [answerKeyUID, setAnswerKeyUID] = useState<string | null>(null);

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
    const [bonusMarks, setBonusMarks] = useState<number>(0);
    const [autoComputedScore, setAutoComputedScore] = useState<number | null>(null);
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

    // Prevent accidental navigation when there are unsaved changes
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (draftDirty) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [draftDirty]);

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
                        _uid: o.id, optionText: o.optionText, isCorrect: o.isCorrect,
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

        for (let i = 0; i < draftQuestions.length; i++) {
            const q = draftQuestions[i];
            const num = i + 1;
            if (!q.questionText.trim()) {
                setError(isAR ? `السؤال ${num}: النص مطلوب` : `Q${num}: Question text is required`);
                return false;
            }
            if (q.type === 'mcq' && q.options.some(o => !o.optionText.trim())) {
                setError(isAR ? `السؤال ${num}: جميع الخيارات مطلوبة` : `Q${num}: All options are required`);
                return false;
            }
            if (q.type === 'matrix') {
                const hasKey = Object.values(q.matrixAnswers || {}).some(a => (a as string[]).length > 0);
                if (!hasKey) {
                    setError(isAR ? `السؤال ${num}: يجب تحديد مفتاح الإجابة` : `Q${num}: Answer key is required`);
                    return false;
                }
            }
        }
        return true;
    };

    const saveExamBatch = async () => {
        if (!validateExamForm()) return;

        // Bug 06: Prevent saving matrix edits if there are in-progress attempts for this exam
        if (examForm.id) {
            const activeAttempts = await supabaseService.getExamAttempts(examForm.id);
            const inProgress = activeAttempts.filter(a => !a.isSubmitted);
            if (inProgress.length > 0) {
                setError(isAR ? `يوجد ${inProgress.length} طالب يؤدي الامتحان الآن. لا يمكن التعديل.` : `${inProgress.length} student(s) are currently taking this exam. Cannot edit.`);
                return;
            }
        }

        setSaving(true); setError('');
        try {
            const savedExam = await supabaseService.upsertExam({
                id: examForm.id || uid(), courseId: examForm.courseId, semesterId: examForm.semesterId,
                title: examForm.title, startAt: toISOLocal(examForm.startAt), endAt: toISOLocal(examForm.endAt),
                totalMarks: examForm.totalMarks || 50, isPublished: examForm.isPublished || false,
                isResultsReleased: examForm.isResultsReleased || false,
                createdAt: examForm.createdAt || new Date().toISOString()
            } as Exam);

            // Perf 12: Delete old questions for this exam in parallel then re-insert all
            if (examForm.id) {
                const oldQs = await supabaseService.getExamQuestions(examForm.id);
                await Promise.all(oldQs.map(async oq => {
                    await supabaseService.deleteExamOptionsByQuestion(oq.id);
                    await supabaseService.deleteExamQuestion(oq.id);
                }));
            }

            // Insert all draft questions + options in batch
            for (const dq of draftQuestions) {
                // FIX: Pre-generate real DB IDs for options so we can remap matrixAnswers
                // before saving the question. Previously, matrixAnswers stored draft _uids
                // which never matched the real DB option IDs at grading time.
                const optionIdMap: Record<string, string> = {};
                const realOptions = dq.options.map((opt, i) => {
                    const realId = uid();
                    optionIdMap[opt._uid] = realId;
                    return { realId, opt, i };
                });

                // Remap matrixAnswers from draft _uids → real DB option IDs
                const fixedMatrixAnswers: Record<string, string[]> | undefined =
                    dq.type === 'matrix' && dq.matrixAnswers
                        ? Object.fromEntries(
                            Object.entries(dq.matrixAnswers).map(([rowIdx, draftUids]) => [
                                rowIdx,
                                (draftUids as string[]).map(u => optionIdMap[u] ?? u)
                            ])
                        )
                        : dq.matrixAnswers;

                // Save the question with corrected matrixAnswers
                const savedQ = await supabaseService.upsertExamQuestion({
                    id: uid(), examId: savedExam.id, type: dq.type,
                    questionText: dq.questionText, marks: dq.marks,
                    orderIndex: dq.orderIndex, matrixRows: dq.matrixRows,
                    matrixAnswers: fixedMatrixAnswers, createdAt: new Date().toISOString()
                } as ExamQuestion);

                // Save options using the pre-generated real IDs
                for (const { realId, opt, i } of realOptions) {
                    await supabaseService.upsertExamOption({
                        id: realId, questionId: savedQ.id, optionText: opt.optionText,
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
        setConfirmModal({
            message: t.confirmDeleteExam,
            onConfirm: async () => {
                try { await supabaseService.deleteExam(id); await loadData(); flash(isAR ? 'تم الحذف' : 'Deleted'); } catch (e: any) { setError(e.message); }
            }
        });
    };

    const togglePublish = async (exam: Exam) => {
        try { await supabaseService.publishExam(exam.id, !exam.isPublished); await loadData(); } catch (e: any) { setError(e.message); }
    };

    const releaseResults = async (examId: string) => {
        setConfirmModal({
            message: t.confirmSubmitResults,
            onConfirm: async () => {
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
                            const marks = computeAnswerMarks(a, q);
                            const isCorrect = q.type === 'essay' ? a.isCorrect : marks === q.marks && q.marks > 0;
                            await supabaseService.gradeExamAnswer(a.id, marks, !!isCorrect);
                            total += marks;
                        }
                        await supabaseService.updateAttemptScore(att.id, total);
                    }
                    await supabaseService.releaseExamResults(examId);
                    await loadData();
                    flash(isAR ? 'تم إصدار النتائج' : 'Results released');
                } catch (e: any) { setError(e.message); }
                setSaving(false);
            }
        });
    };

    // ================ ATTEMPTS & GRADING ================
    const openAttempts = async (examId: string) => {
        setSelectedExamId(examId); setTab('attempts');
        try {
            const [a, e] = await Promise.all([supabaseService.getExamAttempts(examId), supabaseService.getExamExceptions(examId)]);
            setAttempts(a); setExceptions(e);
            // UX 09: filter enrolled students
            const exam = exams.find(ex => ex.id === examId);
            const enrollments = await supabaseService.getEnrollments();
            const enrolledIds = enrollments
                .filter(en => en.courseId === exam?.courseId && en.semesterId === exam?.semesterId)
                .map(en => en.studentId);
            setEnrolledStudents(students.filter(s => enrolledIds.includes(s.id)));
        } catch (e: any) { setError(e.message); }
    };

    const openGrading = async (attempt: ExamAttempt) => {
        setSelectedAttempt(attempt); setTab('grade');
        setBonusMarks(0);
        setAutoComputedScore(null);
        try {
            const [a, q] = await Promise.all([supabaseService.getExamAnswers(attempt.id), supabaseService.getExamQuestions(attempt.examId)]);
            setAnswers(a); setGradingQ(q);
        } catch (e: any) { setError(e.message); }
    };

    const saveManualScore = async () => {
        if (!selectedAttempt) return;
        setSavingManual(true);
        try {
            // Compute auto-grade total from objective questions
            const autoTotal = gradingQ.reduce((sum, q) => {
                const ans = answers.find(a => a.questionId === q.id);
                return sum + getEffectiveMarks(ans, q);
            }, 0);
            // Add bonus marks on top of auto-graded score
            const finalScore = autoTotal + bonusMarks;
            setAutoComputedScore(autoTotal);
            await supabaseService.updateAttemptScore(selectedAttempt.id, finalScore);
            setSelectedAttempt(prev => prev ? { ...prev, totalScore: finalScore } : prev);
            setAttempts(prev => prev.map(a => a.id === selectedAttempt.id ? { ...a, totalScore: finalScore } : a));
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

    // ================ AUTO-GRADE ALL (Preview, before release) ================
    // Runs the same grading logic as releaseResults but:
    //   - Does NOT set isResultsReleased on the exam (students can't see yet)
    //   - Saves totalScore per attempt to Supabase so admins can review
    const [gradingAll, setGradingAll] = useState(false);
    const autoGradeAll = async () => {
        if (!selectedExamId) return;
        setConfirmModal({
            message: isAR
                ? 'سيتم احتساب الدرجات تلقائياً لجميع المحاولات المسلّمة وحفظها. هل تريد المتابعة؟'
                : 'Auto-grade will compute and save scores for all submitted attempts. Continue?',
            onConfirm: async () => {
                setGradingAll(true);
                try {
                    const qs = await supabaseService.getExamQuestions(selectedExamId);
                    const atts = await supabaseService.getExamAttempts(selectedExamId);
                    const submitted = atts.filter(a => a.isSubmitted);
                    for (const att of submitted) {
                        const ans = await supabaseService.getExamAnswers(att.id);
                        let total = 0;
                        for (const a of ans) {
                            const q = qs.find(x => x.id === a.questionId);
                            if (!q) continue;
                            const marks = computeAnswerMarks(a, q);
                            // Keep consistent with old autoGradeAll: isCorrect bool flag 
                            const isCorrect = q.type === 'essay' ? a.isCorrect : marks === q.marks && q.marks > 0;
                            await supabaseService.gradeExamAnswer(a.id, marks, !!isCorrect);
                            total += marks;
                        }
                        await supabaseService.updateAttemptScore(att.id, total);
                    }
                    // Reload attempts list so scores are reflected immediately in the table
                    const refreshed = await supabaseService.getExamAttempts(selectedExamId);
                    setAttempts(refreshed);
                    flash(isAR
                        ? `تم احتساب درجات ${submitted.length} محاولة بنجاح`
                        : `Auto-graded ${submitted.length} attempt(s) successfully`);
                } catch (e: any) { setError(e.message); }
                setGradingAll(false);
            }
        });
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
                    [isAR ? 'الجنسية' : 'Nationality']: st?.nationality || '',
                    [isAR ? 'رقم الجواز' : 'Passport Number']: st?.passportNumber || '',
                    [isAR ? 'رقم الجوال' : 'Phone']: st?.phone || '',
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
            // Perf 10: Parallel requests
            const [enrollments, allAttempts] = await Promise.all([
                supabaseService.getEnrollments(),
                Promise.all(exams.map(e => supabaseService.getExamAttempts(e.id)))
            ]);

            const wb = XLSX.utils.book_new();
            exams.forEach((exam, index) => {
                const atts = allAttempts[index] || [];
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
                        [isAR ? 'الجنسية' : 'Nationality']: st?.nationality || '',
                        [isAR ? 'رقم الجواز' : 'Passport Number']: st?.passportNumber || '',
                        [isAR ? 'رقم الجوال' : 'Phone']: st?.phone || '',
                        [isAR ? 'درجة الامتحان' : 'Exam Score']: att?.totalScore ?? 0,
                    };
                });
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, `${getCourseName(exam.courseId).slice(0, 15)}-${exam.title.slice(0, 15)}`);
            });
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
        ).slice(0, 10);

        // Perf 11: Parallel bulk fetch
        const allStudentAttempts = await Promise.all(
            matched.map(s => supabaseService.getAttemptsByStudent(s.id))
        );

        const results: typeof searchResults = [];
        matched.forEach((st, idx) => {
            const stAttempts = allStudentAttempts[idx] || [];
            const studentExams: { exam: Exam; score: number | null; courseName: string }[] = [];

            // Only examine exams the student actually has an attempt for
            stAttempts.forEach(att => {
                const exam = exams.find(e => e.id === att.examId);
                if (exam) {
                    studentExams.push({ exam, score: att.totalScore ?? null, courseName: getCourseName(exam.courseId) });
                }
            });
            results.push({ student: st, exams: studentExams });
        });
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
                                            <button className={btnGray} onClick={async () => {
                                                const qs = await supabaseService.getExamQuestions(exam.id);
                                                setPreviewQuestions(qs);
                                                setPreviewExam(exam);
                                            }}><Eye size={16} />{isAR ? 'معاينة' : 'Preview'}</button>
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
                                                        <button className="text-primary text-sm font-bold flex items-center gap-1.5 hover:underline" onClick={() => setAnswerKeyUID(q._uid)}>
                                                            <CheckCircle size={16} />{isAR ? 'مفتاح الإجابة' : 'Answer Key'}
                                                        </button>
                                                        <span className="text-xs text-gray-400">({q.marks} {t.marks})</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Answer Key Modal for Matrix */}
                                            {q.type === 'matrix' && answerKeyUID === q._uid && (
                                                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAnswerKeyUID(null)}>
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
                                                            <button className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700" onClick={() => setAnswerKeyUID(null)}>{isAR ? 'تم' : 'Done'}</button>
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
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h2 className="text-xl font-bold">{isAR ? 'محاولات الطلاب' : 'Student Attempts'}</h2>
                        <div className="flex gap-2 flex-wrap">
                            {/* Auto-Grade: computes scores for all submitted attempts & saves to Supabase */}
                            {/* Does NOT release results to students — admin reviews first */}
                            <button
                                className={`${btnGreen} disabled:opacity-50`}
                                onClick={autoGradeAll}
                                disabled={gradingAll || attempts.filter(a => a.isSubmitted).length === 0}
                                title={isAR ? 'احتساب الدرجات تلقائياً لجميع المحاولات المسلّمة (دون إصدار النتائج)' : 'Compute scores for all submitted attempts without releasing results to students'}
                            >
                                {gradingAll ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                                {isAR ? 'تصحيح تلقائي' : 'Auto-Grade All'}
                            </button>
                            <button className={btnGray} onClick={() => { const exam = exams.find(e => e.id === selectedExamId); if (exam) exportExamGrades(exam); }}><Download size={16} />{t.exportGrades}</button>
                            <button className={btnGray} onClick={() => setShowExcForm(!showExcForm)}><Clock size={16} />{isAR ? 'تمديد وقت' : 'Time Extension'}</button>
                        </div>
                    </div>

                    {showExcForm && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-4 space-y-4">
                            <h3 className="font-black text-amber-600">{isAR ? 'تمديد وقت لطالب' : 'Grant Time Extension'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <select className={input} value={excStudentId} onChange={e => setExcStudentId(e.target.value)}><option value="">{t.selectStudent}</option>{enrolledStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select>
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
                    ) : (() => {
                        const submitted = attempts.filter(a => a.isSubmitted);
                        const scores = submitted.map(a => a.totalScore ?? 0).filter(s => s > 0);
                        const avg = scores.length ? (scores.reduce((sum, val) => sum + val, 0) / scores.length).toFixed(1) : '-';
                        const max = scores.length ? Math.max(...scores) : '-';
                        const min = scores.length ? Math.min(...scores) : '-';
                        const currentExam = exams.find(e => e.id === selectedExamId);
                        const maxM = currentExam?.totalMarks ?? 50;
                        return (
                            <div className="space-y-4">
                                {/* Improvement 13: Summary Stats */}
                                <div className="grid grid-cols-4 gap-3 mb-2">
                                    <div className="bg-surface rounded-xl p-3 text-center border border-border">
                                        <p className="text-2xl font-black text-primary">{submitted.length}/{attempts.length}</p>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-text-secondary">{isAR ? 'المسلّمين' : 'Submitted'}</p>
                                    </div>
                                    <div className="bg-surface rounded-xl p-3 text-center border border-border">
                                        <p className="text-2xl font-black">{avg}</p>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-text-secondary">{isAR ? 'المتوسط' : 'Avg Score'}</p>
                                    </div>
                                    <div className="bg-success/10 rounded-xl p-3 text-center border border-success/20">
                                        <p className="text-2xl font-black text-success">{max}</p>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-success/70">{isAR ? 'أعلى درجة' : 'Highest'}</p>
                                    </div>
                                    <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
                                        <p className="text-2xl font-black text-red-500">{min}</p>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-red-500/70">{isAR ? 'أقل درجة' : 'Lowest'}</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b"><th className="py-2 px-3 text-left">{isAR ? 'الطالب' : 'Student'}</th><th className="py-2 px-3">{isAR ? 'الحالة' : 'Status'}</th><th className="py-2 px-3">{t.score}</th><th className="py-2 px-3">{isAR ? 'التاريخ' : 'Date'}</th><th className="py-2 px-3"></th></tr></thead>
                                        <tbody>{attempts.map(a => (
                                            <tr key={a.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                                                <td className="py-3 px-4"><span className="font-black text-text-primary">{getStudentName(a.studentId)}</span><br /><span className="text-[10px] uppercase font-bold text-text-secondary">{getStudentUniId(a.studentId)}</span></td>
                                                <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-lg text-[10px] uppercase tracking-widest font-black ${a.isSubmitted ? 'bg-success/10 text-success border border-success/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>{a.isSubmitted ? (isAR ? 'مسلّم' : 'Submitted') : (isAR ? 'قيد التقدم' : 'In Progress')}</span></td>
                                                <td className="py-3 px-4 text-center font-black text-primary">{a.totalScore ?? '-'}/{maxM}</td>
                                                <td className="py-3 px-4 text-center text-xs font-bold text-text-secondary">{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '-'}</td>
                                                <td className="py-3 px-4"><button className={btnGray} onClick={() => openGrading(a)}><Eye size={14} />{isAR ? 'تصحيح' : 'Grade'}</button></td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })()}
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
                                                return (
                                                    <div key={o.id} className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between gap-3 transition-all ${selected && o.isCorrect
                                                        ? 'bg-success/10 border-2 border-success text-text-primary'           // ✅ selected + correct
                                                        : selected && !o.isCorrect
                                                            ? 'bg-red-500/10 border-2 border-red-500 text-text-primary'        // ❌ selected + wrong
                                                            : o.isCorrect
                                                                ? 'bg-success/5 border border-dashed border-success/50 text-text-secondary'  // correct but NOT selected
                                                                : 'bg-card border border-border text-text-secondary'           // neither
                                                        }`}>
                                                        <span className="flex items-center gap-2">
                                                            {selected && o.isCorrect && <CheckCircle size={15} className="text-success shrink-0" />}
                                                            {selected && !o.isCorrect && <XCircle size={15} className="text-red-500 shrink-0" />}
                                                            {!selected && o.isCorrect && <CheckCircle size={15} className="text-success/40 shrink-0" />}
                                                            {o.optionText}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 shrink-0">
                                                            {selected && (
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${o.isCorrect ? 'bg-success text-white' : 'bg-red-500 text-white'}`}>
                                                                    {isAR ? 'إجابة الطالب' : 'Student'}
                                                                </span>
                                                            )}
                                                            {o.isCorrect && (
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-success/20 text-success border border-success/30">
                                                                    {isAR ? 'صحيح' : 'Correct'}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                );
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
                                    {q.type === 'matrix' && (
                                        <div className="ml-10 overflow-x-auto">
                                            <table className="text-sm border"><thead><tr><th className="border p-2"></th>{q.options?.map(o => <th key={o.id} className="border p-2 text-center">{o.optionText}</th>)}</tr></thead>
                                                <tbody>{q.matrixRows?.map((row, ri) => (<tr key={ri}><td className="border p-2 font-bold">{row}</td>{q.options?.map(o => {
                                                    const selectedArr = ans?.matrixSelections?.[ri.toString()] || [];
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
                    {/* ─── Auto-grade summary + Bonus Marks ─── */}
                    <div className="mt-6 space-y-4">
                        {/* Back + auto-total row */}
                        <div className="flex items-center gap-3">
                            <button className={btnGray} onClick={() => { setTab('attempts'); setSelectedAttempt(null); }}>{isAR ? '← رجوع' : '← Back'}</button>
                            <span className="font-bold text-lg">
                                {isAR ? 'الدرجة التلقائية:' : 'Auto-grade Total:'}
                                {' '}{gradingQ.reduce((s, q) => s + getEffectiveMarks(answers.find(a => a.questionId === q.id), q), 0)}/{gradingQ.reduce((s, q) => s + q.marks, 0)}
                            </span>
                        </div>

                        {/* ─── Bonus Marks panel ─── */}
                        <div className="p-5 rounded-2xl border-2 border-primary/30 bg-primary/5">
                            <h3 className="text-sm font-black text-text-primary mb-1">
                                {isAR ? 'نقاط مكافأة (اختياري)' : 'Bonus Marks (Optional)'}
                            </h3>
                            <p className="text-xs text-text-secondary mb-3">
                                {isAR
                                    ? 'أضف نقاطاً إضافية فوق الدرجة التلقائية (مثلاً للمشاركة أو المشاريع). الدرجة النهائية = الدرجة التلقائية + المكافأة.'
                                    : 'Add extra marks on top of the auto-graded score (e.g. for participation or projects). Final score = auto-grade + bonus.'}
                            </p>
                            {autoComputedScore !== null && (
                                <p className="text-xs font-black text-success mb-3">
                                    {isAR ? 'آخر حفظ:' : 'Last saved:'} {autoComputedScore} + {bonusMarks} = {autoComputedScore + bonusMarks}
                                </p>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-text-secondary">+</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={999}
                                        value={bonusMarks}
                                        onChange={e => setBonusMarks(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-24 px-3 py-2 border-2 border-primary/30 rounded-xl text-lg font-black text-center bg-surface text-text-primary focus:outline-none focus:border-primary transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <button
                                    onClick={saveManualScore}
                                    disabled={savingManual}
                                    className="px-5 py-2 bg-primary text-white font-black rounded-xl text-sm flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {savingManual ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {isAR ? 'حفظ الدرجة النهائية' : 'Save Final Score'}
                                </button>
                            </div>
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
                                                    <td className="py-1.5 px-2 text-center font-bold">{ex.score ?? 0}/{ex.exam.totalMarks ?? 50}</td></tr>
                                            ))}</tbody>
                                        </table>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ====== MODALS ====== */}
            {/* Confirm Action Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal(null)}>
                    <div className="bg-card rounded-2xl shadow-xl border border-border p-8 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
                        <AlertTriangle size={32} className="text-amber-500 mx-auto mb-4" />
                        <p className="text-sm font-bold text-text-primary mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-center">
                            <button className={btnGray} onClick={() => setConfirmModal(null)}>{isAR ? 'إلغاء' : 'Cancel'}</button>
                            <button className={btnDanger} onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>{isAR ? 'تأكيد' : 'Confirm'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Exam Modal (Read-Only) */}
            {previewExam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => { setPreviewExam(null); setPreviewQuestions([]); }}>
                    <div className="bg-surface rounded-3xl shadow-xl max-w-2xl w-full my-auto text-text-primary p-6 md:p-8" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                            <h2 className="text-xl font-black text-primary flex items-center gap-2"><Eye size={24} /> {isAR ? 'معاينة الامتحان' : 'Exam Preview'} - {previewExam.title}</h2>
                            <button onClick={() => { setPreviewExam(null); setPreviewQuestions([]); }} className="text-text-secondary hover:text-red-500 transition-colors"><XCircle size={24} /></button>
                        </div>
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                            {previewQuestions.length === 0 ? (
                                <p className="text-center text-text-secondary py-8">{isAR ? 'لا توجد أسئلة' : 'No questions yet'}</p>
                            ) : previewQuestions.map((q, idx) => (
                                <div key={q.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                    <div className="flex gap-4 mb-4">
                                        <span className="bg-primary/10 text-primary font-black w-8 h-8 rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>
                                        <div>
                                            <p className="font-bold text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{q.questionText}</p>
                                            <span className="text-[10px] uppercase font-black text-text-secondary tracking-widest mt-1 block">{q.marks} {t.marks}</span>
                                        </div>
                                    </div>
                                    <div className="ml-12 opacity-80 pointer-events-none">
                                        {(q.type === 'mcq' || q.type === 'true_false') && (
                                            <div className="space-y-3">
                                                {q.options?.map(opt => (
                                                    <div key={opt.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface">
                                                        <div className={`w-5 h-5 rounded-full border-2 border-border`} />
                                                        <span className="text-sm font-bold text-text-secondary">{opt.optionText}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === 'matrix' && (
                                            <div className="overflow-x-auto ring-1 ring-border rounded-xl">
                                                <table className="w-full text-sm text-center">
                                                    <thead className="bg-surface border-b border-border"><tr><th className="p-3"></th>{q.options?.map(opt => <th key={opt.id} className="p-3 font-bold text-text-secondary">{opt.optionText}</th>)}</tr></thead>
                                                    <tbody className="divide-y divide-border">{q.matrixRows?.map((row, rIdx) => (<tr key={rIdx}><td className="p-3 font-bold text-text-primary text-left bg-surface border-r border-border">{row}</td>{q.options?.map(opt => <td key={opt.id} className="p-3"><div className="w-4 h-4 rounded border-2 border-border mx-auto" /></td>)}</tr>))}</tbody>
                                                </table>
                                            </div>
                                        )}
                                        {q.type === 'essay' && (
                                            <textarea className="w-full h-24 rounded-xl border border-border bg-surface p-4 text-sm" placeholder={isAR ? 'مساحة الإجابة...' : 'Answer area...'} disabled />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminExams;
